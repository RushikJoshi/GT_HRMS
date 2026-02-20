import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { Briefcase, ArrowRight, Calendar, Layers, Building2, Hash } from 'lucide-react';

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
                return 'text-emerald-600 border-emerald-200 bg-emerald-50';
            case 'Rejected':
                return 'text-rose-600 border-rose-200 bg-rose-50';
            case 'Interview':
                return 'text-blue-600 border-blue-200 bg-blue-50';
            case 'Offer Issued':
                return 'text-teal-600 border-teal-200 bg-teal-50';
            default:
                return 'text-amber-600 border-amber-200 bg-amber-50';
        }
    };

    if (loading) return (
        <div className="h-[calc(100vh-7rem)] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Applications...</p>
        </div>
    );

    return (
        <div className="h-[calc(100vh-7rem)] w-full bg-white overflow-hidden flex flex-col animate-in fade-in duration-500">
            {/* Header Section */}
            {/* Header Removed - Managed by Layout */}

            {/* Content Container with Blurry Border Effect */}
            <div className="flex-1 px-4 sm:px-8 pb-8 overflow-hidden">
                <div className="w-full h-full bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] overflow-hidden flex flex-col relative">

                    {/* Inner Scrollable Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

                        {/* List Header - Adjusted for new layout */}
                        <div className="grid grid-cols-12 px-8 py-4 mb-4 rounded-2xl bg-white/50 border border-white/60 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                            <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Briefcase size={12} /> Opportunity
                            </div>
                            <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Building2 size={12} /> Sector
                            </div>
                            <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Calendar size={12} /> Date
                            </div>
                            <div className="col-span-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</div>
                            <div className="col-span-1 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Action</div>
                        </div>

                        <div className="space-y-4">
                            {apps.length === 0 ? (
                                <div className="py-32 flex flex-col items-center justify-center opacity-40">
                                    <Layers size={48} className="text-slate-300 mb-4" />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">No active applications</p>
                                </div>
                            ) : (
                                apps.map(app => (
                                    <div
                                        key={app._id}
                                        className="group grid grid-cols-12 items-center px-8 py-6 rounded-[24px] bg-white border border-slate-100 hover:border-teal-100 hover:shadow-[0_20px_40px_rgb(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer relative overflow-hidden"
                                    >
                                        {/* Decorative Gradient on Hover */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-teal-50/0 via-teal-50/0 to-teal-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                        {/* Opportunity */}
                                        <div className="col-span-4 flex items-center gap-5 relative z-10">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#14B8A6] group-hover:text-white group-hover:shadow-lg group-hover:shadow-teal-500/20 transition-all duration-300 border border-slate-100 group-hover:border-teal-400">
                                                <Briefcase size={22} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-[#111827] group-hover:text-teal-700 transition-colors mb-1">
                                                    {app.requirementId?.jobTitle || 'Job Title Unavailable'}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                        <Hash size={10} /> {app.requirementId?.jobId || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sector */}
                                        <div className="col-span-3 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500">
                                                    <Layers size={16} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-600">
                                                    {app.requirementId?.department || 'General'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div className="col-span-2 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                                                    <Calendar size={16} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">{formatDateDDMMYYYY(app.createdAt)}</span>
                                                    <span className="text-[10px] font-medium text-slate-400">Applied on</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2 flex justify-center relative z-10">
                                            <div className={`w-full max-w-[140px] px-2 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm ${getStatusStyle(app.status)}`}>
                                                <div className={`w-2 h-2 rounded-full animate-pulse ${app.status === 'Selected' ? 'bg-emerald-500' :
                                                    app.status === 'Rejected' ? 'bg-rose-500' :
                                                        app.status === 'Interview' ? 'bg-blue-500' :
                                                            'bg-amber-500'
                                                    }`}></div>
                                                {app.status}
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <div className="col-span-1 text-right relative z-10 flex justify-end">
                                            <button className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-200 group-hover:bg-teal-500 group-hover:text-white group-hover:border-teal-500 transition-all duration-300 shadow-sm hover:shadow-md">
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
