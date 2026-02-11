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
                <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Scanning Positions...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-200">
            {/* Header / Search - Luxury Style */}
            {/* Header / Search - Corporate Style */}
            <div className="bg-white p-10 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg mb-4">
                            <Globe size={12} className="text-indigo-600" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Opportunities</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
                            Find your <span className="text-indigo-600">milestone</span>.
                        </h1>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed">
                            Join a team of visionaries and builders. Shape the future with us.
                        </p>
                    </div>
                    <div className="relative w-full lg:w-[450px]">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by title, category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-gray-100 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white px-14 py-4 rounded-[1.5rem] text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            {filteredJobs.length === 0 ? (
                <div className="bg-white p-20 rounded-[2.5rem] border border-gray-100 text-center shadow-sm">
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
                            className="group bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 relative flex flex-col h-full overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="h-14 w-14 rounded-[1.2rem] bg-icon-bg flex items-center justify-center text-premium-blue shadow-sm group-hover:scale-105 transition-all duration-300 relative">
                                    <Building2 size={22} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[10px] uppercase tracking-wide">New</span>
                                    <button className="h-9 w-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-warning-red hover:bg-red-50 transition-all">
                                        <Star size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                {job?.jobTitle}
                            </h3>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-6">
                                {job?.department || 'General'}
                            </p>

                            <div className="grid grid-cols-1 gap-3 mb-8">
                                <div className="flex items-center gap-3">
                                    <MapPin size={16} className="text-slate-400" />
                                    <span className="text-slate-600 font-medium text-sm">Remote / Global</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Briefcase size={16} className="text-slate-400" />
                                    <span className="text-slate-600 font-medium text-sm">Full Time</span>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <button
                                    onClick={() => navigate(`/apply-job/${job._id}?tenantId=${tenantId || getTenantId()}`)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-[1.2rem] font-bold text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-indigo-100"
                                >
                                    <span>Apply Position</span>
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
