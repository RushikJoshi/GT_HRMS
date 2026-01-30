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
    const [timeline, setTimeline] = useState([]);
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
        { id: 'hr-round', label: 'HR Round' },
        { id: 'technical-round', label: 'Technical Round' },
        { id: 'final-round', label: 'Final Round' }
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch candidate directly by ID
            const cRes = await api.get(`/hr/candidate-status/${id}`);
            const found = cRes.data;
            setCandidate(found);

            // Get timeline
            const tRes = await api.get(`/hr/candidate-status/${id}/timeline`);
            setTimeline(tRes.data || []);

            // Fetch interview if exists
            try {
                const iRes = await api.get(`/interviews/${id}`);
                if (iRes.data) {
                    setInterview(iRes.data);
                }
            } catch (iErr) {
                // Interview not found, that's OK
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
                    showActionButtons={!!interview}
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

    const renderHRRoundTab = () => {
        if (!candidate) return null;
        if (candidate.currentStatus !== 'Selected') return null;

        return (
            <div className="bg-white rounded-xl border border-emerald-200/60 p-6 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                        <CheckCircle size={24} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Selected for HR Round</h3>
                        <p className="text-sm text-slate-600">
                            ✅ <span className="font-semibold text-emerald-600">Selected — Processed on {dayjs(candidate.updatedAt).format('MMM DD, YYYY')}</span>
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
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-2">
                    <Clock size={20} className="text-blue-500" />
                    Execution Timeline
                </h3>

                {timeline.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 italic bg-slate-50 rounded-xl border-2 border-dashed border-slate-100">
                        No timeline logs yet.
                    </div>
                ) : (
                    <div className="relative ml-4">
                        {/* Vertical Line */}
                        <div className="absolute left-0 top-0 w-0.5 h-full bg-slate-100 -ml-[1px]"></div>

                        <div className="space-y-12">
                            {(() => {
                                // Group logs by stage
                                const grouped = timeline.reduce((acc, log) => {
                                    let stageKey = log.stage || 'Others';

                                    if (log.status === 'Shortlisted') stageKey = 'Interview';
                                    if (stageKey.toUpperCase().includes('INTERVIEW')) stageKey = 'Interview';
                                    else if (stageKey.toUpperCase().includes('FINAL') || stageKey.toUpperCase().includes('SELECTED') || stageKey.toUpperCase().includes('REJECTED')) stageKey = 'Final';
                                    else if (stageKey.toUpperCase().includes('APPLICATION') || stageKey.toUpperCase().includes('APPLIED')) stageKey = 'Application';

                                    if (!acc[stageKey]) acc[stageKey] = [];
                                    acc[stageKey].push(log);
                                    return acc;
                                }, {});

                                const stageOrder = ['Final', 'Interview', 'Application'];
                                const sortedStageKeys = Object.keys(grouped).sort((a, b) => {
                                    const idxA = stageOrder.indexOf(a);
                                    const idxB = stageOrder.indexOf(b);
                                    if (idxA === -1 && idxB === -1) return 0;
                                    if (idxA === -1) return -1;
                                    if (idxB === -1) return 1;
                                    return idxA - idxB;
                                });

                                return sortedStageKeys.map((stageName, groupIndex) => {
                                    const groupLogs = grouped[stageName];
                                    groupLogs.sort((a, b) => new Date(b.actionDate) - new Date(a.actionDate));

                                    return (
                                        <div key={stageName} className="relative pl-10">
                                            <div className="absolute left-0 top-0 -ml-[21px] p-2 bg-white rounded-full border-2 border-slate-100 shadow-sm z-10">
                                                {stageName === 'Interview' ? <MessageSquare size={20} className="text-purple-500" /> :
                                                    stageName === 'Final' ? <CheckCircle size={20} className="text-emerald-500" /> :
                                                        stageName === 'Application' ? <PlusCircle size={20} className="text-blue-500" /> :
                                                            <Clock size={20} className="text-slate-400" />
                                                }
                                            </div>

                                            <div className="bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-5 border border-slate-100 transition">
                                                <div className="flex items-center justify-between mb-6 border-b border-slate-200/60 pb-3">
                                                    <h4 className="text-sm font-black text-slate-800 uppercase">
                                                        {stageName === 'Application' ? 'APPLICATION RECEIVED' :
                                                            stageName === 'Interview' ? 'INTERVIEW PROCESS' :
                                                                stageName === 'Final' ? 'FINAL DECISION' : stageName}
                                                    </h4>
                                                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded">
                                                        {groupLogs.length} updates
                                                    </span>
                                                </div>

                                                <div className="space-y-6">
                                                    {groupLogs.map((log) => (
                                                        <div key={log._id} className="relative pl-4 border-l-2 border-slate-200/60">
                                                            <div className="absolute left-0 top-1.5 -ml-[5px] w-2 h-2 rounded-full bg-slate-300 ring-2 ring-white"></div>
                                                            <div className="flex justify-between gap-1 mb-2">
                                                                <span className={`text-xs font-bold ${log.status === 'Shortlisted' ? 'text-amber-600' :
                                                                        log.status === 'Interview Scheduled' ? 'text-purple-600' :
                                                                            log.status === 'Selected' ? 'text-emerald-600' :
                                                                                log.status === 'Rejected' ? 'text-rose-600' :
                                                                                    'text-slate-600'
                                                                    }`}>
                                                                    {log.status}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {dayjs(log.actionDate).format('MMM DD, hh:mm A')}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                                                                "{log.remarks || 'No remarks'}"
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}
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
                        { id: 'shortlisted', label: '⭐ Shortlisted', show: candidate.currentStatus === 'Shortlisted' || candidate.currentStatus === 'Interview Scheduled' },
                        { id: 'interview', label: '📞 Interview', show: candidate.currentStatus === 'Interview Scheduled' },
                        { id: 'hr-round', label: '✅ HR Round', show: candidate.currentStatus === 'Selected' },
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
                    {activeTab === 'hr-round' && renderHRRoundTab()}
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
