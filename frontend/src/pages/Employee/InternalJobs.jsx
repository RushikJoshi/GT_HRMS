import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Briefcase, MapPin, Users, Clock, Zap, ChevronRight, X, Check, Send, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function InternalJobs() {
    const navigate = useNavigate();
    const { user } = useAuth(); // To get tenant details if needed, or we fetch from API
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [appliedJobIds, setAppliedJobIds] = useState(new Set());
    const [selectedJob, setSelectedJob] = useState(null);
    const [tenantCode, setTenantCode] = useState('');

    useEffect(() => {
        // Fetch tenant code for public link construction
        const tid = user?.tenantId || localStorage.getItem('tenantId');
        if (tid) {
            api.get(`/public/tenant/${tid}`)
                .then(res => setTenantCode(res.data.code || res.data._id || ''))
                .catch(() => { });
        }
    }, [user]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchInternalJobs(), fetchAppliedJobs()]);
            setLoading(false);
        };
        loadData();
    }, []);

    async function fetchInternalJobs() {
        try {
            const res = await api.get('/requirements/internal-jobs');
            // The API returns { requirements: [], pagination: {} }
            if (res.data && Array.isArray(res.data.requirements)) {
                setJobs(res.data.requirements);
            } else if (Array.isArray(res.data)) {
                // Fallback for array response
                setJobs(res.data);
            } else {
                setJobs([]);
            }
        } catch (error) {
            console.error("Failed to load internal jobs", error);
            setJobs([]);
        }
    }

    async function fetchAppliedJobs() {
        try {
            const res = await api.get('/requirements/my-applications');
            if (Array.isArray(res.data)) {
                const ids = new Set(res.data.map(app => app.requirementId ? app.requirementId._id : null).filter(id => id));
                setAppliedJobIds(ids);
            }
        } catch (error) {
            console.error("Failed to load applications", error);
        }
    }

    const handleApply = async (jobId) => {
        if (!window.confirm("Are you sure you want to apply for this position internally? HR will be notified.")) return;

        try {
            await api.post(`/requirements/internal-apply/${jobId}`);
            setAppliedJobIds(prev => new Set(prev).add(jobId));
            alert("Successfully applied! HR has been notified.");
            if (selectedJob) setSelectedJob(null);
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Application failed";
            alert(msg);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Opportunities...</p>
        </div>
    );

    const isJobApplied = (jobId) => appliedJobIds.has(jobId);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header section with glassmorphism */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-20 -mt-20"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                                <Zap size={20} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">Internal Career Hub</h2>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-11">Exclusive openings for Gitakshmi ecosystem</p>
                    </div>
                </div>
            </div>

            {jobs.length === 0 ? (
                <div className="p-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Briefcase size={32} className="text-slate-300 dark:text-slate-700" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active internal recruitment streams</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map(job => (
                        <div
                            key={job._id}
                            className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-colors"></div>
                            <div className="relative space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
                                        <Briefcase size={18} />
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className="bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50 tracking-widest">
                                            {job.employmentType || 'Full-Time'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight group-hover:text-indigo-600 transition-colors">
                                        {job.jobTitle}
                                    </h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{job.department} Unit</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <MapPin size={12} className="text-indigo-500 group-hover:animate-bounce" />
                                        <span className="text-[9px] font-black uppercase tracking-tight truncate">{job.location?.city || 'HQ'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                        <Clock size={12} className="text-indigo-500" />
                                        <span className="text-[9px] font-black uppercase tracking-tight">
                                            {job.minExperienceMonths ? `${(job.minExperienceMonths / 12).toFixed(1)}+ Yrs` : 'Fresher'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-50 dark:border-slate-800/50 relative z-10">
                                <div className="flex flex-1 gap-2">
                                    <button
                                        onClick={() => setSelectedJob(job)}
                                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 group/btn"
                                        title="View Details"
                                    >
                                        Portal View
                                    </button>
                                    <button
                                        onClick={() => window.open(`/jobs/${tenantCode}?jobId=${job._id}`, '_blank')}
                                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 font-black hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center"
                                        title="External Public View"
                                    >
                                        <Eye size={12} />
                                    </button>
                                </div>
                                {isJobApplied(job._id) ? (
                                    <div className="flex-1 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[9px] uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center gap-2">
                                        <Check size={12} />
                                        Active
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleApply(job._id)}
                                        className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Send size={12} />
                                        Apply Now
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* JOB DETAILS MODAL */}
            {selectedJob && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 relative bg-slate-50/50 dark:bg-slate-950/50">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30">
                                    <Briefcase size={22} />
                                </div>
                                <button
                                    onClick={() => setSelectedJob(null)}
                                    className="p-2.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-xl hover:rotate-90 transition-all duration-500 text-slate-400 hover:text-rose-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">{selectedJob.jobTitle}</h3>
                            <div className="flex flex-wrap items-center gap-4 mt-3">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{selectedJob.department} Division</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedJob.location?.city || 'Onsite HQ'}</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-[0.2em]">{selectedJob.employmentType || 'FULL-TIME'}</span>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <div className="w-8 h-[1px] bg-indigo-500/50"></div> Operational Scope
                                </h4>
                                <div className="text-sm font-bold text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed tracking-tight italic">
                                    {selectedJob.jobDescription || "No detailed dossier available for this position."}
                                </div>
                            </section>

                            <div className="grid md:grid-cols-2 gap-10">
                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <div className="w-8 h-[1px] bg-emerald-500/50"></div> Core Arsenal
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedJob.mandatorySkills?.map((skill, i) => (
                                            <span key={i} className="px-4 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-100 dark:border-slate-800">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <div className="w-8 h-[1px] bg-blue-500/50"></div> Elite Mods
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedJob.goodToHaveSkills?.map((skill, i) => (
                                            <span key={i} className="px-4 py-1.5 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-800/40 shadow-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <section className="bg-slate-50 dark:bg-slate-950/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 mt-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                    {[
                                        { label: 'Intelligence', value: selectedJob.minExperienceMonths ? `${(selectedJob.minExperienceMonths / 12).toFixed(1)}+ Yrs` : 'Fresher', icon: Users },
                                        { label: 'Capacity', value: `${selectedJob.vacancy} Units`, icon: Users },
                                        { label: 'Environment', value: selectedJob.workMode || 'Hybrid', icon: MapPin },
                                        { label: 'Cycle', value: selectedJob.shift || 'Day_Delta', icon: Clock }
                                    ].map((stat, i) => (
                                        <div key={i} className="space-y-2">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                                            <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tighter">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="px-8 py-3.5 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all"
                            >
                                Abort
                            </button>
                            {isJobApplied(selectedJob._id) ? (
                                <button
                                    disabled
                                    className="px-10 py-3.5 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center gap-2"
                                >
                                    <Check size={14} />
                                    Active Stream
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleApply(selectedJob._id)}
                                    className="px-10 py-3.5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 active:scale-95"
                                >
                                    Deploy Signature
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
