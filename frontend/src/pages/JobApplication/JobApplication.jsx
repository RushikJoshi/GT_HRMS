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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || file.type.includes('word')) && file.size < 5 * 1024 * 1024) {
      setFormData(prev => ({ ...prev, resume: file }));
      setError('');
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
      <div className="space-y-12">
        {applyPage.sections.map((section) => (
          <div key={section.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-8 bg-indigo-600 rounded-full shadow-sm"></div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{section.title}</h3>
            </div>

            <div className="grid grid-cols-12 gap-8 lg:gap-10">
              {section.fields?.map((field) => (
                <div key={field.id} className={getGridSpan(field.width)}>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 flex items-center gap-2">
                      {field.label} {field.required && <span className="text-rose-500 text-base leading-none">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        name={field.id}
                        value={formData[field.id] || ''}
                        onChange={handleInputChange}
                        required={field.required}
                        rows={4}
                        className="w-full px-6 py-4.5 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all font-medium text-slate-700 resize-none shadow-sm"
                        placeholder={field.placeholder || `Enter ${field.label}`}
                      />
                    ) : field.type === 'select' ? (
                      <div className="relative group">
                        <select
                          name={field.id}
                          value={formData[field.id] || ''}
                          onChange={handleInputChange}
                          required={field.required}
                          className="w-full px-6 py-4.5 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all font-medium text-slate-700 appearance-none shadow-sm h-[60px]"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <ChevronDown size={20} />
                        </div>
                      </div>
                    ) : field.type === 'date' ? (
                      <div className="relative group">
                        <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none" />
                        <DatePicker
                          className="w-full pl-14 pr-6 py-4.5 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all font-medium text-slate-700 h-[60px] shadow-sm"
                          format="DD/MM/YYYY"
                          placeholder={field.placeholder || `Select ${field.label}`}
                          onChange={(date, dateString) => setFormData(prev => ({ ...prev, [field.id]: dateString }))}
                          value={formData[field.id] && dayjs(formData[field.id], 'DD/MM/YYYY').isValid() ? dayjs(formData[field.id], 'DD/MM/YYYY') : null}
                        />
                      </div>
                    ) : field.type === 'file' ? (
                      <div className="space-y-4">
                        <label className="group relative block w-full border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 text-center hover:border-indigo-400 hover:bg-indigo-50/5 transition-all cursor-pointer bg-slate-50/30">
                          <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx" />
                          <div className="bg-white w-16 h-16 rounded-3xl shadow-md flex items-center justify-center mx-auto mb-4 group-hover:rotate-6 transition-transform border border-slate-100">
                            <UploadCloud size={28} className="text-indigo-500" />
                          </div>
                          <span className="block text-base font-extrabold text-slate-800 mb-1">
                            {formData.resume ? formData.resume.name : `Upload ${field.label}`}
                          </span>
                          <span className="block text-slate-400 font-bold text-[10px] uppercase tracking-widest">
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
                          className="w-full px-6 py-4.5 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all font-medium text-slate-700 shadow-sm h-[60px]"
                          placeholder={field.placeholder || `Enter ${field.label}`}
                        />
                      </div>
                    )}
                    {field.helpText && field.type !== 'file' && (
                      <p className="text-[10px] font-bold text-slate-400 ml-4">{field.helpText}</p>
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
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Full Name</label>
          <div className="relative group">
            <User size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
            <input name="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 h-[60px]" placeholder="John Doe" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Father Name</label>
          <div className="relative group">
            <User size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
            <input name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 h-[60px]" placeholder="Guardian Name" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Email Address</label>
          <div className="relative group">
            <Mail size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
            <input name="email" value={formData.email} onChange={handleInputChange} type="email" required className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 h-[60px]" placeholder="name@example.com" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Contact Number</label>
          <div className="relative group">
            <Phone size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
            <input name="mobile" value={formData.mobile} onChange={handleInputChange} type="tel" required className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 h-[60px]" placeholder="+1..." />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Date of Birth</label>
          <div className="relative group">
            <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none" />
            <DatePicker
              className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 h-[60px]"
              format="DD/MM/YYYY"
              placeholder="Select DOB"
              onChange={(date, dateString) => setFormData(prev => ({ ...prev, dob: dateString }))}
              value={formData.dob ? dayjs(formData.dob, 'DD/MM/YYYY') : null}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Current Location</label>
          <div className="relative group">
            <MapPin size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
            <input name="address" value={formData.address} onChange={handleInputChange} required className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 h-[60px]" placeholder="City, Country" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Professional Resume (PDF/Word)</label>
        <label className="group relative block w-full border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer">
          <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx" />
          <div className="bg-white w-20 h-20 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 group-hover:rotate-6 transition-transform">
            <UploadCloud size={32} className="text-indigo-500" />
          </div>
          <span className="block text-lg font-bold text-slate-800 mb-2">
            {formData.resume ? formData.resume.name : 'Choose your file'}
          </span>
          <span className="block text-slate-400 font-medium text-sm">
            Max file size: 5MB
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 selection:bg-indigo-100 selection:text-indigo-600 font-sans">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 h-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
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
          {/* Removed Job Title Badge as requested */}
        </div>
      </nav>

      <div className="pt-28 pb-20 max-w-[1600px] mx-auto px-4 lg:px-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Unified Card Container */}
        <div className="bg-white rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] overflow-hidden border border-white/50">

          {/* Top Banner Section (Inside Card) */}
          {customization?.applyPage && (
            <div
              className={`h-80 w-full relative overflow-hidden flex flex-col justify-center px-12 lg:px-16 transition-all duration-700`}
              style={customization.applyPage.banner?.bgType === 'image' ? {
                backgroundImage: `url(${customization.applyPage.banner.bgImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              {customization.applyPage.banner?.bgType !== 'image' && (
                <div className={`absolute inset-0 bg-gradient-to-r ${customization.applyPage.banner?.bgColor || customization.applyPage.theme?.bannerGradient || 'from-indigo-600 via-purple-600 to-pink-500'}`}></div>
              )}
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10 flex flex-col gap-3">
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-[0.2em] text-white inline-block w-fit shadow-sm">
                  {requirement?.department || 'Department'}
                </span>

                <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-sm leading-[1.1]">
                  {customization.applyPage.banner?.title || requirement?.jobTitle || 'Join Our Team'}
                </h1>

                {customization.applyPage.banner?.subtitle ? (
                  <p className="text-white/80 font-medium text-lg lg:text-xl max-w-3xl line-clamp-2 drop-shadow-sm">
                    {customization.applyPage.banner.subtitle}
                  </p>
                ) : (
                  <div className="flex items-center gap-8 text-white/90 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    <span className="flex items-center gap-2.5">
                      <MapPin size={16} className="text-white/60" /> {requirement?.workMode || 'Remote'}
                    </span>
                    <span className="flex items-center gap-2.5">
                      <Briefcase size={16} className="text-white/60" /> {requirement?.jobType || 'Full Time'}
                    </span>
                  </div>
                )}
              </div>

              {/* Decorative shapes inside banner */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>
          )}

          {/* Form Content Section (Inside Card) */}
          <div className="p-12 lg:p-20">
            <form onSubmit={handleSubmit} className="space-y-16">
              {error && (
                <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2.5rem] text-rose-600 text-sm font-bold animate-in fade-in flex items-center gap-4 shadow-sm">
                  <ShieldCheck size={28} className="shrink-0" /> {error}
                </div>
              )}

              {customization?.applyPage ? renderDynamicForm() : (
                <>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-12 flex items-center gap-4">
                    <div className="w-1.5 h-8 bg-indigo-600 rounded-full shadow-sm"></div>
                    Submit Application
                  </h3>
                  {renderFallbackForm()}
                </>
              )}

              <div className="pt-10">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-black text-white py-8 rounded-[2rem] font-black shadow-2xl shadow-indigo-100/20 active:scale-[0.99] transition-all flex items-center justify-center gap-4 disabled:opacity-70 text-sm uppercase tracking-[0.25em] group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      Submitting Profile...
                    </>
                  ) : (
                    <>
                      Submit My Application <Send size={24} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" />
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] font-black text-slate-300 mt-10 uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                  <ShieldCheck size={14} className="text-emerald-500" /> 100% Encrypted & Secure Submission
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
