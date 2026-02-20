import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
    ArrowLeft, Clock, Briefcase, Building2, MapPin,
    ExternalLink, ShieldCheck, AlertCircle,
    CheckCircle2, Download, X, Upload, FileText,
    Check
} from 'lucide-react';
import dayjs from 'dayjs';
import { getTenantId } from '../utils/auth';

export default function ApplicationTrack() {
    // 1. All Hooks Must Be at the Top
    const { applicationId } = useParams();
    const navigate = useNavigate();
    const tenantId = getTenantId();

    const [timeline, setTimeline] = useState([]);
    const [jobDetails, setJobDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [uploadingDoc, setUploadingDoc] = useState(null);
    const [bgvInitiated, setBgvInitiated] = useState(false);
    const [requiredDocs, setRequiredDocs] = useState([]);
    const [signedStatus, setSignedStatus] = useState({ isSigned: false });
    const [showSignModal, setShowSignModal] = useState(false);

    const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

    // Dynamic PDF URL helper (Updated to use candidate-specific endpoint)
    const getLetterPdfUrl = (letterId, download = false) => {
        if (!letterId) return null;
        const authId = getTenantId() || jobDetails?.tenantId;
        return `${API_BASE}/public/letters/${letterId}/view-pdf?tenantId=${authId}&download=${download}&_t=${Date.now()}`;
    };

    // 2. Stages Configuration
    const stages = [
        { id: 'Applied', label: 'Application Submitted', backendKeys: ['Applied', 'applied'], description: 'Initial application received' },
        { id: 'Shortlisted', label: 'Resume Screening', backendKeys: ['Shortlisted', 'shortlisted', 'Screening', 'screening', 'Technical'], description: 'HR is reviewing your profile' },
        { id: 'Interview', label: 'Interview Process', backendKeys: ['Interview', 'interview', 'Interview Scheduled', 'Interview Completed', 'L1 Round', 'L2 Round'], description: 'Technical & Skill evaluations' },
        { id: 'HR', label: 'HR Round', backendKeys: ['HR Round', 'HR Interview', 'Cultural Fit'], description: 'Culture fit & salary discussion' },
        { id: 'Offered', label: 'Finalized', backendKeys: ['Offered', 'offered', 'Selected', 'selected', 'Offer Issued', 'Offer Accepted', 'Finalized', 'Hired', 'hired', 'Joining Letter Issued'], description: 'Final selection & onboarding' }
    ];

    // 3. Effects
    useEffect(() => {
        async function fetchTimeline() {
            if (!applicationId) return;
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/candidate/application/track/${applicationId}`);
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
        fetchTimeline();
    }, [applicationId]);

    // Fetch BGV docs when status is Offer Accepted
    useEffect(() => {
        if (jobDetails?.status === 'Offer Accepted' && applicationId) {
            const fetchDocs = async () => {
                try {
                    const res = await api.get(`/candidate/application/bgv-documents/${applicationId}`);
                    if (res.data) {
                        setBgvInitiated(res.data.bgvInitiated);
                        setUploadedDocs(res.data.documents || []);
                        setRequiredDocs(res.data.requiredDocs || []);
                    }
                } catch (err) {
                    console.error("Failed to fetch BGV docs", err);
                }
            };
            fetchDocs();
        }
    }, [jobDetails?.status, applicationId]);

    // Fetch Signing Status
    useEffect(() => {
        if (jobDetails?.letterId) {
            api.get(`/candidate/letter/status/${jobDetails.letterId}`)
                .then(res => setSignedStatus(res.data))
                .catch(err => console.error("Status fetch failed", err));
        }
    }, [jobDetails?.letterId]);

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

    // 4. Handlers
    const handleDownload = async (url, title) => {
        if (!url) return;
        try {
            const baseUrl = API_BASE.replace(/\/api$/, '');
            const finalUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
            window.open(finalUrl, '_blank');
        } catch (err) {
            console.error(`Download failed for ${title}:`, err);
            alert(`Sorry! This ${title} is not yet available.`);
        }
    };

    const handleAcceptOffer = async () => {
        if (!window.confirm("Are you sure you want to ACCEPT this offer?")) return;
        try {
            setLoading(true);
            const res = await api.post(`/candidate/application/accept-offer/${applicationId}`);
            if (res.data.success) {
                alert("Offer Accepted! Now please upload your documents below.");
                window.location.reload();
            }
        } catch (err) {
            console.error("Failed to accept offer:", err);
            alert(err.response?.data?.error || "Failed to accept offer.");
            setLoading(false);
        }
    };

    const handleRejectOffer = async () => {
        if (!window.confirm("Are you sure you want to REJECT this offer?")) return;
        try {
            setLoading(true);
            const res = await api.post(`/candidate/application/reject-offer/${applicationId}`);
            if (res.data.success) {
                alert("Offer Rejected.");
                window.location.reload();
            }
        } catch (err) {
            console.error("Failed to reject offer:", err);
            alert(err.response?.data?.error || "Failed to reject offer.");
            setLoading(false);
        }
    };


    const handleFinalAccept = async () => {
        try {
            if (!signedStatus.isSigned && jobDetails?.letterId) {
                if (!window.confirm("You haven't signed the letter yet. Would you like to sign it now?")) {
                    return;
                }
                setShowSignModal(true);
                return;
            }

            setLoading(true);
            const res = await api.post(`/letters/${jobDetails.letterId}/accept`);
            if (res.data.success) {
                alert("Congratulations! The letter has been accepted and finalized.");
                setShowOfferModal(false);
                window.location.reload();
            }
        } catch (err) {
            console.error("Final accept error:", err);
            alert(err.response?.data?.message || "Failed to accept letter");
            setLoading(false);
        }
    };

    const handleSignLetter = async (base64) => {
        try {
            setLoading(true);
            const res = await api.post(`/candidate/letter/sign/${jobDetails.letterId}`, {
                signatureImage: base64,
                signaturePosition: signedStatus.signaturePosition
            });
            if (res.data.success) {
                // Important: Trigger reload or update state to refresh PDF iframe
                setSignedStatus({ isSigned: true, signedAt: res.data.signedAt });
                setShowSignModal(false);
                alert("Letter signed successfully!");
            }
        } catch (err) {
            console.error("Signing failed", err);
            alert("Failed to save signature. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event, docType) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File size must be less than 5MB");
            return;
        }

        const formData = new FormData();
        formData.append('document', file);
        formData.append('type', docType);

        setUploadingDoc(docType);
        try {
            await api.post(`/candidate/application/bgv-documents/${applicationId}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const res = await api.get(`/candidate/application/bgv-documents/${applicationId}`);
            if (res.data && res.data.documents) {
                setUploadedDocs(res.data.documents);
            }
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload document.");
        } finally {
            setUploadingDoc(null);
        }
    };

    // 5. Early Returns (AFTER hooks)
    if (loading) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Tracking Journey...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-100 text-center">
                <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Tracking Error</h3>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed">{error}</p>
                <button
                    onClick={() => navigate('/candidate/applications')}
                    className="w-full bg-slate-50 border border-slate-100 text-slate-600 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                    <ArrowLeft size={16} /> Back to My Applications
                </button>
            </div>
        </div>
    );

    // 6. Final Render Data
    const currentStatus = (jobDetails?.status || 'Applied').toLowerCase();
    const statusIndex = stages.findIndex(s => s.backendKeys.some(key => key.toLowerCase() === currentStatus));

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 animate-in fade-in duration-200">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 pt-8">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate('/candidate/applications')}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 hover:shadow-md hover:scale-105 transition-all"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 tracking-tight leading-none mb-2">Application Tracking</h1>
                            <p className="text-slate-500 font-medium">Ref ID: <span className="font-bold text-indigo-500">APP-{applicationId?.slice(-6).toUpperCase()}</span></p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-4 space-y-10">
                        <div className="bg-white rounded-[2.5rem] shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-50 p-10 lg:p-12 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>

                            <div className="relative z-10">
                                <div className="h-20 w-20 rounded-3xl bg-[#EEF2FF] flex items-center justify-center text-indigo-600 mb-8 shadow-sm">
                                    <Briefcase size={36} />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-4 group-hover:text-indigo-600 transition-colors leading-tight">{jobDetails?.title || 'Position Details'}</h2>
                                <div className="space-y-4 mb-10">
                                    <div className="flex items-center gap-4 text-slate-500 font-bold text-xs uppercase tracking-widest">
                                        <Building2 className="w-5 h-5 text-indigo-400" />
                                        <span>{jobDetails?.department || 'General'}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-500 font-bold text-xs uppercase tracking-widest">
                                        <MapPin className="w-5 h-5 text-indigo-400" />
                                        <span>{jobDetails?.company || 'Corporate HQ'}</span>
                                    </div>
                                </div>

                                <div className="mt-12 pt-10 border-t border-slate-50 space-y-4">
                                    {(jobDetails?.offerLetterUrl || jobDetails?.letterId) && (
                                        <button
                                            onClick={() => setShowOfferModal(true)}
                                            className="w-full bg-white border border-indigo-100 text-indigo-600 py-5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 shadow-sm"
                                        >
                                            <FileText className="w-4 h-4" /> View Offer Letter
                                        </button>
                                    )}

                                    {jobDetails?.joiningLetterUrl && (
                                        <button
                                            onClick={() => handleDownload(jobDetails.joiningLetterUrl, 'Joining Letter')}
                                            className="w-full bg-indigo-600 text-white py-5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-3"
                                        >
                                            <ExternalLink className="w-4 h-4" /> Download Joining Letter
                                        </button>
                                    )}

                                    <button
                                        onClick={() => navigate(`/apply-job/${jobDetails?.id}?tenantId=${tenantId}`)}
                                        className="w-full bg-slate-50 text-slate-600 py-5 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
                                    >
                                        <ShieldCheck className="w-4 h-4" /> Review Application
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* OFFER ACTIONS */}
                        {(jobDetails?.offerLetterUrl || jobDetails?.letterId) && (jobDetails?.status === 'Offer Issued' || jobDetails?.status === 'Selected' || jobDetails?.letterStatus) && (
                            <div className="bg-white rounded-[2.5rem] shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-50 p-10 text-center animate-in slide-in-from-bottom-5">
                                <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto mb-6">
                                    <FileText size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-4">Letter Action Required</h3>
                                <p className="text-slate-500 text-sm mb-8 px-4 leading-relaxed">
                                    {jobDetails?.letterId
                                        ? `Your letter is ready for review. Please review and accept below to proceed.`
                                        : "Congratulations! Please review the offer letter and accept to proceed."}
                                </p>

                                <div className="flex flex-col gap-4">
                                    {jobDetails?.letterId && !signedStatus.isSigned && (
                                        <button
                                            onClick={() => setShowSignModal(true)}
                                            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.1em] hover:bg-indigo-700 transition shadow-xl flex items-center justify-center gap-3"
                                        >
                                            <Check size={16} /> Sign Letter
                                        </button>
                                    )}

                                    {signedStatus.isSigned && (
                                        <div className="flex items-center justify-center gap-2 py-4 text-emerald-600 bg-emerald-50 rounded-2xl border border-emerald-100 mb-2">
                                            <CheckCircle2 size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Letter Signed</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setShowOfferModal(true)}
                                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.1em] hover:bg-slate-800 transition shadow-xl flex items-center justify-center gap-3"
                                    >
                                        <ExternalLink size={16} /> {signedStatus.isSigned ? 'View Signed Document' : 'Open Document Review'}
                                    </button>

                                    {!jobDetails?.letterId ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <button onClick={handleRejectOffer} className="bg-white border border-rose-100 text-rose-500 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all">Reject</button>
                                            <button onClick={handleAcceptOffer} className="bg-emerald-500 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all">Accept</button>
                                        </div>
                                    ) : (
                                        jobDetails?.letterStatus !== 'Accepted' && (
                                            <div className="pt-2 border-t border-slate-50 mt-2">
                                                <button
                                                    onClick={handleFinalAccept}
                                                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Check size={16} /> Accept Offer
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        )}

                        {/* BGV Uploader directly on this page - only show if initiated by HR */}
                        {jobDetails?.status === 'Offer Accepted' && bgvInitiated && (
                            <div className="bg-emerald-50 rounded-[2.5rem] border border-emerald-100 p-8 animate-in slide-in-from-bottom-5">
                                <div className="text-center mb-6">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-emerald-800 mb-2">BGV Verification</h3>
                                    <p className="text-emerald-600 text-sm px-4">
                                        Please upload the following documents to complete your background verification.
                                    </p>
                                </div>

                                <div className="space-y-3 bg-white/50 p-4 rounded-2xl border border-emerald-100/50">
                                    {requiredDocs.map((doc) => {
                                        const uploaded = uploadedDocs.find(d => d.documentType === doc.key || d.name === doc.key);
                                        return (
                                            <div key={doc.key} className="bg-white p-4 rounded-xl border border-emerald-100 flex items-center justify-between shadow-sm">
                                                <div>
                                                    <p className="text-slate-700 font-bold text-sm">{doc.label}</p>
                                                    {uploaded ? (
                                                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1 flex items-center gap-1">
                                                            <CheckCircle2 size={10} /> Uploaded • {dayjs(uploaded.uploadedAt).format('MMM DD')}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Pending</p>
                                                    )}
                                                </div>
                                                {uploaded ? (
                                                    <div className="flex items-center gap-2 text-emerald-500">
                                                        <CheckCircle2 size={20} />
                                                    </div>
                                                ) : (
                                                    <label className={`cursor-pointer px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition flex items-center gap-2 border border-indigo-100 ${uploadingDoc === doc.key ? 'opacity-50 pointer-events-none' : ''}`}>
                                                        {uploadingDoc === doc.key ? (
                                                            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                                                        ) : (
                                                            <Upload size={14} />
                                                        )}
                                                        <span>Upload</span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                            onChange={(e) => handleFileUpload(e, doc.key)}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-[2.5rem] shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-50 p-10 lg:p-14">
                            <h2 className="text-2xl font-bold text-slate-800 mb-16 flex items-center gap-5 tracking-tight">
                                <div className="bg-[#EEF2FF] p-3 rounded-2xl text-indigo-600 border border-indigo-100 ring-4 ring-indigo-50">
                                    <Clock className="w-6 h-6" />
                                </div>
                                Journey & Progress Timeline
                            </h2>

                            <div className="relative pl-12 sm:pl-20">
                                <div className="absolute left-[34px] sm:left-[41px] top-4 bottom-4 w-1.5 bg-slate-50 rounded-full" />
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
                                                <div className="flex items-center gap-10">
                                                    <div className={`w-16 sm:w-20 h-16 sm:h-20 flex-shrink-0 rounded-[1.5rem] border-4 flex items-center justify-center bg-white shadow-lg transition-all duration-700 relative
                                                            ${isCurrent ? 'border-indigo-600 ring-12 ring-indigo-50 scale-110' : (isCompleted ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50')}`}>
                                                        {isCurrent ? (
                                                            <div className="w-4 h-4 bg-indigo-600 rounded-full animate-ping" />
                                                        ) : (
                                                            isCompleted ? <CheckCircle2 className="h-7 w-7 text-emerald-500" /> : <div className="w-2.5 h-2.5 bg-slate-100 rounded-full" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className={`font-bold text-xl tracking-tight mb-2 ${isFuture ? 'text-slate-300' : 'text-slate-800'} ${isCurrent ? 'text-indigo-600' : ''}`}>
                                                            {stage.label}
                                                        </h3>
                                                        <div className="flex items-center gap-3">
                                                            <p className={`text-sm font-medium ${isFuture ? 'text-slate-300' : 'text-slate-500'}`}>
                                                                {isCompleted ? 'Historical Log' : (isCurrent ? 'In Active Progress' : 'Upcoming Stage')}
                                                            </p>
                                                            {timestamp && (
                                                                <p className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                                                                    {dayjs(timestamp).format('MMM DD, YYYY')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!isFuture && (
                                                    <div className="mt-4 sm:mt-0 sm:ml-auto space-y-3 max-w-[300px] w-full">
                                                        {logs.length > 0 ? logs.map((log, lIdx) => (
                                                            <div key={lIdx} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                                                                        {log.status === 'Interview Scheduled' ? 'Scheduled' : (log.status || stage.label)}
                                                                    </span>
                                                                    <span className="text-[8px] font-bold text-slate-400">
                                                                        {dayjs(log.timestamp || log.actionDate).format('DD MMM')}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                                                                    {log.message || log.remarks || stage.description}
                                                                </p>
                                                            </div>
                                                        )) : (
                                                            <div className="p-4 bg-[#F8FAFC] border border-slate-100 rounded-2xl shadow-sm italic text-slate-400 text-[10px]">
                                                                Waiting to initiate this stage...
                                                            </div>
                                                        )}
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

            {/* Offer Letter Modal - Advanced Architect View */}
            {showOfferModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-6xl h-[92vh] flex flex-col shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/20">

                        {/* Modal Header */}
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                        Document Review
                                    </h3>
                                    <div className="text-slate-400 text-[10px] font-bold uppercase mt-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                        {jobDetails?.letterId ? 'Secure Dynamic Document' : 'Official Document'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">

                                <button
                                    onClick={() => handleDownload(jobDetails?.letterId ? getLetterPdfUrl(jobDetails.letterId, true) : jobDetails?.offerLetterUrl, 'Offer Letter')}
                                    className="flex items-center gap-2 px-6 py-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    <Download size={16} /> Download PDF
                                </button>

                                <button
                                    onClick={() => { setShowOfferModal(false); }}
                                    className="p-4 rounded-full hover:bg-rose-50 hover:text-rose-500 text-slate-400 transition-all group"
                                >
                                    <X size={28} className="group-hover:rotate-90 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - Document Display */}
                        <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
                            {/* PDF Preview */}
                            <div className={`flex-1 p-6 lg:p-10 w-full flex flex-col`}>
                                <div className="flex-1 bg-white rounded-3xl shadow-inner border border-slate-200 overflow-hidden relative">
                                    <object
                                        data={jobDetails?.letterId ? getLetterPdfUrl(jobDetails.letterId) : (jobDetails?.offerLetterUrl?.startsWith('http') ? jobDetails?.offerLetterUrl : `${API_BASE.replace(/\/api$/, '')}${jobDetails?.offerLetterUrl}`)}
                                        type="application/pdf"
                                        className="w-full h-full"
                                        title="Offer Letter"
                                    >
                                        <embed
                                            src={jobDetails?.letterId ? getLetterPdfUrl(jobDetails.letterId) : (jobDetails?.offerLetterUrl?.startsWith('http') ? jobDetails?.offerLetterUrl : `${API_BASE.replace(/\/api$/, '')}${jobDetails?.offerLetterUrl}`)}
                                            type="application/pdf"
                                            className="w-full h-full"
                                        />
                                        <p className="p-8 text-center text-slate-500">
                                            Unable to display PDF. Please <a href={jobDetails?.letterId ? getLetterPdfUrl(jobDetails.letterId) : jobDetails?.offerLetterUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">download the PDF</a> to view it.
                                        </p>
                                    </object>
                                </div>
                                <div className="mt-4 flex items-center justify-between px-2">
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        Having trouble viewing? Use the download button or open in a new tab.
                                    </p>
                                    <a
                                        href={jobDetails?.letterId ? getLetterPdfUrl(jobDetails.letterId) : (jobDetails?.offerLetterUrl?.startsWith('http') ? jobDetails?.offerLetterUrl : `${API_BASE.replace(/\/api$/, '')}${jobDetails?.offerLetterUrl}`)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                                    >
                                        <ExternalLink size={10} /> Open in New Tab
                                    </a>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {/* Signature Modal */}
            {showSignModal && (
                <SignatureModal
                    onSave={handleSignLetter}
                    onClose={() => setShowSignModal(false)}
                />
            )}
        </div>
    );
}

// --------------------------------------------------------------------------------
// SIGNATURE MODAL COMPONENT (Production Ready Canvas Implementation)
// --------------------------------------------------------------------------------
function SignatureModal({ onSave, onClose }) {
    const canvasRef = React.useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1e293b';
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const ctx = canvas.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasDrawn(true);
    };

    const stopDrawing = () => setIsDrawing(false);

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
    };

    const handleSave = () => {
        if (!hasDrawn) {
            alert("Please provide your signature before saving.");
            return;
        }
        const canvas = canvasRef.current;
        // Trim whitespace from canvas (advanced optimization could be added here)
        onSave(canvas.toDataURL('image/png'));
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl border border-white/10 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Digital Signature</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acceptance of Letter Terms</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 bg-slate-50">
                    <div className="relative bg-white rounded-2xl border-2 border-dashed border-slate-200 p-2 overflow-hidden shadow-inner">
                        <canvas
                            ref={canvasRef}
                            width={500}
                            height={250}
                            className="w-full h-auto cursor-crosshair touch-none"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseOut={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                        {!hasDrawn && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.3em]">Sign Here</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                        <button
                            onClick={handleClear}
                            className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-slate-600 transition-all"
                        >
                            Reset Canvas
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasDrawn}
                            className={`flex-[2] py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg
                                ${hasDrawn ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-100 text-slate-300 pointer-events-none shadow-none'}`}
                        >
                            Submit Signature
                        </button>
                    </div>
                </div>

                <div className="px-8 py-6 bg-slate-900 border-t border-white/5">
                    <p className="text-[9px] text-slate-500 leading-relaxed text-center font-medium">
                        By signing, you acknowledge and accept the terms outlined in the document. This digital signature is legally binding and will be permanently embedded into your record.
                    </p>
                </div>
            </div>
        </div>
    );
}
