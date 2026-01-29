import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import api from '../../utils/api';
import { getCompany, setCompany, getTenantId } from '../../utils/auth';
import { ArrowLeft, Briefcase, Lock, Mail, User, Phone } from 'lucide-react';

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FBFCFE] font-sans flex flex-col items-center justify-center py-12 px-4 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[120px] -z-10 translate-x-1/4 -translate-y-1/4"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-50 rounded-full blur-[120px] -z-10 -translate-x-1/4 translate-y-1/4"></div>

            <div className="w-full max-w-md relative">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute -top-16 left-0 p-2.5 bg-white border border-gray-100 rounded-full shadow-sm text-gray-400 hover:text-gray-900 hover:shadow-md transition-all active:scale-95 flex items-center justify-center"
                >
                    <ArrowLeft size={18} />
                </button>

                <div className="text-center mb-8">
                    {/* Icon Box */}
                    <div className="inline-flex p-4 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-50 mb-6 ring-4 ring-blue-50/30">
                        <Briefcase className="w-10 h-10 text-blue-600" />
                    </div>

                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">
                        {company.name || "Test"}
                    </h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Create Candidate Account</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100/50 p-10">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-gray-900">Sign Up</h2>
                        <p className="text-gray-500 font-medium mt-1">Start your journey with us today</p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-3">
                                <span className="w-5 h-5 flex-shrink-0 bg-red-100 rounded-full flex items-center justify-center text-[10px]">!</span>
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                                    placeholder="Full Name"
                                />
                            </div>

                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                                    placeholder="Email Address"
                                />
                            </div>

                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                                    placeholder="Phone Number"
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                                    placeholder="Create Password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4.5 bg-blue-600 text-white rounded-2xl text-base font-black shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.98] mt-6"
                        >
                            {loading ? "Creating Account..." : "Create Account"}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-gray-500 font-medium">
                            Already have an account?{' '}
                            <Link
                                to={`/candidate/login?tenantId=${tenantId}`}
                                className="text-blue-600 font-black hover:text-blue-700 transition"
                            >
                                Login here
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">
                        &copy; {new Date().getFullYear()} {company.name || "Test"}. Powered by Gitakshmi HRMS
                    </p>
                </div>
            </div>
        </div>
    );
}
