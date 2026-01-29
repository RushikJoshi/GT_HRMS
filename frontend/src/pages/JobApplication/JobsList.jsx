import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useParams, useNavigate } from 'react-router-dom';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
    Search,
    Briefcase,
    Clock,
    ArrowRight,
    Star,
    Zap,
    Users,
    Globe,
    Calendar
} from 'lucide-react';

export default function JobsList() {
    const [searchParams] = useSearchParams();
    const { companyId } = useParams();
    const companyCode = companyId;
    const tenantIdQuery = searchParams.get('tenantId');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { user, isInitialized, logout } = useAuth();

    const [resolvedTenantId, setResolvedTenantId] = useState(tenantIdQuery || null);
    const [myApplications, setMyApplications] = useState(new Set());
    const [companyName, setCompanyName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('All Departments');
    const [filterExp, setFilterExp] = useState('All Experience');
    const [filterType, setFilterType] = useState('All Types');
    const [candidateName, setCandidateName] = useState(user?.name || '');

    useEffect(() => {
        if (user?.name) setCandidateName(user.name);
    }, [user]);

    useEffect(() => {
        async function init() {
            let tid = resolvedTenantId;
            if (!tid && companyCode) {
                try {
                    const res = await api.get(`/public/resolve-code/${companyCode}`);
                    tid = res.data.tenantId;
                    setResolvedTenantId(tid);
                    setCompanyName(res.data.companyName);
                } catch (e) {
                    console.error("Resolve error:", e);
                    setError(e.response?.data?.error || e.message || 'Invalid Company Link');
                    return;
                }
            }

            if (!tid) {
                setError('Missing Company Information');
                return;
            }

            setLoading(true);
            try {
                const jobsRes = await api.get(`/public/jobs?tenantId=${tid}`);
                setJobs(jobsRes.data || []);

                if (user && user.role === 'candidate') {
                    const dashRes = await api.get('/candidate/dashboard');
                    if (dashRes.data.applications) {
                        const appSet = new Set(dashRes.data.applications.map(app => app.requirementId?._id || app.requirementId));
                        setMyApplications(appSet);
                    }
                    if (dashRes.data.profile?.name) {
                        setCandidateName(dashRes.data.profile.name);
                    }
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load portal data.');
            } finally {
                setLoading(false);
            }
        }

        if (isInitialized) {
            init();
        }
    }, [companyCode, tenantIdQuery, isInitialized, user, navigate]);

    // Filtering logic
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All Departments' || job.department === filterDept;
        return matchesSearch && matchesDept;
    });

    const departments = ['All Departments', ...new Set(jobs.map(j => j.department))];

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFDFF] text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Navbar (Over Hero) */}
            <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-end items-center h-20">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <span className="text-white font-bold opacity-90">Hi, {candidateName || 'Candidate'}</span>
                                <div className="h-4 w-px bg-white/30 hidden sm:block"></div>
                                <Link to="/candidate/dashboard" className="text-white font-bold hover:underline underline-offset-4">Dashboard</Link>
                                <button onClick={logout} className="px-5 py-2.5 bg-white/20 hover:bg-white text-white hover:text-gray-900 rounded-xl text-sm font-bold transition">Sign Out</button>
                            </div>
                        ) : (
                            <Link
                                to={`/candidate/login?tenantId=${resolvedTenantId}`}
                                className="px-6 py-2.5 bg-white text-gray-900 rounded-full text-sm font-bold hover:bg-gray-100 transition shadow-lg shadow-black/10"
                            >
                                Candidate Login
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section - Matching Screenshot Gradient */}
            <section className="relative pt-32 pb-44 overflow-hidden bg-gradient-to-r from-[#4F46E5] via-[#9333EA] to-[#EC4899]">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-400/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto text-white">
                        <h1 className="text-5xl sm:text-7xl font-black mb-6 tracking-tight drop-shadow-sm">
                            {companyName || 'Test'} Careers
                        </h1>
                        <p className="text-xl text-white/90 font-medium mb-10 leading-relaxed max-w-2xl mx-auto">
                            Join our team and build your future with us. We are looking for passionate individuals to help us shape the future.
                        </p>
                        <button
                            onClick={() => document.getElementById('search-filters').scrollIntoView({ behavior: 'smooth' })}
                            className="px-8 py-3.5 bg-white text-gray-900 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95 text-lg"
                        >
                            View Open Positions
                        </button>
                    </div>
                </div>
            </section>

            {/* Search & Filters - Floating Over Hero */}
            <section id="search-filters" className="relative z-20 -mt-16 mb-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white p-4 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] border border-gray-100 flex flex-col md:flex-row items-stretch gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by job title or keyword..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-16 pr-8 py-5 bg-gray-50/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg font-medium outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <select
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                                className="pl-6 pr-10 py-5 bg-gray-50/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.66667%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_1.5rem_center] bg-no-repeat"
                            >
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select value={filterExp} onChange={(e) => setFilterExp(e.target.value)} className="pl-6 pr-10 py-5 bg-gray-50/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.66667%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_1.5rem_center] bg-no-repeat">
                                <option>All Experience</option>
                                <option>0-2 Years</option>
                                <option>3-5 Years</option>
                                <option>5+ Years</option>
                            </select>
                            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="pl-6 pr-10 py-5 bg-gray-50/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.66667%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_1.5rem_center] bg-no-repeat">
                                <option>All Types</option>
                                <option>Full Time</option>
                                <option>Remote</option>
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            {/* Jobs Board */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex lg:items-center justify-between mb-12 flex-col lg:flex-row gap-4">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Open Positions</h2>
                    <div className="bg-blue-50 text-blue-700 font-bold px-4 py-1.5 rounded-full text-sm self-start lg:self-center">
                        {loading ? '...' : filteredJobs.length} Jobs Found
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-[2rem] p-8 border border-gray-100 animate-pulse h-80"></div>
                        ))}
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-200">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <Search size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No jobs matched your search</h3>
                        <p className="text-gray-500 font-medium">Try broader keywords or clear your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredJobs.map((job) => {
                            const isApplied = myApplications.has(job._id);
                            return (
                                <div key={job._id} className="group bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all duration-500 flex flex-col h-full relative overflow-hidden">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-2xl font-black text-gray-900 leading-tight">
                                                {job.jobTitle}
                                            </h3>
                                            <span className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap">
                                                {job.vacancy} Openings
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold mb-6">
                                            <Calendar size={14} className="text-gray-400" />
                                            Posted: {formatDateDDMMYYYY(job.createdAt)}
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-6">
                                            <span className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold border border-purple-100 uppercase">
                                                {job.department}
                                            </span>
                                            <span className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-100 uppercase">
                                                0+ Yrs
                                            </span>
                                        </div>

                                        <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">
                                            We are looking for a talented {job.jobTitle} to join our growing team in {job.department}.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-auto">
                                        <Link
                                            to={`/apply-job/${job._id}`}
                                            className="px-4 py-3.5 bg-white border border-gray-200 text-gray-900 rounded-2xl text-sm font-black text-center hover:bg-gray-50 transition-colors active:scale-95"
                                        >
                                            View Details
                                        </Link>
                                        <Link
                                            to={isApplied ? "/candidate/dashboard" : `/apply-job/${job._id}`}
                                            className={`px-4 py-3.5 rounded-2xl text-sm font-black text-center transition-all active:scale-95 flex items-center justify-center gap-1 ${isApplied
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'
                                                }`}
                                        >
                                            {isApplied ? 'Applied' : 'Apply Now'}
                                            {!isApplied && <ArrowRight size={16} />}
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Why Work With Us Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
                <h2 className="text-5xl font-black text-gray-900 mb-20 tracking-tight">Why Work With Us?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Zap size={32} />
                        </div>
                        <h3 className="text-xl font-bold">Fast Growth</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">Opportunity to work on cutting-edge tech and grow rapidly.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Users size={32} />
                        </div>
                        <h3 className="text-xl font-bold">Great Culture</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">Work with a diverse and highly motivated team.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Globe size={32} />
                        </div>
                        <h3 className="text-xl font-bold">Global Reach</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">We operate globally, giving you immense exposure.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Star size={32} />
                        </div>
                        <h3 className="text-xl font-bold">Best Perks</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">Competitive salary, insurance, and performance bonuses.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 py-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em] mb-2">Powered by Gitakshmi HRMS</p>
                    <p className="text-gray-400 text-sm font-medium">
                        &copy; {new Date().getFullYear()} {companyName || 'Test'}. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}