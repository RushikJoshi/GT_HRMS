import React, { useEffect, useState, useMemo } from 'react';
import api from '../../utils/api';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import {
    FileText, Clock, CheckCircle2, XCircle, Search,
    Filter, ArrowRight, Briefcase, RefreshCw,
    Layers, Layout, Activity, Star
} from 'lucide-react';

export default function MyApplications() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchMyApplications();
    }, []);

    async function fetchMyApplications() {
        setIsRefreshing(true);
        try {
            const res = await api.get('/requirements/my-applications');
            if (Array.isArray(res.data)) {
                setApps(res.data);
            } else {
                setApps([]);
            }
        } catch (error) {
            console.error("Failed to load applications", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }

    const stats = useMemo(() => {
        const counts = {
            total: apps.length,
            applied: apps.filter(a => a.status === 'Applied').length,
            interview: apps.filter(a => a.status === 'Interview').length,
            selected: apps.filter(a => a.status === 'Selected').length
        };
        return counts;
    }, [apps]);

    const filteredApps = useMemo(() => {
        if (!search) return apps;
        const lowSearch = search.toLowerCase();
        return apps.filter(app =>
            app.requirementId?.jobTitle?.toLowerCase().includes(lowSearch) ||
            app.requirementId?.department?.toLowerCase().includes(lowSearch) ||
            app.status?.toLowerCase().includes(lowSearch)
        );
    }, [apps, search]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Selected':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
            case 'Rejected':
                return 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
            case 'Interview':
                return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]';
            default:
                return 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
        }
    };

    if (loading && !isRefreshing) return (
        <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Activity className="text-indigo-500 animate-pulse" size={24} />
                </div>
            </div>
            <p className="mt-8 text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Synchronizing Pipeline</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-10">
            {/* New Premium Header Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                    <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl overflow-hidden h-full">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 blur-[40px] rounded-full -ml-10 -mb-10"></div>

                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tighter uppercase italic leading-none">
                                            Application Pulse
                                        </h2>
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Quantum Tracking Protocol Active
                                        </p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md">
                                    Monitor your professional trajectory across all active recruitment streams in real-time.
                                </p>
                            </div>

                            <button
                                onClick={fetchMyApplications}
                                disabled={isRefreshing}
                                className="group flex items-center gap-3 px-6 py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-950/20 dark:shadow-white/10"
                            >
                                <RefreshCw size={16} className={`${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                {isRefreshing ? 'Syncing...' : 'Refresh Feed'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg group hover:border-indigo-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                <Layers size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</div>
                    </div>
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg group hover:border-emerald-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <Star size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.applied}</div>
                    </div>
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg group hover:border-amber-500/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                <Clock size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interview</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.interview}</div>
                    </div>
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg group hover:border-indigo-600/30 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-indigo-600/10 text-indigo-600">
                                <CheckCircle2 size={18} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected</span>
                        </div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.selected}</div>
                    </div>
                </div>
            </div>

            {/* List Header and Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4">
                <div className="flex items-center gap-3">
                    <Layout className="text-indigo-500" size={20} />
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Active Streams</h3>
                </div>

                <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search opportunities..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                        />
                    </div>
                    <div className="px-3 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200/50 dark:border-slate-700/50 whitespace-nowrap">
                        {filteredApps.length} Results
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="space-y-4">
                {filteredApps.length === 0 ? (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl p-20 text-center">
                        <div className="flex flex-col items-center gap-6 opacity-40">
                            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative">
                                <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 animate-[spin_10s_linear_infinite]"></div>
                                <FileText size={40} className="text-slate-400" />
                            </div>
                            <div>
                                <h4 className="font-black uppercase tracking-[0.3em] text-sm text-slate-500 dark:text-slate-300 mb-2">
                                    {search ? 'No matches found' : 'No Active Streams'}
                                </h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">
                                    {search ? 'Try adjusting your search parameters' : 'Ready to start your next career move? Explore available opportunities.'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredApps.map((app, index) => (
                            <div
                                key={app._id}
                                className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col md:flex-row items-center justify-between gap-6"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-center gap-6 flex-1 w-full shrink-0">
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-12 transition-all duration-500 shadow-inner">
                                            <Briefcase size={24} />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter italic group-hover:text-indigo-500 transition-colors">
                                            {app.requirementId?.jobTitle || 'Unknown Stream'}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-indigo-500/40"></div>
                                                {app.requirementId?.department}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Clock size={12} className="text-slate-300" />
                                                Applied {formatDateDDMMYYYY(app.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-8 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-slate-100 dark:border-slate-800 md:border-0">
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocol Status</span>
                                        <div className={`px-5 py-2 rounded-full text-[10px] uppercase font-black tracking-[0.15em] border backdrop-blur-md transition-all duration-500 ${getStatusStyle(app.status)}`}>
                                            {app.status}
                                        </div>
                                    </div>

                                    {(app.offerId || app.offerLetterPath) ? (
                                        <button
                                            onClick={() => {
                                                const path = app.offerId?.letterPath || app.offerLetterPath;
                                                if (path) {
                                                    const cleanPath = path.split('/').pop();
                                                    window.open(`http://localhost:5000/uploads/offers/${cleanPath}`, '_blank');
                                                }
                                            }}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition"
                                        >
                                            View Offer
                                        </button>
                                    ) : (
                                        <button className="group/btn relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-white transition-all overflow-hidden" disabled>
                                            <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                            <ArrowRight size={20} className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
