import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
    Briefcase, Calendar, CheckCircle2, Clock,
    XCircle, ChevronRight, AlertCircle, Search, ArrowLeft, Building2, User
} from 'lucide-react';

export default function CandidateApplications() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/candidate/dashboard');
            if (res.data && res.data.applications) {
                setApplications(res.data.applications);
            }
        } catch (err) {
            console.error("Failed to load applications:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase();
        if (['hired', 'selected', 'offered'].includes(s)) return 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10';
        if (['interview', 'shortlisted'].includes(s)) return 'bg-soft-yellow/10 text-amber-600 border-amber-100 ring-amber-500/10';
        if (s === 'rejected') return 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10';
        return 'bg-slate-50 text-indigo-600 border-indigo-100 ring-indigo-500/10';
    };

    const filteredApps = applications.filter(app =>
        app?.requirementId?.jobTitle?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        app?.requirementId?.department?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
        app?.status?.toLowerCase()?.includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Retrieving Submissions...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-200">
            {/* Header & Search - Luxury Style */}
            {/* Header & Search - Corporate Style */}
            <div className="bg-white p-10 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg mb-4">
                            <Clock size={12} className="text-premium-blue" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Application History</span>
                        </div>
                        <h1 className="text-3xl font-bold text-deep-navy tracking-tight mb-3">
                            Track your <span className="text-premium-blue">journey</span>.
                        </h1>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-md">
                            Monitor your progress across all active and past submissions.
                        </p>
                    </div>
                    <div className="relative w-full lg:w-[400px]">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Filter by role or status..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-soft-bg border border-gray-100 focus:ring-2 focus:ring-premium-blue/20 focus:bg-white px-14 py-4 rounded-[1.5rem] text-sm font-bold text-deep-navy outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>
            </div>

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> d95d0294dd92ce8de49ae09613362e7c0eb72566
            {/* Application Cards */}
            {filteredApps.length === 0 ? (
                <div className="bg-white p-20 rounded-[2.5rem] border border-gray-100 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Briefcase size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">No applications found</h3>
                    <p className="text-slate-400 font-medium max-w-xs mx-auto mb-8">You haven't applied to any roles yet or your search didn't match any applications.</p>
                    <button
                        onClick={() => navigate('/candidate/open-positions')}
                        className="bg-slate-50 text-indigo-600 px-10 py-3.5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-slate-100 transition-all"
                    >
                        Explore Jobs
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {filteredApps.map((app) => (
                        <div
                            key={app._id}
                            onClick={() => navigate(`/candidate/application/${app._id}`)}
                            className="group bg-white p-6 rounded-[1.5rem] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-[1.2rem] bg-icon-bg flex items-center justify-center text-premium-blue group-hover:bg-premium-blue group-hover:text-white transition-all duration-300 shadow-sm">
                                    <Briefcase size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-deep-navy tracking-tight mb-2 group-hover:text-premium-blue transition-colors">
                                        {app?.requirementId?.jobTitle || 'Position Details'}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg text-slate-500 font-bold text-[10px] uppercase tracking-wide">
                                            <User size={12} className="text-slate-400" />
                                            {app?.name || 'Applicant'}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-3 py-1.5 rounded-lg text-slate-400 font-bold text-[10px] uppercase tracking-wide">
                                            <Building2 size={12} className="text-slate-300" />
                                            {app?.requirementId?.department || 'General'}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-3 py-1.5 rounded-lg text-slate-400 font-bold text-[10px] uppercase tracking-wide">
                                            <Calendar size={12} className="text-slate-300" />
                                            {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-12">
                                <div className={`px-8 py-3 rounded-2xl border-2 text-[11px] font-black uppercase tracking-[0.2em] shadow-sm ${getStatusStyle(app.status)}`}>
                                    {app.status || 'Applied'}
                                </div>
                                <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:text-white group-hover:rotate-90 transition-all duration-500">
                                    <ChevronRight size={28} />
                                </div>
                            </div>
                        </div>
                    ))}
<<<<<<< HEAD
=======
            {/* Applications Grid - Card Layout */}
            {applications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {applications.map(app => (
                        <div
                            key={app?._id}
                            className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden group"
                            onClick={() => navigate(`/candidate/application/${app?._id}`)}
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <Briefcase className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors truncate">
                                            {app?.requirementId?.jobTitle || 'Role Name'}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
                                            {app?.requirementId?.department || 'Department'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="font-bold">
                                            Applied: {app?.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </span>
                                    </div>

                                    <div className={`w-fit px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border flex items-center gap-2 ${getStatusStyle(app?.status)} shadow-sm`}>
                                        <div className="w-2 h-2 rounded-full bg-current"></div>
                                        {app?.status || 'Applied'}
                                    </div>
                                </div>

                                {app?.requirementId?.location && (
                                    <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-[10px] text-slate-600 truncate">
                                            📍 {app.requirementId.location}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3">
                                <div className="flex items-center justify-between text-white">
                                    <span className="text-xs font-black uppercase tracking-wider">
                                        Track Journey
                                    </span>
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-gray-50 overflow-hidden">
                    <div className="px-10 py-32 text-center">
                        <div className="flex flex-col items-center">
                            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-10 h-10 text-gray-200" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">No applications found</h3>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2 mb-8">You haven't applied to any roles yet.</p>
                            <button
                                onClick={() => navigate('/candidate/open-positions')}
                                className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
                            >
                                Explore Career Opportunities
                            </button>
                        </div>
                    </div>
>>>>>>> main
=======
>>>>>>> d95d0294dd92ce8de49ae09613362e7c0eb72566
                </div>
            )}
        </div>
    );
}
