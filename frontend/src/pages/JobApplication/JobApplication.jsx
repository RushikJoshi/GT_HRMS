import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import { getTenantId, getCompany } from '../../utils/auth';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
import {
  ArrowLeft, Send, CheckCircle2, User,
  Mail, Phone, MapPin, Calendar, FileText,
  ShieldCheck, UploadCloud, Building2, Briefcase, Zap,
  ChevronDown, Loader2
} from 'lucide-react';

export default function JobApplication() {
  const [searchParams] = useSearchParams();
  const { requirementId: paramReqId } = useParams();
  const navigate = useNavigate();
  const { candidate } = useJobPortalAuth();

  const requirementId = paramReqId || searchParams.get('requirementId');
  const tenantId = searchParams.get('tenantId') || getTenantId();
  const company = getCompany();

  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    email: '',
    mobile: '',
    dob: '',
    workLocation: '',
    address: '',
    resume: null,
    consent: true
  });

  const [requirement, setRequirement] = useState(null);
  const [customization, setCustomization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true); // New state to prevent flash
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (requirementId && tenantId) {
      Promise.all([
        fetchRequirementDetails(),
        fetchCustomization()
      ]).finally(() => setFetching(false));
    } else {
      setFetching(false);
    }
  }, [requirementId, tenantId]);

  useEffect(() => {
    // If we have customization, initialize formData with its fields
    if (customization?.applyPage?.sections) {
      const initialData = { consent: true, resume: null, name: '', email: '' };

      customization.applyPage.sections.forEach(section => {
        section.fields?.forEach(field => {
          initialData[field.id] = '';
        });
      });

      // Merge with candidate data if available (this takes priority for name/email/mobile)
      if (candidate) {
        initialData.name = candidate.name || '';
        initialData.email = candidate.email || '';
        initialData.mobile = candidate.mobile || '';
      }

      setFormData(initialData);
    } else if (candidate && !formData.name) {
      // Fallback if no customization yet
      setFormData(prev => ({
        ...prev,
        name: candidate.name || '',
        email: candidate.email || '',
        mobile: candidate.mobile || '',
      }));
    }
  }, [customization, candidate]);

  const fetchRequirementDetails = async () => {
    try {
      const res = await api.get(`/public/job/${requirementId}?tenantId=${tenantId}`);
      setRequirement(res.data);
      // Safety: If tenantId was missing locally but returned from server, update it
      if (!tenantId && res.data.tenant) {
        localStorage.setItem('tenantId', res.data.tenant);
      }
    } catch (err) { console.error("Requirement Load Error:", err); }
  };

  const fetchCustomization = async () => {
    try {
      const res = await api.get(`/public/career-customization/${tenantId}`);
      if (res.data) setCustomization(res.data);
    } catch (err) { console.error("Customization Load Error:", err); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [parsing, setParsing] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || file.type.includes('word')) && file.size < 5 * 1024 * 1024) {
      setFormData(prev => ({ ...prev, resume: file }));
      setError('');

      // Auto-Parse Logic
      setParsing(true);
      try {
        const parseData = new FormData();
        parseData.append('resume', file);
        if (requirementId) parseData.append('requirementId', requirementId);

        const res = await api.post('/public/resume/parse', parseData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.success && res.data.data) {
          const ai = res.data.data;
          setFormData(prev => ({
            ...prev,
            name: prev.name || ai.fullName || '',
            email: prev.email || ai.email || '',
            mobile: prev.mobile || ai.phone || '',
            // Auto-fill experience if field existed or add to notes?
            // Providing what we have
          }));
        }
      } catch (err) {
        console.error("Parse failed", err);
      } finally {
        setParsing(false);
      }

    } else {
      setError('Please upload a PDF or Word file under 5MB.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Sync dynamic fields to root properties if missing
    // Many dynamic forms use IDs like 'full_name' or 'field_timestamp'
    const curData = { ...formData };
    if (!curData.name) {
      const nameKey = Object.keys(curData).find(k => k.toLowerCase().includes('name') && curData[k]);
      if (nameKey) curData.name = curData[nameKey];
    }
    if (!curData.email) {
      const emailKey = Object.keys(curData).find(k => k.toLowerCase().includes('email') && curData[k]);
      if (emailKey) curData.email = curData[emailKey];
    }
    if (!curData.mobile) {
      const mobileKey = Object.keys(curData).find(k => (k.toLowerCase().includes('mobile') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('contact')) && curData[k]);
      if (mobileKey) curData.mobile = curData[mobileKey];
    }

    if (!curData.dob) {
      const dobKey = Object.keys(curData).find(k => (k.toLowerCase().includes('dob') || k.toLowerCase().includes('birth')) && curData[k]);
      if (dobKey) {
        const rawDate = curData[dobKey];
        if (rawDate && rawDate.includes('/')) {
          // Convert DD/MM/YYYY to YYYY-MM-DD for backend
          const [d, m, y] = rawDate.split('/');
          curData.dob = `${y}-${m}-${d}`;
        } else {
          curData.dob = rawDate;
        }
      }
    }

    // 2. Validation
    if (!curData.name || !curData.email) {
      setError('Name and Email are required properties.');
      return;
    }
    if (!curData.resume && !candidate) {
      setError('Please upload your resume to proceed.');
      return;
    }

    // 3. Removed Reference Validation as per user request

    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      submitData.append('requirementId', requirementId);
      submitData.append('tenantId', tenantId || requirement?.tenant);

      Object.keys(curData).forEach(key => {
        if (key === 'resume') {
          if (curData.resume) submitData.append('resume', curData.resume);
        } else if (curData[key] !== null && curData[key] !== undefined) {
          // If it's a date string in DD/MM/YYYY, convert to ISO for safety
          let val = curData[key];
          if (typeof val === 'string' && val.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const [d, m, y] = val.split('/');
            val = `${y}-${m}-${d}`;
          }
          submitData.append(key, val);
        }
      });

      // Add references (empty or fresher flags)
      submitData.append('references', JSON.stringify([]));
      submitData.append('isFresher', true);
      submitData.append('noReferenceReason', 'References disabled');

      await api.post('/public/apply-job', submitData, {
        headers: { 'Content-Type': 'multipart/form-data', 'X-Tenant-ID': tenantId || requirement?.tenant }
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Submit Error:", err);
      const backendErr = err.response?.data;
      const msg = (backendErr?.error && backendErr?.details)
        ? `${backendErr.error}: ${backendErr.details}`
        : (backendErr?.error || backendErr?.details || 'Failed to submit application. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate grid span for dynamic fields
  const getGridSpan = (width) => {
    switch (width) {
      case 'full': return 'col-span-12';
      case 'half': return 'col-span-12 md:col-span-6';
      case 'third': return 'col-span-12 md:col-span-4';
      default: return 'col-span-12';
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Application Form...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 selection:bg-indigo-100">
        <div className="max-w-xl w-full bg-white p-12 lg:p-16 rounded-[3rem] shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-50 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-lg shadow-emerald-100 ring-8 ring-emerald-50/50">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-4xl font-bold text-slate-800 mb-6 tracking-tight">Application Received!</h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed mb-12">
            Thank you for applying to <span className="text-indigo-600 font-bold">{company?.name || 'our company'}</span>. Our recruitment team will review your profile and get in touch shortly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate(`/jobs/${company?.code || tenantId}`)}
              className="px-8 py-4.5 bg-slate-50 text-slate-600 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
            >
              Back to Careers
            </button>
            <button
              onClick={() => navigate('/candidate/dashboard')}
              className="px-8 py-4.5 bg-indigo-600 text-white rounded-full font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:translate-y-[-2px] transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderDynamicForm = () => {
    const applyPage = customization?.applyPage;
    if (!applyPage?.sections) return null;

    return (
      <div className="space-y-10">
        {applyPage.sections.map((section) => (
          <div key={section.id} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
              {section.title}
            </h3>

            <div className="grid grid-cols-12 gap-6">
              {section.fields?.map((field) => (
                <div key={field.id} className={getGridSpan(field.width)}>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">
                      {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.id}
                        value={formData[field.id] || ''}
                        onChange={handleInputChange}
                        required={field.required}
                        rows={4}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all resize-none"
                        placeholder={field.placeholder || `Enter ${field.label}`}
                      />
                    ) : field.type === 'select' ? (
                      <div className="relative group">
                        <select
                          name={field.id}
                          value={formData[field.id] || ''}
                          onChange={handleInputChange}
                          required={field.required}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all appearance-none text-gray-700 h-[48px]"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-600 transition-colors">
                          <ChevronDown size={18} />
                        </div>
                      </div>
                    ) : field.type === 'date' ? (
                      <div className="relative group">
                        <DatePicker
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all h-[48px]"
                          format="DD/MM/YYYY"
                          placeholder={field.placeholder || `Select ${field.label}`}
                          onChange={(date, dateString) => setFormData(prev => ({ ...prev, [field.id]: dateString }))}
                          value={formData[field.id] && dayjs(formData[field.id], 'DD/MM/YYYY').isValid() ? dayjs(formData[field.id], 'DD/MM/YYYY') : null}
                        />
                      </div>
                    ) : field.type === 'file' ? (
                      <div className="space-y-4">
                        <label className="group relative block w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer bg-gray-50/50">
                          <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx" />
                          <div className="bg-white w-12 h-12 rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:rotate-6 transition-transform border border-gray-100">
                            <UploadCloud size={20} className="text-blue-500" />
                          </div>
                          <span className="block text-sm font-bold text-gray-700 mb-1">
                            {formData.resume ? formData.resume.name : `Upload ${field.label}`}
                          </span>
                          <span className="block text-gray-400 font-medium text-[10px] uppercase tracking-wider">
                            {field.helpText || "PDF, DOCX up to 5MB"}
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="relative group">
                        <input
                          type={field.type}
                          name={field.id}
                          value={formData[field.id] || ''}
                          onChange={handleInputChange}
                          required={field.required}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400 text-gray-700 h-[48px]"
                          placeholder={field.placeholder || `Enter ${field.label}`}
                        />
                      </div>
                    )}
                    {field.helpText && field.type !== 'file' && (
                      <p className="text-[10px] font-bold text-gray-400 ml-1 mt-1">{field.helpText}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFallbackForm = () => (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Full Name</label>
          <input name="name" value={formData.name} onChange={handleInputChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400 h-[48px]" placeholder="John Doe" />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Father Name</label>
          <input name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400 h-[48px]" placeholder="Guardian Name" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Email Address</label>
          <input name="email" value={formData.email} onChange={handleInputChange} type="email" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400 h-[48px]" placeholder="name@example.com" />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Contact Number</label>
          <input name="mobile" value={formData.mobile} onChange={handleInputChange} type="tel" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400 h-[48px]" placeholder="+1..." />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Date of Birth</label>
          <DatePicker
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all h-[48px]"
            format="DD/MM/YYYY"
            placeholder="Select DOB"
            onChange={(date, dateString) => setFormData(prev => ({ ...prev, dob: dateString }))}
            value={formData.dob ? dayjs(formData.dob, 'DD/MM/YYYY') : null}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Current Location</label>
          <input name="address" value={formData.address} onChange={handleInputChange} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all placeholder:text-gray-400 h-[48px]" placeholder="City, Country" />
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Professional Resume (PDF/Word)</label>
        <label className="group relative block w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer bg-gray-50/50">
          <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx" />
          <div className="bg-white w-12 h-12 rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:rotate-6 transition-transform border border-gray-100">
            <UploadCloud size={20} className="text-blue-500" />
          </div>
          <span className="block text-sm font-bold text-gray-700 mb-1">
            {formData.resume ? formData.resume.name : 'Choose your file'}
          </span>
          <span className="block text-gray-400 font-medium text-[10px] uppercase tracking-wider">
            Max file size: 5MB
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 selection:bg-indigo-100 selection:text-indigo-600 font-sans">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 h-20">
        <div className="px-6 lg:px-10 h-full flex items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all hover:bg-indigo-50"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="h-8 w-px bg-slate-100 mx-2"></div>
            <span className="text-lg font-black text-slate-800 tracking-tight">Job Application</span>
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-20 max-w-[1500px] mx-auto px-4 lg:px-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Unified Card Container */}
        <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">

          {/* Top Banner Section (Inside Card) */}
          {customization?.applyPage && (
            <div
              className={`h-48 w-full relative overflow-hidden flex flex-col justify-end p-8 lg:p-12 transition-all duration-700`}
              style={customization.applyPage.banner?.bgType === 'image' ? {
                backgroundImage: `url(${customization.applyPage.banner.bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              {customization.applyPage.banner?.bgType !== 'image' && (
                <div className={`absolute inset-0 bg-gradient-to-r ${customization.applyPage.banner?.bgColor || 'from-blue-600 via-indigo-600 to-purple-600'}`}></div>
              )}
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative z-10 flex flex-col gap-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider text-white inline-block w-fit shadow-sm">
                  {requirement?.department || 'Engineering'}
                </span>

                <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-sm leading-[1.1]">
                  {customization.applyPage.banner?.title || requirement?.jobTitle || 'Join Our Team'}
                </h1>

                <p className="text-white/90 font-medium text-base lg:text-lg max-w-3xl line-clamp-2 drop-shadow-sm">
                  {customization.applyPage.banner?.subtitle || (requirement ? `${requirement.workMode} • ${requirement.jobType} • ${requirement.location}` : 'Join our growing team')}
                </p>
              </div>
            </div>
          )}

          {/* Form Content Section (Inside Card) */}
          <div className="p-8 lg:p-12 bg-gray-50/30">
            <form onSubmit={handleSubmit} className="space-y-10">
              {error && (
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl text-rose-600 text-sm font-bold animate-in fade-in flex items-center gap-4 shadow-sm">
                  <ShieldCheck size={24} className="shrink-0" /> {error}
                </div>
              )}

              {customization?.applyPage ? renderDynamicForm() : (
                <>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-1 h-8 bg-blue-500 rounded-full shadow-sm"></div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                      Submit Application
                    </h3>
                  </div>
                  {renderFallbackForm()}
                </>
              )}

              {/* Reference Section Removed */}

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-xl font-bold shadow-xl active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-70 text-sm uppercase tracking-widest group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Processing...
                    </>
                  ) : (
                    <>
                      Submit Application <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] font-bold text-gray-400 mt-8 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> Secure Job Application Submission
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
