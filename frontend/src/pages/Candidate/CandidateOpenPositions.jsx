import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Briefcase, MapPin, Clock, Search, Filter, ArrowRight, AlertCircle } from 'lucide-react';
import { getTenantId } from '../../utils/auth';

export default function CandidateOpenPositions() {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const tid = getTenantId();
            if (!tid) {
                setError("Company context missing. Please reload the portal.");
                setLoading(false);
                return;
            }

            // Using the robust public jobs endpoint we recently updated
            const res = await api.get(`/public/jobs?tenantId=${tid}`);
            const fetchedJobs = Array.isArray(res.data) ? res.data : (res.data?.jobs || []);
            setJobs(fetchedJobs);
        } catch (err) {
            console.error("Fetch Jobs Error:", err);
            setError(err.response?.data?.error || "Failed to load open positions. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const filteredJobs = (Array.isArray(jobs) ? jobs : []).filter(j =>
        (j?.jobTitle?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (j?.department?.toLowerCase() || '').includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Finding Opportunities...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-gray-900 mb-2">Notice</h3>
                <p className="text-gray-500 font-medium mb-8">{error}</p>
                <button
                    onClick={fetchJobs}
                    className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-gray-200"
                >
                    Retry Search
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                        Open Positions<span className="text-blue-600">.</span>
                    </h1>
                    <p className="text-gray-500 font-medium mt-3 text-lg">Find and apply to your next career milestone.</p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full max-w-md group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search roles or departments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-gray-100 pl-16 pr-8 py-5 rounded-[2rem] shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold text-gray-700"
                    />
                </div>
            </div>

            {/* Jobs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredJobs.length > 0 ? filteredJobs.map(job => (
                    <div
                        key={job?._id || Math.random()}
                        className="bg-white rounded-[3rem] p-10 border border-gray-50 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-500 flex flex-col h-full group relative overflow-hidden h-full"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[4rem] flex items-center justify-center transition-all duration-500 group-hover:bg-blue-600">
                            <Briefcase className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                        </div>

                        <div className="pr-12">
                            <h3 className="text-xl font-black text-gray-900 line-clamp-2 leading-tight tracking-tight group-hover:text-blue-600 transition-colors">
                                {job?.jobTitle || 'Untitled Position'}
                            </h3>
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100/50">{job?.department || 'General'}</span>
                            </div>
                        </div>

                        <div className="mt-10 space-y-4 flex-grow">
                            <div className="flex items-center gap-4 text-gray-400 group-hover:text-gray-600 transition-colors">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm font-bold text-gray-600 tracking-tight">{job?.location || 'Remote'}</span>
                            </div>
                            <div className="flex items-center gap-4 text-gray-400 group-hover:text-gray-600 transition-colors">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-bold text-gray-600 tracking-tight">{job?.employmentType || 'Full-time'}</span>
                            </div>
                        </div>

                        <div className="mt-12 border-t border-gray-50 pt-10">
                            <button
                                onClick={() => navigate(`/apply-job/${job?._id}?tenantId=${getTenantId()}`)}
                                className="w-full bg-gray-900 text-white rounded-2xl py-4.5 font-black shadow-xl shadow-gray-200 hover:bg-blue-600 hover:shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                Apply Now <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
                        <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Search className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">No matches found</h3>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Try adjusting your search terms or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
