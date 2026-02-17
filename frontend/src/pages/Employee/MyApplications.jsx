import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { FileText, Clock, CheckCircle2, XCircle, Search, Filter, ArrowRight, Briefcase } from 'lucide-react';

export default function MyApplications() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyApplications();
    }, []);

    async function fetchMyApplications() {
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
        }
    }

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Selected':
                return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'Rejected':
                return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
            case 'Interview':
                return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
            default:
                return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving Pipeline...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header section with glassmorphism */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-20 -mt-20"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                                <Search size={20} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">Application Pulse</h2>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-11">Monitor your career progression in real-time</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{apps.length} Active Streams</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-2xl overflow-hidden relative">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                        <thead className="bg-slate-50/50 dark:bg-slate-950/50">
                            <tr className="text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">
                                <th className="px-8 py-6 text-left">Opportunity</th>
                                <th className="px-8 py-6 text-left">Sector</th>
                                <th className="px-8 py-6 text-left">Submission Date</th>
                                <th className="px-8 py-6 text-center">Protocol Status</th>
                                <th className="px-8 py-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {apps.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <FileText size={32} className="text-slate-400" />
                                            </div>
                                            <p className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400">Application stream currently offline</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                apps.map(app => (
                                    <tr key={app._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                    <Briefcase size={18} />
                                                </div>
                                                <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter italic">{app.requirementId?.jobTitle || 'Unknown Stream'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{app.requirementId?.department}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                <Clock size={12} className="text-indigo-500" />
                                                <span className="text-[10px] font-black uppercase tracking-tight">{formatDateDDMMYYYY(app.createdAt)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest border transition-all duration-500 ${getStatusStyle(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm">
                                                <ArrowRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
