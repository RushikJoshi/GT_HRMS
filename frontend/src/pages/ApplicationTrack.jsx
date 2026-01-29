import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, Clock, Briefcase, Calendar, Building2, MapPin, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { getTenantId } from '../utils/auth';

export default function ApplicationTrack() {
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const [timeline, setTimeline] = useState([]);
    const [jobDetails, setJobDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const tenantId = getTenantId();

    // Get API_BASE consistent with api.js
    const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

    const handleDownload = async (url, title) => {
        if (!url) return;
        try {
            const finalUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
            const res = await api.head(finalUrl);
            if (res.status === 200) {
                window.open(finalUrl, '_blank');
            }
        } catch (err) {
            console.error(`Download failed for ${title}:`, err);
            alert(`Sorry! This ${title} is not yet available on the server. Please check back later or contact HR.`);
        }
    };

    const stages = [
        { id: 'Applied', label: 'Application Submitted', backendKeys: ['Applied', 'applied'], description: 'Initial application received' },
        { id: 'Shortlisted', label: 'Resume Screening', backendKeys: ['Shortlisted', 'shortlisted', 'Screening', 'screening'], description: 'HR is reviewing your profile' },
        { id: 'Interview', label: 'Interview Process', backendKeys: ['Interview', 'interview', 'Interview Scheduled', 'Interview Completed'], description: 'Technical & HR rounds' },
        { id: 'Offered', label: 'Offer Extended', backendKeys: ['Offered', 'offered', 'Selected', 'selected'], description: 'Job offer released' },
        { id: 'Hired', label: 'Hired', backendKeys: ['Hired', 'hired'], description: 'Onboarding completed' }
    ];

    useEffect(() => {
        async function fetchTimeline() {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/jobs/candidate/application/track/${applicationId}`);
                setTimeline(res.data?.timeline || []);
                setJobDetails(res.data?.jobDetails || null);
                if (!res.data?.jobDetails) {
                    setError("Application details not found.");
                }
            } catch (err) {
                console.error("Failed to load timeline", err);
                setError("Failed to load tracking data. The application may be unavailable.");
            } finally {
                setLoading(false);
            }
        }
        if (applicationId) fetchTimeline();
    }, [applicationId]);

    // FEATURE 3: BACK BUTTON BEHAVIOR
    useEffect(() => {
        const handlePopState = (event) => {
            event.preventDefault();
            if (tenantId) {
                navigate(`/jobs/${tenantId}`, { replace: true });
            } else {
                navigate('/candidate/dashboard', { replace: true });
            }
        };
        window.history.pushState(null, null, window.location.pathname);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [tenantId, navigate]);

    if (loading) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Tracking Journey...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 text-center">
                <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-gray-900 mb-2">Tracking Unavailable</h2>
                <p className="text-gray-500 font-medium mb-8">{error}</p>
                <button
                    onClick={() => navigate('/candidate/applications')}
                    className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-gray-200"
                >
                    Back to Applications
                </button>
            </div>
        </div>
    );

    const currentStatus = (jobDetails?.status || 'Applied').toLowerCase();
    const statusIndex = stages.findIndex(s => s.backendKeys.some(k => k.toLowerCase() === currentStatus));

    const getBadgeStyle = () => {
        if (currentStatus === 'rejected') return 'bg-rose-50 text-rose-600 ring-rose-100';
        if (['selected', 'hired', 'offered'].includes(currentStatus)) return 'bg-emerald-50 text-emerald-600 ring-emerald-100';
        return 'bg-blue-50 text-blue-600 ring-blue-100';
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20 animate-in fade-in duration-700">
            {/* Top Navigation */}
            <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-8">
                <button
                    onClick={() => navigate('/candidate/applications')}
                    className="flex items-center text-gray-400 hover:text-blue-600 group font-bold text-sm transition-all"
                >
                    <div className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 mr-4 group-hover:bg-blue-50 transition-colors">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                    Back to My Applications
                </button>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* LEFT COLUMN: Job Highlight */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-gray-100 overflow-hidden relative">
                        <div className="h-40 bg-gradient-to-br from-blue-700 to-indigo-800 relative">
                            <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                        </div>

                        <div className="px-10 pb-10 relative -mt-16">
                            <div className="bg-white p-2 rounded-[2rem] shadow-2xl shadow-blue-500/10 inline-block mb-8 border border-gray-50">
                                <div className="h-20 w-20 bg-blue-50 rounded-[1.5rem] flex items-center justify-center border border-blue-100/50 text-blue-600">
                                    <Briefcase className="w-10 h-10" />
                                </div>
                            </div>

                            <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border float-right mt-4 ${getBadgeStyle()}`}>
                                Status: {jobDetails?.status || 'Pending'}
                            </div>

                            <h1 className="text-3xl font-black text-gray-900 leading-tight tracking-tight mb-3 clear-both">
                                {jobDetails?.jobTitle || 'Role Name'}
                            </h1>

                            <div className="space-y-6 mt-10">
                                <div className="flex items-center gap-5 group">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all border border-transparent group-hover:border-blue-100">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Company</p>
                                        <p className="text-base font-bold text-gray-800 transition-colors group-hover:text-blue-600">{jobDetails?.company || 'Organization'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 group">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all border border-transparent group-hover:border-blue-100">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Department & Location</p>
                                        <p className="text-base font-bold text-gray-800 transition-colors group-hover:text-blue-600">{jobDetails?.department || 'General'} • {jobDetails?.location || 'Office'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 group">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all border border-transparent group-hover:border-blue-100">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Application Date</p>
                                        <p className="text-base font-bold text-gray-800 transition-colors group-hover:text-blue-600">
                                            {jobDetails?.appliedDate ? dayjs(jobDetails.appliedDate).format('MMMM D, YYYY') : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 pt-10 border-t border-gray-50 space-y-4">
                                {jobDetails?.offerLetterUrl && (
                                    <button
                                        onClick={() => handleDownload(jobDetails.offerLetterUrl, 'Offer Letter')}
                                        className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/10 hover:bg-emerald-700 hover:shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Download Offer Letter
                                    </button>
                                )}

                                {jobDetails?.joiningLetterUrl && (
                                    <button
                                        onClick={() => handleDownload(jobDetails.joiningLetterUrl, 'Joining Letter')}
                                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/10 hover:bg-blue-700 hover:shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Download Joining Letter
                                    </button>
                                )}

                                <button
                                    onClick={() => navigate(`/apply-job/${jobDetails?.requirementId?._id || jobDetails?.requirementId}?tenantId=${tenantId}`)}
                                    className="w-full bg-gray-100 text-gray-700 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <ShieldCheck className="w-4 h-4" /> Review Application
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-gray-200 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full"></div>
                        <ShieldCheck className="w-12 h-12 mb-6 text-blue-500" />
                        <h4 className="text-xl font-black leading-tight mb-3 tracking-tight">Recruitment Support</h4>
                        <p className="text-sm font-medium text-gray-400 leading-relaxed mb-6">Need assistance with your recruitment process? Contact our support team for help.</p>
                        <button className="text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl transition-all">Support Center</button>
                    </div>
                </div>

                {/* RIGHT COLUMN: History & Progress */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-gray-100 p-12">
                        <h2 className="text-2xl font-black text-gray-900 mb-16 flex items-center gap-5 tracking-tight">
                            <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 border border-blue-100">
                                <Clock className="w-6 h-6" />
                            </div>
                            Journey & Progress Timeline
                        </h2>

                        <div className="relative pl-12 sm:pl-20">
                            {/* The vertical connector line */}
                            <div className="absolute left-[34px] sm:left-[41px] top-4 bottom-4 w-2 bg-gray-50 rounded-full" />

                            <div className="space-y-20">
                                {stages.map((stage, index) => {
                                    const isCurrent = index === statusIndex;
                                    const isCompleted = index < statusIndex;
                                    const isFuture = index > statusIndex;

                                    const logs = timeline.filter(log => stage.backendKeys.some(k => k.toLowerCase() === log.status?.toLowerCase()));
                                    const log = logs.length > 0 ? logs[logs.length - 1] : null;
                                    const timestamp = log?.timestamp || log?.actionDate;

                                    return (
                                        <div key={index} className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between group">
                                            <div className="flex items-center gap-8 sm:gap-12">
                                                {/* ICON CIRCLE */}
                                                <div className={`w-16 sm:w-20 h-16 sm:h-20 flex-shrink-0 rounded-full border-4 flex items-center justify-center bg-white shadow-lg transition-all duration-700 relative
                                                    ${isCurrent ? 'border-blue-600 ring-8 ring-blue-50 scale-110' : (isCompleted ? 'border-emerald-500 bg-emerald-50 shadow-emerald-100' : 'border-gray-50 opacity-100')}`}>

                                                    {isCurrent ? (
                                                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-ping" />
                                                    ) : (
                                                        isCompleted ? (
                                                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                                                        ) : (
                                                            <div className="w-2.5 h-2.5 bg-gray-100 rounded-full" />
                                                        )
                                                    )}
                                                </div>

                                                {/* STAGE INFO */}
                                                <div className="transition-all duration-500">
                                                    <h3 className={`font-black text-xl tracking-tight mb-2 ${isFuture ? 'text-gray-300' : 'text-gray-900'} ${isCurrent ? 'text-blue-600' : ''}`}>
                                                        {stage.label}
                                                    </h3>
                                                    <div className="flex items-center gap-3">
                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isFuture ? 'text-gray-200' : (isCurrent ? 'text-blue-400' : 'text-gray-400')}`}>
                                                            {isFuture ? 'Coming Soon' : (timestamp ? `Update: ${dayjs(timestamp).format('hh:mm A')}` : (isCurrent ? 'In Progress' : 'Completed'))}
                                                        </p>
                                                        {isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                                                    </div>

                                                    {!isFuture && (
                                                        <div className={`mt-5 py-4 px-6 rounded-2xl border transition-all duration-500 w-fit max-w-sm ${isCurrent ? 'bg-blue-50/50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                                            <p className="text-xs font-bold leading-relaxed">
                                                                {log?.message || stage.description}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* TIMESTAMP ON RIGHT */}
                                            {(isCompleted || isCurrent) && timestamp && (
                                                <div className="mt-6 sm:mt-0 sm:block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-white py-2 px-5 rounded-xl border border-gray-100 shadow-sm group-hover:border-blue-300 group-hover:text-blue-600 transition-all duration-500">
                                                    {dayjs(timestamp).format('MMM D, YYYY')}
                                                </div>
                                            )}

                                            {isFuture && (
                                                <div className="mt-4 sm:mt-0 px-5 py-2 rounded-xl border border-dashed border-gray-100 text-[10px] font-black text-gray-200 uppercase tracking-widest">
                                                    Locked
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
