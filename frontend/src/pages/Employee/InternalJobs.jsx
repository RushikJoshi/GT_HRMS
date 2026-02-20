import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Briefcase, MapPin, Clock, Zap, Check, Send, Eye, X, Users, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function InternalJobs() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [appliedJobIds, setAppliedJobIds] = useState(new Set());
    const [selectedJob, setSelectedJob] = useState(null);
    const [tenantCode, setTenantCode] = useState('');

    useEffect(() => {
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
            if (res.data && Array.isArray(res.data.requirements)) {
                setJobs(res.data.requirements);
            } else if (Array.isArray(res.data)) {
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

    const isJobApplied = (jobId) => appliedJobIds.has(jobId);

    if (loading) return (
        <div className="h-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Opportunities...</p>
        </div>
    );

    return (
        <div className="h-[calc(100vh-7rem)] w-full bg-white overflow-hidden flex flex-col animate-in fade-in duration-500">

            {/* Header Section */}


            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 pt-0 custom-scrollbar">
                {jobs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <div className="p-4 bg-white rounded-full border border-slate-200 mb-4 shadow-sm">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No Openings Found</h3>
                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Check back later for new opportunities</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {jobs.map(job => (
                            <div
                                key={job._id}
                                className="bg-white rounded-[20px] p-5 border border-[#E5E7EB] shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2.5 bg-[#F0FDFA] rounded-xl text-[#14B8A6] group-hover:bg-[#14B8A6] group-hover:text-white transition-colors duration-300">
                                            <Briefcase size={18} />
                                        </div>
                                        <span className="bg-[#F3F4F6] text-[#4B5563] text-[9px] font-bold uppercase px-3 py-1 rounded-full tracking-wider border border-[#E5E7EB]">
                                            {job.employmentType || 'Full-Time'}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-[#111827] leading-tight mb-1 group-hover:text-[#14B8A6] transition-colors">
                                        {job.jobTitle}
                                    </h3>
                                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-4">
                                        {job.department} Unit
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={12} className="text-[#14B8A6]" />
                                            <span className="text-xs text-[#4B5563] font-medium truncate">{job.location?.city || 'HQ'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={12} className="text-[#14B8A6]" />
                                            <span className="text-xs text-[#4B5563] font-medium">
                                                {job.minExperienceMonths ? `${(job.minExperienceMonths / 12).toFixed(1)}+ Yrs` : 'Fresher'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-[#F3F4F6]">
                                    <button
                                        onClick={() => setSelectedJob(job)}
                                        className="flex-1 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[10px] font-bold text-[#4B5563] uppercase tracking-widest hover:bg-[#F9FAFB] transition-colors"
                                    >
                                        Details
                                    </button>
                                    {isJobApplied(job._id) ? (
                                        <div className="flex-1 py-2.5 bg-[#ECFDF5] text-[#059669] rounded-xl border border-[#D1FAE5] text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                            <Check size={12} />
                                            Applied
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleApply(job._id)}
                                            className="flex-1 py-2.5 bg-[#14B8A6] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#0D9488] transition-colors shadow-sm"
                                        >
                                            Apply
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* JOB DETAILS MODAL */}
            {selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedJob(null)}></div>
                    <div className="relative bg-white border border-[#E5E7EB] w-full max-w-2xl max-h-[90vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-[#F3F4F6] flex justify-between items-start bg-white">
                            <div>
                                <h3 className="text-2xl font-bold text-[#111827]">{selectedJob.jobTitle}</h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[10px] font-bold text-[#14B8A6] uppercase tracking-widest">{selectedJob.department}</span>
                                    <div className="w-1 h-1 rounded-full bg-[#D1D5DB]"></div>
                                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">{selectedJob.location?.city || 'HQ'}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="p-2 bg-white border border-[#E5E7EB] rounded-full text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <section>
                                <h4 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Briefcase size={12} /> Job Description
                                </h4>
                                <div className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-wrap">
                                    {selectedJob.jobDescription || "No detailed description provided."}
                                </div>
                            </section>

                            <div className="grid grid-cols-2 gap-6">
                                <section>
                                    <h4 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">Mandatory Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedJob.mandatorySkills?.map((skill, i) => (
                                            <span key={i} className="px-3 py-1 bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] rounded-lg text-[10px] font-bold uppercase tracking-wide">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-3">Preferred Skills</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedJob.goodToHaveSkills?.map((skill, i) => (
                                            <span key={i} className="px-3 py-1 bg-[#F0FDFA] text-[#14B8A6] border border-[#CCFBF1] rounded-lg text-[10px] font-bold uppercase tracking-wide">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <section className="bg-[#F9FAFB] p-4 rounded-xl border border-[#F3F4F6]">
                                <div className="grid grid-cols-4 gap-4">
                                    {[
                                        { label: 'Experience', value: selectedJob.minExperienceMonths ? `${(selectedJob.minExperienceMonths / 12).toFixed(1)}+ Yrs` : 'Fresher' },
                                        { label: 'Vacancies', value: selectedJob.vacancy },
                                        { label: 'Work Mode', value: selectedJob.workMode || 'Hybrid' },
                                        { label: 'Shift', value: selectedJob.shift || 'General' }
                                    ].map((stat, i) => (
                                        <div key={i}>
                                            <p className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">{stat.label}</p>
                                            <p className="text-xs font-bold text-[#111827]">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-[#F3F4F6] bg-white flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="px-6 py-3 bg-[#F3F4F6] text-[#4B5563] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#E5E7EB] transition"
                            >
                                Close
                            </button>
                            {isJobApplied(selectedJob._id) ? (
                                <button disabled className="px-6 py-3 bg-[#ECFDF5] text-[#059669] rounded-xl text-[10px] font-bold uppercase tracking-widest border border-[#D1FAE5] opacity-60 cursor-not-allowed">
                                    Application Sent
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleApply(selectedJob._id)}
                                    className="px-6 py-3 bg-[#14B8A6] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#0D9488] transition shadow-lg shadow-teal-500/20"
                                >
                                    Apply Now
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
