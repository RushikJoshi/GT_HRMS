import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import api from '../../utils/api';
import { getCompany, setCompany, getTenantId } from '../../utils/auth';
import { ArrowLeft, ArrowRight, Briefcase, Lock, Mail, User, Phone, ShieldCheck, Sparkles } from 'lucide-react';

export default function CandidateSignup() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { registerCandidate, loginCandidate } = useJobPortalAuth();

    const tenantId = searchParams.get('tenantId') || getTenantId();
    const [company, setLocalCompany] = useState({ name: 'Careers', code: '' });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        async function fetchCompany() {
            if (!tenantId) {
                setPageLoading(false);
                return;
            }

            setPageLoading(true);
            try {
                let companyInfo = getCompany();

                if (!companyInfo || (companyInfo.tenantId !== tenantId && companyInfo._id !== tenantId && companyInfo.code !== tenantId)) {
                    const res = await api.get(`/public/tenant/${tenantId}`);
                    if (res.data) {
                        companyInfo = { ...res.data, tenantId: res.data._id || tenantId };
                        setCompany(companyInfo);
                    }
                }

                if (companyInfo) {
                    setLocalCompany(companyInfo);
                }
            } catch (err) {
                console.warn("Failed to fetch company info", err);
            } finally {
                setPageLoading(false);
            }
        }
        fetchCompany();
    }, [tenantId]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!tenantId) {
            setError('Invalid Access: Company ID missing. Please return to the careers page.');
            return;
        }

        setLoading(true);
        const res = await registerCandidate({ ...formData, tenantId });

        if (res.success) {
            const loginRes = await loginCandidate(tenantId, formData.email, formData.password);
            setLoading(false);
            if (loginRes.success) {
                localStorage.setItem("candidate", JSON.stringify(loginRes.candidate));
                const redirectPath = searchParams.get('redirect');
                if (redirectPath) {
                    navigate(redirectPath, { replace: true });
                } else {
                    navigate(`/candidate/dashboard`, { replace: true });
                }
            } else {
                navigate(`/candidate/login?tenantId=${tenantId}${searchParams.get('redirect') ? `&redirect=${encodeURIComponent(searchParams.get('redirect'))}` : ''}`);
            }
        } else {
            setLoading(false);
            setError(res.message);
        }
    }

    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Initialising Portal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col items-center justify-center py-12 px-6 relative overflow-hidden selection:bg-indigo-100 selection:text-indigo-600">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-100/50 rounded-full blur-[80px] -z-10 translate-x-1/3 -translate-y-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[80px] -z-10 -translate-x-1/3 translate-y-1/3"></div>

            <div className="w-full max-w-[540px] z-10 animate-in fade-in duration-300">
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="mx-auto w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 mb-6">
                        <Briefcase className="text-white w-7 h-7" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Create Account</h1>
                    <p className="text-slate-500 font-medium text-sm">Join <span className="text-indigo-600 font-bold">{company.name}</span>'s talent network</p>
                </div>

                {/* Card */}
                <div className="bg-white p-10 lg:p-14 rounded-[3rem] shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-50">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        name="name"
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full pl-14 pr-8 py-5 bg-slate-50 border-none rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Contact Phone</label>
                                <div className="relative group">
                                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        name="phone"
                                        type="tel"
                                        placeholder="+1 234 567"
                                        className="w-full pl-14 pr-8 py-5 bg-slate-50 border-none rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        className="w-full pl-14 pr-8 py-5 bg-slate-50 border-none rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Account Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full pl-14 pr-8 py-5 bg-slate-50 border-none rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50/50 rounded-2xl">
                            <Sparkles className="text-indigo-500 w-4 h-4" />
                            <p className="text-[10px] font-bold text-indigo-600 leading-tight">By creating an account, you agree to our Terms of Service and Privacy Policy.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-[1.2rem] font-bold shadow-lg shadow-indigo-100 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 text-xs uppercase tracking-widest"
                        >
                            {loading ? 'Creating Account...' : (
                                <>
                                    Complete Selection <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-10 border-t border-slate-50 text-center">
                        <p className="text-slate-500 text-sm font-medium">
                            Already part of our network?{' '}
                            <Link
                                to={`/candidate/login?tenantId=${tenantId}`}
                                className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors ml-1 underline underline-offset-4 decoration-indigo-200"
                            >
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <Link to={`/jobs/${company.code || tenantId}`} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:text-indigo-50 transition-colors group">
                        <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-indigo-50 transition-colors">
                            <ArrowLeft size={16} />
                        </div>
                        Back to Portal
                    </Link>
                </div>
            </div>
        </div>
    );
}
