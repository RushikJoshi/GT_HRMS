import React, { useState, useEffect, useRef } from 'react';
import SendEmailModal from './SendEmailModal';

import api from '../../../utils/api';
import { showToast } from '../../../utils/uiNotifications';
import {
    X, Shield, CheckCircle, XCircle, Clock, AlertCircle, FileText,
    Calendar, User, Package, Download, Eye, Upload, MessageSquare,
    TrendingUp, AlertTriangle, CheckSquare, Edit, Save
} from 'lucide-react';
import { Mail, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';

const EMAIL_TYPES = [
    {
        value: 'DOCUMENT_PENDING',
        label: 'Document Pending Reminder',
        description: 'Remind candidate to upload pending documents',
        recipientType: 'CANDIDATE',
        allowedWhen: ['PENDING', 'IN_PROGRESS']
    },
    {
        value: 'BGV_IN_PROGRESS',
        label: 'BGV In Progress',
        description: 'Notify candidate that verification has started',
        recipientType: 'CANDIDATE',
        allowedWhen: ['IN_PROGRESS']
    },
    {
        value: 'DISCREPANCY_RAISED',
        label: 'Discrepancy Notification',
        description: 'Inform candidate about discrepancy found',
        recipientType: 'CANDIDATE',
        allowedWhen: ['IN_PROGRESS', 'VERIFIED_WITH_DISCREPANCIES']
    },
    {
        value: 'BGV_COMPLETED_VERIFIED',
        label: 'BGV Completed - Verified',
        description: 'Congratulate candidate on successful verification',
        recipientType: 'CANDIDATE',
        allowedWhen: ['VERIFIED', 'CLOSED']
    },
    {
        value: 'BGV_COMPLETED_FAILED',
        label: 'BGV Completed - Failed',
        description: 'Notify candidate about failed verification',
        recipientType: 'CANDIDATE',
        allowedWhen: ['FAILED', 'CLOSED']
    }
];

const BGVDetailModal = ({ caseData, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedCase, setSelectedCase] = useState(caseData);
    const [loading, setLoading] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailInitialType, setEmailInitialType] = useState('');
    const [emailMenuOpen, setEmailMenuOpen] = useState(false);
    const emailMenuRef = useRef(null);

    useEffect(() => {
        const onDocMouseDown = (e) => {
            if (!emailMenuRef.current) return;
            if (emailMenuRef.current.contains(e.target)) return;
            setEmailMenuOpen(false);
        };

        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, []);


    const refreshCase = async () => {
        try {
            const res = await api.get(`/bgv/case/${selectedCase._id}`);
            setSelectedCase(res.data.data);
            onUpdate();
        } catch (err) {
            console.error('Failed to refresh case:', err);
        }
    };

    const handleVerifyCheck = async (checkId, status, remarks) => {
        setLoading(true);
        try {
            await api.post(`/bgv/check/${checkId}/verify`, {
                status,
                internalRemarks: remarks,
                verificationMethod: 'MANUAL'
            });
            showToast('success', 'Success', `Check ${status.toLowerCase()} successfully`);
            await refreshCase();
        } catch (err) {
            showToast('error', 'Error', 'Failed to update check status');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseBGV = async (decision, remarks) => {
        setLoading(true);
        try {
            await api.post(`/bgv/case/${selectedCase._id}/close`, {
                decision,
                remarks
            });
            showToast('success', 'Success', `BGV ${decision.toLowerCase()} successfully`);
            await refreshCase();
        } catch (err) {
            showToast('error', 'Error', err.response?.data?.message || 'Failed to close BGV');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            await api.post(`/bgv/case/${selectedCase._id}/generate-report`);
            showToast('success', 'Success', 'Report generated successfully');
            await refreshCase();
        } catch (err) {
            showToast('error', 'Error', 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'VERIFIED': return 'bg-emerald-500 text-white';
            case 'VERIFIED_WITH_DISCREPANCIES': return 'bg-blue-500 text-white';
            case 'FAILED': return 'bg-rose-500 text-white';
            case 'IN_PROGRESS': return 'bg-amber-500 text-white';
            case 'PENDING': return 'bg-slate-400 text-white';
            case 'CLOSED': return 'bg-purple-500 text-white';
            case 'NOT_STARTED': return 'bg-slate-300 text-slate-700';
            case 'DISCREPANCY': return 'bg-orange-500 text-white';
            default: return 'bg-slate-300 text-slate-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'VERIFIED': return <CheckCircle size={16} />;
            case 'VERIFIED_WITH_DISCREPANCIES': return <Shield size={16} />;
            case 'FAILED': return <XCircle size={16} />;
            case 'IN_PROGRESS': return <Clock size={16} />;
            case 'PENDING': return <AlertCircle size={16} />;
            case 'CLOSED': return <CheckSquare size={16} />;
            case 'NOT_STARTED': return <Clock size={16} />;
            case 'DISCREPANCY': return <AlertTriangle size={16} />;
            default: return <AlertCircle size={16} />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Shield size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">{selectedCase.caseId}</h2>
                            <p className="text-blue-100 text-sm mt-1">{selectedCase.candidateName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black uppercase ${getStatusStyles(selectedCase.overallStatus)}`}>
                            {getStatusIcon(selectedCase.overallStatus)}
                            {selectedCase.overallStatus?.replace(/_/g, ' ')}
                        </span>
                        <div className="relative" ref={emailMenuRef}>
                            <button
                                onClick={() => setEmailMenuOpen(v => !v)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all font-bold text-sm"
                                title="Send Communication"
                            >
                                <Mail size={16} />
                                Send Email
                                <ChevronDown size={16} className={`transition-transform ${emailMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {emailMenuOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-20">
                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                        <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                            Choose Email Type
                                        </div>
                                        <div className="text-[11px] text-slate-600 mt-1">
                                            Status: {selectedCase.overallStatus?.replace(/_/g, ' ')}
                                        </div>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {EMAIL_TYPES.filter(t => t.allowedWhen.includes(selectedCase.overallStatus)).length === 0 ? (
                                            <div className="px-4 py-6 text-sm text-slate-600">
                                                No email templates available for this status.
                                            </div>
                                        ) : (
                                            EMAIL_TYPES
                                                .filter(t => t.allowedWhen.includes(selectedCase.overallStatus))
                                                .map((t) => (
                                                    <button
                                                        key={t.value}
                                                        onClick={() => {
                                                            setEmailInitialType(t.value);
                                                            setShowEmailModal(true);
                                                            setEmailMenuOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                                                    >
                                                        <div className="text-sm font-bold text-slate-900">{t.label}</div>
                                                        <div className="text-xs text-slate-600 mt-0.5">{t.description}</div>
                                                        <div className="mt-2">
                                                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                                                To: {t.recipientType}
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-all"
                        >
                            <X size={24} className="text-white" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 bg-slate-50 px-8 flex gap-2 flex-shrink-0">
                    {[
                        { id: 'overview', label: 'Overview', icon: <Eye size={16} /> },
                        { id: 'checks', label: 'Checks', icon: <CheckCircle size={16} /> },
                        { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
                        { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
                        { id: 'actions', label: 'Actions', icon: <Edit size={16} /> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-4 transition-all ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'overview' && <OverviewTab caseData={selectedCase} />}
                    {activeTab === 'checks' && <ChecksTab caseData={selectedCase} onVerify={handleVerifyCheck} loading={loading} />}
                    {activeTab === 'documents' && <DocumentsTab caseData={selectedCase} onRefresh={refreshCase} />}
                    {activeTab === 'timeline' && <TimelineTab caseData={selectedCase} />}
                    {activeTab === 'actions' && <ActionsTab caseData={selectedCase} onClose={handleCloseBGV} onGenerateReport={handleGenerateReport} loading={loading} />}
                </div>
                {/* Send Email Modal */}
                {showEmailModal && (
                    <SendEmailModal
                        caseData={selectedCase}
                        onClose={() => setShowEmailModal(false)}
                        onEmailSent={refreshCase}
                        initialEmailType={emailInitialType}
                    />
                )}
            </div>
        </div>
    );
};


// Overview Tab
const OverviewTab = ({ caseData }) => {
    return (
        <div className="space-y-6">
            {/* Candidate Info */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                    <User size={20} className="text-blue-600" />
                    Candidate Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoItem label="Name" value={caseData.candidateName} />
                    <InfoItem label="Email" value={caseData.candidateEmail} />
                    <InfoItem label="Position" value={caseData.jobTitle} />
                    <InfoItem label="Package" value={caseData.package} />
                </div>
            </div>

            {/* Verification Progress */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    Verification Progress
                </h3>
                {caseData.checksProgress && (
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-slate-700">Overall Progress</span>
                                <span className="text-2xl font-black text-blue-600">{caseData.checksProgress.percentage}%</span>
                            </div>
                            <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                    style={{ width: `${caseData.checksProgress.percentage}%` }}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-slate-50 rounded-xl">
                                <div className="text-2xl font-black text-slate-900">{caseData.checksProgress.total}</div>
                                <div className="text-xs font-bold text-slate-500 uppercase">Total</div>
                            </div>
                            <div className="text-center p-4 bg-emerald-50 rounded-xl">
                                <div className="text-2xl font-black text-emerald-600">{caseData.checksProgress.verified}</div>
                                <div className="text-xs font-bold text-emerald-600 uppercase">Verified</div>
                            </div>
                            <div className="text-center p-4 bg-rose-50 rounded-xl">
                                <div className="text-2xl font-black text-rose-600">{caseData.checksProgress.failed}</div>
                                <div className="text-xs font-bold text-rose-600 uppercase">Failed</div>
                            </div>
                            <div className="text-center p-4 bg-amber-50 rounded-xl">
                                <div className="text-2xl font-black text-amber-600">{caseData.checksProgress.pending}</div>
                                <div className="text-xs font-bold text-amber-600 uppercase">Pending</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SLA & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
                    <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600" />
                        Timeline
                    </h3>
                    <div className="space-y-3">
                        <InfoItem label="Initiated" value={dayjs(caseData.initiatedAt).format('MMM DD, YYYY HH:mm')} />
                        {caseData.completedAt && (
                            <InfoItem label="Completed" value={dayjs(caseData.completedAt).format('MMM DD, YYYY HH:mm')} />
                        )}
                        {caseData.closedAt && (
                            <InfoItem label="Closed" value={dayjs(caseData.closedAt).format('MMM DD, YYYY HH:mm')} />
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border-2 border-slate-200">
                    <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-blue-600" />
                        SLA Status
                    </h3>
                    {caseData.sla && (
                        <div className="space-y-3">
                            <InfoItem label="Target Days" value={`${caseData.sla.targetDays} days`} />
                            <InfoItem label="Due Date" value={dayjs(caseData.sla.dueDate).format('MMM DD, YYYY')} />
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold ${caseData.sla.isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                {caseData.sla.isOverdue ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                                {caseData.sla.isOverdue ? 'Overdue' : 'On Track'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Checks Tab
const ChecksTab = ({ caseData, onVerify, loading }) => {
    const [selectedCheck, setSelectedCheck] = useState(null);
    const [remarks, setRemarks] = useState('');

    const handleVerify = (status) => {
        if (!selectedCheck) return;
        onVerify(selectedCheck._id, status, remarks);
        setSelectedCheck(null);
        setRemarks('');
    };

    return (
        <div className="space-y-4">
            {caseData.checks && caseData.checks.length > 0 ? (
                caseData.checks.map((check) => (
                    <div key={check._id} className="bg-white rounded-2xl border-2 border-slate-200 p-6 hover:shadow-lg transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h4 className="text-xl font-black text-slate-900">{check.type?.replace(/_/g, ' ')}</h4>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${check.status === 'VERIFIED' ? 'bg-emerald-500 text-white' :
                                        check.status === 'FAILED' ? 'bg-rose-500 text-white' :
                                            check.status === 'IN_PROGRESS' ? 'bg-amber-500 text-white' :
                                                check.status === 'DISCREPANCY' ? 'bg-orange-500 text-white' :
                                                    'bg-slate-300 text-slate-700'
                                        }`}>
                                        {check.status === 'VERIFIED' && <CheckCircle size={12} />}
                                        {check.status === 'FAILED' && <XCircle size={12} />}
                                        {check.status === 'IN_PROGRESS' && <Clock size={12} />}
                                        {check.status === 'DISCREPANCY' && <AlertTriangle size={12} />}
                                        {check.status}
                                    </span>
                                </div>
                                {check.internalRemarks && (
                                    <div className="bg-slate-50 rounded-xl p-4 mt-3">
                                        <p className="text-xs font-black text-slate-400 uppercase mb-1">Internal Remarks</p>
                                        <p className="text-sm text-slate-700">{check.internalRemarks}</p>
                                    </div>
                                )}
                                {check.verificationDetails && (
                                    <div className="mt-3 text-sm text-slate-500">
                                        Verified {dayjs(check.verificationDetails.verifiedAt).fromNow()} via {check.verificationDetails.verificationMethod}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        {!caseData.isClosed && (check.status === 'PENDING' || check.status === 'IN_PROGRESS' || check.status === 'NOT_STARTED') && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                {selectedCheck?._id === check._id ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder="Add verification remarks..."
                                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none resize-none"
                                            rows="3"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleVerify('VERIFIED')}
                                                disabled={loading}
                                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                                            >
                                                <CheckCircle size={16} className="inline mr-2" />
                                                Verify
                                            </button>
                                            <button
                                                onClick={() => handleVerify('FAILED')}
                                                disabled={loading}
                                                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all disabled:opacity-50"
                                            >
                                                <XCircle size={16} className="inline mr-2" />
                                                Fail
                                            </button>
                                            <button
                                                onClick={() => handleVerify('DISCREPANCY')}
                                                disabled={loading}
                                                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all disabled:opacity-50"
                                            >
                                                <AlertTriangle size={16} className="inline mr-2" />
                                                Discrepancy
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedCheck(null);
                                                    setRemarks('');
                                                }}
                                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setSelectedCheck(check)}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                                    >
                                        Update Status
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="text-center py-12 text-slate-400">
                    <CheckCircle size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No checks found</p>
                </div>
            )}
        </div>
    );
};

// Documents Tab
const DocumentsTab = ({ caseData, onRefresh }) => {
    return (
        <div className="space-y-4">
            {caseData.documents && caseData.documents.length > 0 ? (
                caseData.documents.map((doc) => (
                    <div key={doc._id} className="bg-white rounded-2xl border-2 border-slate-200 p-6 flex items-center justify-between hover:shadow-lg transition-all">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <FileText size={24} className="text-blue-600" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900">{doc.documentType?.replace(/_/g, ' ')}</div>
                                <div className="text-sm text-slate-500">{doc.originalName}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    Uploaded {dayjs(doc.uploadedAt).fromNow()} • Version {doc.version}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                                doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                    'bg-slate-100 text-slate-700'
                                }`}>
                                {doc.status}
                            </span>
                            <button className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all">
                                <Download size={18} />
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-12 text-slate-400">
                    <FileText size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No documents uploaded yet</p>
                </div>
            )}
        </div>
    );
};

// Timeline Tab
const TimelineTab = ({ caseData }) => {
    return (
        <div className="space-y-4">
            {caseData.timeline && caseData.timeline.length > 0 ? (
                <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                    {caseData.timeline.map((event, idx) => (
                        <div key={event._id || idx} className="relative pl-16 pb-8">
                            <div className="absolute left-3 top-1 p-2 bg-blue-600 rounded-full">
                                <Clock size={16} className="text-white" />
                            </div>
                            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-black text-slate-900">{event.title}</h4>
                                    <span className="text-xs text-slate-500">
                                        {dayjs(event.timestamp).format('MMM DD, YYYY HH:mm')}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mb-2">{event.description}</p>
                                {event.performedBy && (
                                    <div className="text-xs text-slate-400">
                                        By: {event.performedBy.userName} ({event.performedBy.userRole})
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-400">
                    <Clock size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No timeline events</p>
                </div>
            )}
        </div>
    );
};

// Actions Tab
const ActionsTab = ({ caseData, onClose, onGenerateReport, loading }) => {
    const [decision, setDecision] = useState('');
    const [remarks, setRemarks] = useState('');

    const handleSubmit = () => {
        if (!decision) {
            showToast('error', 'Error', 'Please select a decision');
            return;
        }
        onClose(decision, remarks);
    };

    return (
        <div className="space-y-6">
            {/* Generate Report */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
                <h3 className="font-black text-slate-900 mb-4">Generate Report</h3>
                <p className="text-slate-600 mb-4">Generate a comprehensive BGV report with all verification details.</p>
                <button
                    onClick={onGenerateReport}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    <Download size={18} />
                    Generate Report
                </button>
            </div>

            {/* Close BGV */}
            {!caseData.isClosed && (
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6">
                    <h3 className="font-black text-slate-900 mb-4">Close BGV Case</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Decision</label>
                            <div className="grid grid-cols-3 gap-4">
                                {['APPROVED', 'REJECTED', 'RECHECK_REQUIRED'].map((dec) => (
                                    <label
                                        key={dec}
                                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${decision === dec ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="decision"
                                            value={dec}
                                            checked={decision === dec}
                                            onChange={(e) => setDecision(e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className="text-center">
                                            <div className="font-bold text-slate-900">{dec.replace(/_/g, ' ')}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Remarks</label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Add closing remarks..."
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none resize-none"
                                rows="4"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !decision}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Close BGV Case'}
                        </button>
                    </div>
                </div>
            )}

            {caseData.isClosed && (
                <div className="bg-purple-50 rounded-2xl border-2 border-purple-200 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckSquare size={24} className="text-purple-600" />
                        <h3 className="font-black text-purple-900">Case Closed</h3>
                    </div>
                    <p className="text-purple-700">
                        This BGV case has been closed and is now immutable. No further modifications are allowed.
                    </p>
                    {caseData.decision && (
                        <div className="mt-4 pt-4 border-t border-purple-200">
                            <div className="text-sm font-bold text-purple-700">Decision: {caseData.decision}</div>
                            {caseData.decisionRemarks && (
                                <div className="text-sm text-purple-600 mt-2">{caseData.decisionRemarks}</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};







// Helper Component
const InfoItem = ({ label, value }) => (
    <div>
        <div className="text-xs font-bold text-slate-500 uppercase mb-1">{label}</div>
        <div className="text-sm font-bold text-slate-900">{value || 'N/A'}</div>
    </div>
);

export default BGVDetailModal;
