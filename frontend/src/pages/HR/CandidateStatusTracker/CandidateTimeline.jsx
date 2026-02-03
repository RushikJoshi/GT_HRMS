import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import {
    ArrowLeft, Clock, User, MessageSquare, Calendar,
    CheckCircle, PlusCircle, XCircle, PlayCircle,
    MapPin, Phone, Mail, Award, Briefcase, AlertCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import CandidateCard from './CandidateCard';
import InterviewDetailsRow from './InterviewDetailsRow';
import StatusActionRow from './StatusActionRow';

export default function CandidateTimeline() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [candidate, setCandidate] = useState(null);
    const [timeline, setTimeline] = useState({});
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedButtonLoading, setSelectedButtonLoading] = useState('');
    const [activeTab, setActiveTab] = useState('timeline');

    // Modal State for Status Update
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [formData, setFormData] = useState({
        status: '',
        stage: 'HR',
        remarks: '',
        actionBy: 'HR Manager'
    });

    // Available rounds (you can fetch from settings if needed)
    const availableRounds = [
        { id: 'shortlisted', label: 'Shortlisted' },
        { id: 'technical-round', label: 'Technical Round' },
        { id: 'final-round', label: 'Final Round' }
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch candidate directly by ID

            const cRes = await api.get(`/hr/candidate-status/candidates/${id}`);
            const found = cRes.data;
            setCandidate(found);

            // Get timeline using new endpoint
            const statusRes = await api.get(`/hr/candidate/${id}/status`);
            setTimeline(statusRes.data || {});


            // Get timeline
            const tRes = await api.get(`/hr/candidate-status/${id}/timeline`);
            setTimeline(tRes.data || []);


            // Fetch interview if exists (optional)
            try {
                const iRes = await api.get(`/interviews/${id}`);
                if (iRes.data) {
                    setInterview(iRes.data);
                }

            } catch (iErr) {
                setInterview(null);
            }

            if (found) {
                setFormData(prev => ({
                    ...prev,
                    status: found.currentStatus || '',
                    stage: found.currentStage || 'HR'
                }));
            }
        } catch (err) {
            console.error(err);
            if (err.response?.status !== 404) {
                alert('Failed to load candidate data');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    // === UPDATE STATUS HANDLERS ===
    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/hr/candidate-status/${id}/status`, formData);
            setShowUpdateModal(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    const handleSelected = async (candidateId) => {
        setSelectedButtonLoading('selected');
        try {
            // Call existing update API
            await api.post(`/hr/candidate-status/${candidateId}/status`, {
                status: 'Selected',
                stage: 'HR Round',
                remarks: 'Candidate selected and moved to HR Round',
                actionBy: 'HR Manager'
            });

            // Reload data
            await loadData();
            alert('✅ Candidate moved to HR Round');
        } catch (err) {
            console.error('Error updating candidate:', err);
            alert('Failed to update candidate status');
        } finally {
            setSelectedButtonLoading('');
        }
    };

    const handleRejected = async (candidateId) => {
        setSelectedButtonLoading('rejected');
        try {
            // Call existing update API
            await api.post(`/hr/candidate-status/${candidateId}/status`, {
                status: 'Rejected',
                stage: 'Final',
                remarks: 'Candidate rejected after interview',
                actionBy: 'HR Manager'
            });

            // Reload data
            await loadData();
            alert('❌ Candidate marked as rejected');
        } catch (err) {
            console.error('Error rejecting candidate:', err);
            alert('Failed to reject candidate');
        } finally {
            setSelectedButtonLoading('');
        }
    };

    const handleMoveToRound = async (round) => {
        setSelectedButtonLoading('moveToRound');
        try {
            const roundMap = {
                'shortlisted': 'Shortlisted',
                'hr-round': 'Interview Scheduled',
                'technical-round': 'Interview Scheduled',
                'final-round': 'Interview Scheduled'
            };

            const newStatus = roundMap[round.id] || 'Interview Scheduled';

            // Call existing update API
            await api.post(`/hr/candidate-status/${candidate._id}/status`, {
                status: newStatus,
                stage: round.label,
                remarks: `Candidate moved to ${round.label}`,
                actionBy: 'HR Manager'
            });

            // Reload data
            await loadData();
            alert(`✅ Candidate moved to ${round.label}`);
        } catch (err) {
            console.error('Error moving candidate:', err);
            alert('Failed to move candidate to another round');
        } finally {
            setSelectedButtonLoading('');
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            'Applied': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: Clock },
            'Shortlisted': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: CheckCircle },
            'Interview Scheduled': { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', icon: Calendar },
            'Selected': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle },
            'Rejected': { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: XCircle },
        };
        const style = config[status] || { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', icon: Clock };
        const Icon = style.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${style.bg} ${style.color} ${style.border}`}>
                <Icon size={12} strokeWidth={2.5} />
                {status}
            </span>
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Applied': return 'text-blue-600 bg-blue-50';
            case 'Shortlisted': return 'text-amber-600 bg-amber-50';
            case 'Interview Scheduled': return 'text-purple-600 bg-purple-50';
            case 'Selected': return 'text-emerald-600 bg-emerald-50';
            case 'Rejected': return 'text-rose-600 bg-rose-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Applied': return <PlusCircle size={20} className="text-blue-500" />;
            case 'Shortlisted': return <Award size={20} className="text-yellow-500" />;
            case 'Interview Scheduled': return <PlayCircle size={20} className="text-purple-500" />;
            case 'Selected': return <CheckCircle size={20} className="text-emerald-500" />;
            case 'Rejected': return <XCircle size={20} className="text-rose-500" />;
            default: return <Clock size={20} className="text-slate-400" />;
        }
    };

    // === PIPELINE TAB RENDERING FUNCTIONS ===
    const renderShortlistTab = () => {
        if (!candidate) return null;
        if (candidate.currentStatus !== 'Shortlisted' && candidate.currentStatus !== 'Interview Scheduled') return null;

        return (
            <div className="space-y-4">
                <CandidateCard
                    candidate={candidate}
                    interview={interview}
                    showInterviewDetails={!!interview}
                    showActionButtons={false}
                />
            </div>
        );
    };

    const renderInterviewTab = () => {
        if (!candidate) return null;
        if (candidate.currentStatus !== 'Interview Scheduled') return null;

        return (
            <div className="space-y-4">
                <CandidateCard
                    candidate={candidate}
                    interview={interview}
                    showInterviewDetails={!!interview}
                    showActionButtons={true}
                    onSelected={handleSelected}
                    onRejected={handleRejected}
                    onMoveToRound={handleMoveToRound}
                    availableRounds={availableRounds}
                    selectedButtonLoading={selectedButtonLoading}
                    disableActions={selectedButtonLoading !== ''}
                />
            </div>
        );
    };



    const renderRejectedTab = () => {
        if (!candidate) return null;
        if (candidate.currentStatus !== 'Rejected') return null;

        return (
            <div className="bg-white rounded-xl border border-rose-200/60 p-6 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
                        <XCircle size={24} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Application Closed</h3>
                        <p className="text-sm text-slate-600">
                            ❌ <span className="font-semibold text-rose-600">Rejected — Processed on {dayjs(candidate.updatedAt).format('MMM DD, YYYY')}</span>
                        </p>
                    </div>
                </div>

                {/* Candidate details */}
                <CandidateCard
                    candidate={candidate}
                    showInterviewDetails={false}
                    showActionButtons={false}
                />
            </div>
        );
    };

    const renderTimeline = () => {
        const steps = [
            { key: 'applied', label: 'APPLIED', icon: PlusCircle },
            { key: 'shortlisted', label: 'SHORTLISTED', icon: Award },
            { key: 'interview', label: 'INTERVIEW SCHEDULED', icon: PlayCircle },
            { key: 'selected', label: 'SELECTED', icon: CheckCircle },
            { key: 'rejected', label: 'REJECTED', icon: XCircle },
        ];

        // Filter out steps that shouldn't be shown?
        // User requirements: "If selected = true -> auto-mark previous... If rejected -> mark that stage red".
        // The backend returns an object with all keys.
        // We usually don't show "Rejected" and "Selected" together appropriately.
        // If rejected has status, we might want to prioritize showing it? 
        // Or simply show all 5 if they have data? 
        // Let's show all that have data OR are standard pipeline (Applied/Shortlisted/Interview). 
        // Actually, just show all 5 in order, but maybe hide Rejected if null?
        // User example had `rejected: { status: null }`. 
        // So we should hide rejected if status is null.

        const validSteps = steps.filter(step => {
            // always show first 3?
            if (['applied', 'shortlisted', 'interview'].includes(step.key)) return true;
            // Show selected/rejected only if they have status?
            // Actually, the user wants "timeline icons should change color".
            // If we hide "Selected" slot when it's null, the timeline looks unfinished.
            // But "Rejected" is an alternative ending.

            const data = timeline[step.key];
            // If rejected has data, show it.
            if (step.key === 'rejected') return data && data.status;

            // If selected has data, show it. If rejected has data, maybe hide selected if selected is null?
            if (step.key === 'selected') {
                // If we are rejected, usually we don't show "Selected" slot?
                // Let's just show it if it exists or if we are not rejected?
                // Simple approach: Show Applied, Shortlisted, Interview, Selected. 
                // If Rejected exists, show it INSTEAD of Selected? or After?
                // Let's just filter strictly by existence or standard flow.
                if (timeline.rejected && timeline.rejected.status) return false; // Hide selected if rejected
                return true; // Show selected slot (maybe empty) if not rejected
            }
            return true;
        });

        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2">
                    <Clock size={20} className="text-blue-500" />
                    Execution Timeline
                </h3>

                <div className="relative ml-4">
                    {/* Vertical Line */}
                    <div className="absolute left-0 top-0 w-0.5 h-full bg-slate-100 -ml-[1px]"></div>

                    <div className="space-y-12">
                        {validSteps.map((step, idx) => {
                            const data = timeline[step.key] || { status: null, time: null };
                            const status = data.status; // 'completed', 'in-progress', 'rejected', null

                            // Colors
                            let colorClass = "text-slate-400 bg-white border-slate-200"; // Default
                            let iconColor = "text-slate-300";

                            if (status === 'completed') {
                                colorClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
                                iconColor = "text-emerald-500";
                            } else if (status === 'in-progress') {
                                colorClass = "text-blue-600 bg-blue-50 border-blue-100";
                                iconColor = "text-blue-500";
                            } else if (status === 'rejected') {
                                colorClass = "text-rose-600 bg-rose-50 border-rose-100";
                                iconColor = "text-rose-500";
                            }

                            return (
                                <div key={step.key} className="relative pl-10">
                                    <div className={`absolute left-0 top-0 -ml-[21px] p-2 rounded-full border-2 shadow-sm z-10 bg-white ${status === 'completed' ? 'border-emerald-100' : (status === 'rejected' ? 'border-rose-100' : 'border-slate-100')}`}>
                                        <step.icon size={20} className={iconColor} />
                                    </div>
                                    <div className={`rounded-2xl p-5 border transition ${status ? 'bg-slate-50/50' : 'bg-white'} border-slate-100`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-black text-slate-800 uppercase">
                                                {step.label}
                                            </h4>
                                            {data.time && (
                                                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-100">
                                                    {data.time}
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-h-[24px]">
                                            {status ? (
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border ${colorClass}`}>
                                                    {status === 'in-progress' ? 'In Progress' : status}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic"></span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Building Pipeline...</p>
            </div>
        </div>
    );

    if (!candidate) return (
        <div className="p-12 text-center">
            <div className="text-slate-400 mb-4 font-bold text-xl uppercase">404 - Not Found</div>
            <button onClick={() => navigate('/hr/candidate-status')} className="text-blue-600 hover:underline">Return to list</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Top Banner */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/hr/candidate-status')}
                            className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{candidate.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{candidate.requirementTitle}</p>
                                <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-full">
                                    {getStatusBadge(candidate.currentStatus)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowUpdateModal(true)}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 font-bold text-sm"
                    >
                        Update Progress
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 mt-8">
                {/* Tab Navigation */}
                <div className="flex items-center gap-2 mb-8 bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
                    {[
                        { id: 'shortlisted', label: '⭐ Shortlisted', show: false },
                        { id: 'interview', label: '📞 Interview', show: false },
                        { id: 'rejected', label: '❌ Rejected', show: candidate.currentStatus === 'Rejected' },
                        { id: 'timeline', label: '📅 Timeline', show: true }
                    ].map(tab => tab.show && (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {activeTab === 'shortlisted' && renderShortlistTab()}
                    {activeTab === 'interview' && renderInterviewTab()}
                    {activeTab === 'rejected' && renderRejectedTab()}
                    {activeTab === 'timeline' && renderTimeline()}
                </div>
            </div>

            {/* Update Status Modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 flex justify-between items-center">
                            <h3 className="text-white font-bold">Update Progress</h3>
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                className="text-white/80 hover:text-white"
                            >
                                <ArrowLeft className="rotate-90" size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateStatus} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Status</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    required
                                >
                                    <option value="Applied">Applied</option>
                                    <option value="Shortlisted">Shortlisted</option>
                                    <option value="Interview Scheduled">Interview Scheduled</option>
                                    <option value="Selected">Selected</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Stage</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['HR', 'Technical', 'Final'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, stage: s })}
                                            className={`py-2 text-xs font-bold rounded-lg border transition ${formData.stage === s
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                                : 'bg-white border-slate-100 text-slate-500'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Remarks</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 min-h-[100px]"
                                    placeholder="Add remarks..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    required
                                ></textarea>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowUpdateModal(false)}
                                    className="flex-1 px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg"
                                >
                                    Update
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
