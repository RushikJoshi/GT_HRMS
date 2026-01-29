import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ArrowLeft, Briefcase, Lock, Mail, User, Phone } from 'lucide-react';

export default function CandidateSignup() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { registerCandidate, loginCandidate } = useAuth();

    // Get tenantId from URL query param
    const rawTenantId = searchParams.get('tenantId');
    const tenantId = (rawTenantId && rawTenantId !== 'null' && rawTenantId !== 'undefined') ? rawTenantId : null;
    const redirect = searchParams.get('redirect') || '/jobs?tenantId=' + (tenantId || '');

    const [company, setCompany] = useState({ name: 'Company', code: '' });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    // Fetch Company details on mount
    useEffect(() => {
        async function fetchCompany() {
            setPageLoading(true);
            try {
                if (tenantId) {
                    const res = await api.get(`/public/tenant/${tenantId}`);
                    setCompany(res.data);
                } else {
                    setError('Invalid Access: No Company Link detected. Please use a valid job link.');
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
        // Register API call
        const res = await registerCandidate({ ...formData, tenantId });

        if (res.success) {
            // Auto Login after signup
            const loginRes = await loginCandidate(tenantId, formData.email, formData.password);
            setLoading(false);

            if (loginRes.success) {
                const navTo = redirect.startsWith('/') ? redirect : '/jobs/' + redirect;
                navigate(navTo);
            } else {
                // Fallback to login page if auto-login fails
                navigate(`/candidate/login?tenantId=${tenantId}&redirect=${encodeURIComponent(redirect)}`);
            }
        } else {
            setLoading(false);
            setError(res.message);
        }
    }

    if (pageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans relative overflow-hidden flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">

            {/* Background Effects (Subtle for Light Mode) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-60"></div>
            </div>

            <div className="relative z-10 w-full max-w-md">

                {/* Header Section */}
                <div className="text-center mb-8">
                    {/* Back Button - Top Left */}
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute top-6 left-6 z-20 p-3 bg-white hover:bg-gray-100 text-gray-700 rounded-full shadow-md border border-gray-200 transition-all group active:scale-95"
                        title="Go Back"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>

                    <div className="inline-flex p-4 bg-white rounded-2xl border border-gray-100 mb-6 shadow-xl ring-1 ring-gray-100">
                        <Briefcase className="w-10 h-10 text-blue-600" />
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                        {company.name}
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Create Candidate Account</p>
                </div>

                {/* Signup Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Sign Up</h2>
                            <p className="text-sm text-gray-500 mt-1">Start your journey with us today</p>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
                                    <span className="text-red-500 mr-2">⚠️</span>
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Full Name */}
                            <div>
                                <label htmlFor="name" className="sr-only">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white placeholder-gray-400 text-gray-900"
                                        placeholder="Full Name"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="sr-only">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white placeholder-gray-400 text-gray-900"
                                        placeholder="Email Address"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="sr-only">Phone Number</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white placeholder-gray-400 text-gray-900"
                                        placeholder="Phone Number"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white placeholder-gray-400 text-gray-900"
                                        placeholder="Create Password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !tenantId}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 mt-2"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating Account...
                                    </span>
                                ) : (
                                    "Create Account"
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link
                                to={`/candidate/login?tenantId=${tenantId}&redirect=${encodeURIComponent(redirect)}`}
                                className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                Login here
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} {company.name}. Powered by Gitakshmi HRMS.
                    </p>
                </div>
            </div>
        </div>
    );
}
