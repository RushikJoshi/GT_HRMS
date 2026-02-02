import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { getTenantId, getCompany } from '../../utils/auth';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import {
  ArrowLeft, Send, CheckCircle2, User,
  Mail, Phone, MapPin, Calendar, FileText,
  ShieldCheck, UploadCloud
} from 'lucide-react';

export default function JobApplication() {
  const [searchParams] = useSearchParams();
  const { requirementId: paramReqId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (requirementId && tenantId) fetchRequirementDetails();
  }, [requirementId, tenantId]);

  useEffect(() => {
    if (user && !formData.name) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
      }));
    }
  }, [user]);

  const fetchRequirementDetails = async () => {
    try {
      const res = await api.get(`/public/job/${requirementId}?tenantId=${tenantId}`);
      setRequirement(res.data);
    } catch (err) { console.error(err); }
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
    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      submitData.append('requirementId', requirementId);
      submitData.append('tenantId', tenantId);

      Object.keys(formData).forEach(key => {
        if (key === 'resume') {
          if (formData.resume) submitData.append('resume', formData.resume);
        } else if (formData[key] !== null && formData[key] !== undefined) {
          submitData.append(key, formData[key]);
        }
      });

      await api.post('/public/apply-job', submitData, {
        headers: { 'Content-Type': 'multipart/form-data', 'X-Tenant-ID': tenantId }
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (company && company.code) {
      navigate(`/jobs/${company.code}`);
    } else if (tenantId) {
      navigate(`/jobs/${tenantId}`);
    } else {
      navigate('/');
    }
  };

  if (submitted) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl shadow-blue-500/10 border border-gray-100 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-8 ring-emerald-50">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Applied Successfully!</h2>
        <p className="text-gray-500 font-medium mt-4 leading-relaxed">
          Your application for <span className="text-blue-600 font-bold">{requirement?.jobTitle}</span> has been submitted. We'll be in touch soon.
        </p>
        <button
          onClick={() => navigate('/candidate/dashboard')}
          className="mt-10 w-full bg-gray-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-gray-200 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          Go to Dashboard <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20">

      {/* Navigation Header */}
      <nav className="h-20 bg-white/70 backdrop-blur-xl border-b border-gray-100 flex items-center px-6 lg:px-12 sticky top-0 z-50">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-black text-sm uppercase tracking-widest transition-all group"
        >
          <div className="bg-gray-50 p-2 rounded-xl group-hover:bg-blue-50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span>Return to Careers</span>
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 lg:py-16">

        {/* Main Content Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-gray-100 overflow-hidden relative animate-fade-in">

          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 px-10 py-12 text-white relative">
            <div className="absolute top-0 right-0 p-10 opacity-10">
              <Send className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100/60 mb-2">Job Application</p>
              <h1 className="text-4xl font-black tracking-tight leading-tight">
                Join our team as<br />
                <span className="text-blue-100">"{requirement?.jobTitle || 'Role'}"</span>
              </h1>
            </div>
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="p-10 lg:p-12">

            {error && (
              <div className="mb-8 p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-bold flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" /> {error}
              </div>
            )}

            <div className="space-y-12">

              {/* Personal Details */}
              <section className="space-y-8">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-xs">Personal Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { label: "Full Person Name", name: "name", icon: User, placeholder: "John Doe" },
                    { label: "Father's Full Name", name: "fatherName", icon: User, placeholder: "Sr. John Doe" },
                    { label: "Email Address", name: "email", icon: Mail, type: "email", placeholder: "john@email.com" },
                    { label: "Contact Phone", name: "mobile", icon: Phone, placeholder: "+91 98765 43210" },
                  ].map((field, idx) => (
                    <div key={idx} className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{field.label} *</label>
                      <div className="relative group">
                        <field.icon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          name={field.name}
                          type={field.type || "text"}
                          required
                          value={formData[field.name]}
                          onChange={handleInputChange}
                          placeholder={field.placeholder}
                          className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Date of Birth *</label>
                    <div className="relative group active-datepicker">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 z-10" />
                      <DatePicker
                        className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-700 shadow-none border hover:border-blue-500 focus:border-blue-500 transition-all custom-picker"
                        format="DD-MM-YYYY"
                        placeholder="Select Date"
                        value={formData.dob ? dayjs(formData.dob) : null}
                        onChange={(date) => setFormData(prev => ({ ...prev, dob: date ? date.format('YYYY-MM-DD') : '' }))}
                        allowClear={false}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Current Work Location</label>
                    <div className="relative group">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        name="workLocation"
                        value={formData.workLocation}
                        onChange={handleInputChange}
                        placeholder="City, India"
                        className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Permanent Address *</label>
                    <textarea
                      name="address"
                      required
                      rows={3}
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Type your complete home address..."
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </div>
              </section>

              {/* Resume Section */}
              <section className="space-y-8">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest text-xs">Resume Upload</h3>
                </div>

                <div className="relative group">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    id="resume-upload"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label
                    htmlFor="resume-upload"
                    className="flex flex-col items-center justify-center border-4 border-dashed border-gray-100 rounded-[2.5rem] p-12 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm ring-8 ring-blue-50">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <span className="text-lg font-black text-gray-900 tracking-tight">
                      {formData.resume ? formData.resume.name : 'Choose Resume / Drag PDF/Word'}
                    </span>
                    {parsing ? (
                      <div className="mt-4 flex items-center gap-2 text-blue-600 font-bold animate-pulse">
                        <UploadCloud className="w-5 h-5 animate-bounce" />
                        <span>Extracting resume data...</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 font-bold mt-2 uppercase tracking-widest">
                        {formData.resume ? 'Click to replace file' : 'Maximum size 5MB (PDF/Word only)'}
                      </p>
                    )}
                  </label>
                </div>
              </section>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-6 rounded-[1.8rem] font-black shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 text-lg flex items-center justify-center gap-3"
              >
                {loading ? 'Submitting Application...' : 'Send Application Now'} <Send className="w-5 h-5" />
              </button>

            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
