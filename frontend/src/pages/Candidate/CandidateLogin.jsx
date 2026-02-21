import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import api from '../../utils/api';
import { isCandidateLoggedIn, setCompany, getCompany, getTenantId } from '../../utils/auth';
import { ArrowLeft, ArrowRight, Briefcase, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function CandidateLogin() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { loginCandidate } = useJobPortalAuth();

    const rawTenantId = searchParams.get('tenantId');
    const validUrlId = (rawTenantId && rawTenantId !== 'null' && rawTenantId !== 'undefined') ? rawTenantId : null;
    const tenantId = validUrlId || getTenantId();
    const [company, setLocalCompany] = useState({ name: 'Careers', code: '' });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        if (isCandidateLoggedIn()) {
            navigate('/candidate/dashboard', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        let isMounted = true;
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
                    if (isMounted && res.data) {
                        companyInfo = { ...res.data, tenantId: res.data._id || tenantId };
                        setCompany(companyInfo);
                    }
                }

                if (isMounted && companyInfo) {
                    setLocalCompany(companyInfo);
                }
            } catch (err) {
                console.warn("Failed to fetch company info", err);
            } finally {
                if (isMounted) setPageLoading(false);
            }
        }
        fetchCompany();
        return () => { isMounted = false; };
    }, [tenantId]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!tenantId) {
            setError('Invalid Access: Company ID missing. Please return to the careers page and click Login from there.');
            return;
        }

        console.log(`[CandidateLogin] Attempting login for tenant: ${tenantId}, email: ${email}`);

        setLoading(true);
        const res = await loginCandidate(tenantId, email, password);
        setLoading(false);

        if (res.success) {
            localStorage.setItem("candidate", JSON.stringify(res.candidate));
            const redirectPath = searchParams.get('redirect');
            if (redirectPath) {
                navigate(redirectPath, { replace: true });
            } else {
                navigate(`/candidate/dashboard`, { replace: true });
            }
        } else {
            // Provide a more helpful error message
            const msg = res.message || 'Login failed';
            if (msg.toLowerCase().includes('invalid credentials') || msg.toLowerCase().includes('not found')) {
                setError('Email or password is incorrect. If you haven\'t registered yet, please create an account below.');
            } else if (msg.toLowerCase().includes('required fields') || msg.toLowerCase().includes('missing')) {
                setError('Company portal not found. Please access this page from the careers link.');
            } else {
                setError(msg);
            }
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

            <div className="w-full max-w-[480px] z-10 animate-in fade-in duration-300">
                {/* Header/Logo */}
                <div className="text-center mb-10">
                    <div className="mx-auto w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 mb-6">
                        <Briefcase className="text-white w-7 h-7" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-slate-500 font-medium text-sm">Continue your journey with <span className="text-indigo-600 font-bold">{company.name}</span></p>
                </div>

                {/* Login Card */}
                <div className="bg-white p-10 lg:p-12 rounded-[2.5rem] shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-50">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        className="w-full pl-16 pr-8 py-5 bg-slate-50 border-none rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full pl-16 pr-8 py-5 bg-slate-50 border-none rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500/20" />
                                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Keep me signed in</span>
                            </label>
                            <button type="button" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Forgot Password?</button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-[1.2rem] font-bold shadow-lg shadow-indigo-100 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 text-xs uppercase tracking-widest"
                        >
                            {loading ? 'Authenticating...' : (
                                <>
                                    Sign In <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-10 border-t border-slate-50 text-center">
                        <p className="text-slate-500 text-sm font-medium">
                            Don't have an account?{' '}
                            <Link
                                to={`/candidate/signup?tenantId=${tenantId}`}
                                className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors ml-1 underline underline-offset-4 decoration-indigo-200"
                            >
                                Start your application
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <Link to={`/jobs/${company.code || tenantId}`} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:text-indigo-500 transition-colors group">
                        <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-indigo-50 transition-colors">
                            <ArrowLeft size={16} />
                        </div>
                        Back to Career Page
                    </Link>
                </div>
            </div>
        </div>
    );
}
