import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { getTenantId } from '../../utils/auth';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import {
    Briefcase, MapPin, Clock, Search, Filter,
    ArrowRight, Star, AlertCircle, Building2, Globe
} from 'lucide-react';

export default function CandidateOpenPositions() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const { candidate } = useJobPortalAuth();
    const [tenantId, setTenantIdState] = useState(getTenantId() || candidate?.tenantId);

    useEffect(() => {
        const fetchJobs = async () => {
            const tid = tenantId || getTenantId() || candidate?.tenantId;
            console.log('🔍 [CANDIDATE_OPEN_POSITIONS] Fetching jobs for tenant:', tid);

            if (!tid) {
                console.warn('⚠️ [CANDIDATE_OPEN_POSITIONS] No tenantId found');
                setLoading(false);
                return;
            }

            try {
                // Use the query param version which is more robust
                const res = await api.get(`/public/jobs?tenantId=${tid}`);
                console.log(`✅ [CANDIDATE_OPEN_POSITIONS] Found ${res.data?.length || 0} jobs`);
                setJobs(res.data || []);
            } catch (err) {
                console.error("Failed to fetch jobs:", err);
                setError("Failed to load positions. Please try refreshing.");
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, [tenantId, candidate]);

    const filteredJobs = jobs.filter(job =>
        job?.jobTitle?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        job?.department?.toLowerCase()?.includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Scanning Positions...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-200">
            {/* Header / Search - Luxury Style */}
            <div className="relative overflow-hidden bg-white p-12 lg:p-20 rounded-[3rem] border border-slate-100 shadow-[0px_40px_80px_-20px_rgba(0,0,0,0.04)]">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50/50 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-violet-50/50 rounded-full blur-[80px] -ml-24 -mb-24"></div>

                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16">
                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-xl mb-6">
                                <Globe size={14} className="text-indigo-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Active Opportunities</span>
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[0.9] mb-6">
                                Find your <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">milestone</span>.
                            </h1>
                            <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                Join a team of visionaries and builders. We're looking for passionate minds to shape the future together.
                            </p>
                        </div>
                        <div className="relative w-full lg:w-[500px] group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                            <div className="relative">
                                <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search by title, category..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-slate-100 focus:ring-4 focus:ring-indigo-500/10 px-20 py-7 rounded-[2.5rem] text-lg font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400 shadow-xl shadow-slate-200/50"
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Grid */}
            {filteredJobs.length === 0 ? (
                <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center shadow-sm">
                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Search size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No matching positions</h3>
                    <p className="text-slate-400 font-medium max-w-xs mx-auto">Try adjusting your filters or search terms to find what you're looking for.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {filteredJobs.map((job) => (
                        <div
                            key={job._id}
                            className="group bg-white p-10 rounded-[3rem] border border-slate-50 shadow-[0px_30px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0px_50px_100px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-3 transition-all duration-500 relative flex flex-col h-full overflow-hidden"
                        >
                            {/* Accent line on hover */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-violet-500 transform -translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>

                            <div className="flex justify-between items-start mb-10">
                                <div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 overflow-hidden relative">
                                    <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                                    <Building2 size={32} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-5 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-[10px] uppercase tracking-widest ring-4 ring-emerald-500/5">New</span>
                                    <button className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-all">
                                        <Star size={20} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-3 leading-tight group-hover:text-indigo-600 transition-colors">
                                {job?.jobTitle}
                            </h3>
                            <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.25em] mb-8">
                                {job?.department || 'General'}
                            </p>

                            <div className="grid grid-cols-1 gap-4 mb-10">
                                <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-400 shadow-sm">
                                        <MapPin size={18} />
                                    </div>
                                    <span className="text-slate-600 font-bold text-sm">Remote / Global</span>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-400 shadow-sm">
                                        <Briefcase size={18} />
                                    </div>
                                    <span className="text-slate-600 font-bold text-sm">Full Time</span>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <button
                                    onClick={() => navigate(`/apply-job/${job._id}?tenantId=${tenantId || getTenantId()}`)}
                                    className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl shadow-indigo-100"
                                >
                                    <span className="relative z-10">Apply Position</span>
                                    <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
