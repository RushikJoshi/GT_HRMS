import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { showToast } from '../../../utils/uiNotifications';
import { X, Mail, Send, AlertCircle, Info } from 'lucide-react';

const SendEmailModal = ({ caseData, onClose, onEmailSent, initialEmailType = '' }) => {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedEmailType, setSelectedEmailType] = useState(initialEmailType || '');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [recipientType, setRecipientType] = useState('CANDIDATE');
    const [sendToMode, setSendToMode] = useState('CANDIDATE'); // CANDIDATE | CUSTOM | CANDIDATE_AND_CUSTOM
    const [externalEmails, setExternalEmails] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [previewMode, setPreviewMode] = useState(false);

    const candidateName = caseData.candidateId?.name || caseData.candidateName || 'N/A';
    const candidateEmail = caseData.candidateId?.email || caseData.candidateEmail || '';
    const recipientTypeLabel =
        sendToMode === 'CUSTOM'
            ? 'CUSTOM'
            : sendToMode === 'CANDIDATE_AND_CUSTOM'
                ? 'CANDIDATE + CUSTOM'
                : recipientType;

    const parseEmailList = (raw) => {
        if (!raw) return [];
        return String(raw)
            .split(/[;,]/)
            .map(s => s.trim())
            .filter(Boolean);
    };

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Email type options with descriptions
    const emailTypes = [
        {
            value: 'DOCUMENT_PENDING',
            label: 'Document Pending Reminder',
            description: 'Remind candidate to upload pending documents',
            recipientType: 'CANDIDATE',
            icon: '📄',
            allowedWhen: ['PENDING', 'IN_PROGRESS']
        },
        {
            value: 'BGV_IN_PROGRESS',
            label: 'BGV In Progress',
            description: 'Notify candidate that verification has started',
            recipientType: 'CANDIDATE',
            icon: '🔍',
            allowedWhen: ['IN_PROGRESS']
        },
        {
            value: 'DISCREPANCY_RAISED',
            label: 'Discrepancy Notification',
            description: 'Inform candidate about discrepancy found',
            recipientType: 'CANDIDATE',
            icon: '⚠️',
            allowedWhen: ['IN_PROGRESS', 'VERIFIED_WITH_DISCREPANCIES']
        },
        {
            value: 'BGV_COMPLETED_VERIFIED',
            label: 'BGV Completed - Verified',
            description: 'Congratulate candidate on successful verification',
            recipientType: 'CANDIDATE',
            icon: '✅',
            allowedWhen: ['VERIFIED', 'CLOSED']
        },
        {
            value: 'BGV_COMPLETED_FAILED',
            label: 'BGV Completed - Failed',
            description: 'Notify candidate about failed verification',
            recipientType: 'CANDIDATE',
            icon: '❌',
            allowedWhen: ['FAILED', 'CLOSED']
        }
    ];

    // Filter email types based on current BGV status
    const availableEmailTypes = emailTypes.filter(type =>
        type.allowedWhen.includes(caseData.overallStatus)
    );

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        setSelectedEmailType(initialEmailType || '');
        setCustomMessage('');
        setPreviewMode(false);
        setSelectedTemplate(null);
        setSendToMode('CANDIDATE');
        setExternalEmails('');
    }, [initialEmailType, caseData?._id]);

    useEffect(() => {
        if (selectedEmailType) {
            fetchTemplateByType(selectedEmailType);
            const emailType = emailTypes.find(t => t.value === selectedEmailType);
            if (emailType) {
                setRecipientType(emailType.recipientType);
            }
            setSendToMode('CANDIDATE');
            setExternalEmails('');
        }
    }, [selectedEmailType]);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/bgv/email-templates');
            setTemplates(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        }
    };

    const fetchTemplateByType = async (emailType) => {
        try {
            const res = await api.get(`/bgv/email-template/${emailType}`);
            setSelectedTemplate(res.data.data);
        } catch (err) {
            console.error('Failed to fetch template:', err);
        }
    };

    const handleSendEmail = async () => {
        if (!selectedEmailType) {
            showToast('error', 'Error', 'Please select an email type');
            return;
        }

        const externalList = parseEmailList(externalEmails);
        if ((sendToMode === 'CUSTOM' || sendToMode === 'CANDIDATE_AND_CUSTOM')) {
            if (externalList.length === 0) {
                showToast('error', 'Error', 'Please enter at least one external email address');
                return;
            }

            const invalid = externalList.filter(e => !isValidEmail(e));
            if (invalid.length > 0) {
                showToast('error', 'Error', `Invalid email address(es): ${invalid.join(', ')}`);
                return;
            }

            if (externalList.length > 10) {
                showToast('error', 'Error', 'Too many external recipients (max 10)');
                return;
            }
        }

        const payload = {
            emailType: selectedEmailType,
            recipientType,
            customMessage: customMessage.trim() || undefined
        };

        if (sendToMode === 'CUSTOM') {
            payload.recipientType = 'CUSTOM';
            payload.customRecipientEmail = externalEmails;
        }

        if (sendToMode === 'CANDIDATE_AND_CUSTOM') {
            payload.recipientType = 'CANDIDATE';
            payload.additionalRecipients = externalEmails;
        }

        setLoading(true);
        try {
            await api.post(`/bgv/case/${caseData._id}/send-email`, payload);

            showToast('success', 'Success', 'Email sent successfully');
            onEmailSent && onEmailSent();
            onClose();
        } catch (err) {
            showToast('error', 'Error', err.response?.data?.message || 'Failed to send email');
        } finally {
            setLoading(false);
        }
    };

    const getPreviewHtml = () => {
        if (!selectedTemplate) return '';

        // Simple variable replacement for preview
        let html = selectedTemplate.htmlBody || '';
        const variables = {
            candidate_name: caseData.candidateId?.name || 'Candidate Name',
            bgv_case_id: caseData.caseId || caseData._id,
            job_title: caseData.applicationId?.jobTitle || 'Position',
            bgv_status: caseData.overallStatus || 'IN_PROGRESS',
            sla_date: caseData.slaDate ? new Date(caseData.slaDate).toLocaleDateString() : 'N/A',
            completion_date: caseData.completedAt ? new Date(caseData.completedAt).toLocaleDateString() : 'N/A',
            pending_documents: 'Sample pending documents list'
        };

        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, value);
        });

        return html;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Mail size={24} />
                        <div>
                            <h2 className="text-xl font-bold">Send BGV Email</h2>
                            <p className="text-sm text-blue-100">
                                Case: {caseData.caseId || caseData._id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Warning for closed cases */}
                    {caseData.isClosed && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                            <div className="text-sm">
                                <p className="font-semibold text-amber-900">Case is Closed</p>
                                <p className="text-amber-700">
                                    Only final status emails can be sent for closed BGV cases.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Email Type Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Select Email Type *
                        </label>
                        {availableEmailTypes.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Info size={48} className="mx-auto mb-3 text-slate-300" />
                                <p>No email templates available for current BGV status</p>
                                <p className="text-sm mt-1">Status: {caseData.overallStatus}</p>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <select
                                        value={selectedEmailType}
                                        onChange={(e) => setSelectedEmailType(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-medium bg-white appearance-none"
                                    >
                                        <option value="">-- Choose Email Type --</option>
                                        {availableEmailTypes.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedEmailType && (
                                    <div className="mt-3 bg-slate-50 rounded-lg p-4 border border-slate-200">
                                        {(() => {
                                            const selected = emailTypes.find(t => t.value === selectedEmailType);
                                            return selected ? (
                                                <>
                                                    <div className="font-semibold text-slate-900">{selected.label}</div>
                                                    <div className="text-sm text-slate-600 mt-1">{selected.description}</div>
                                                    <div className="mt-2">
                                                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                                            To: {selected.recipientType}
                                                        </span>
                                                    </div>
                                                </>
                                            ) : null;
                                        })()}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Recipient Info */}
                    {selectedEmailType && (
                        <div className="mb-6 bg-slate-50 rounded-lg p-4">
                            <div className="text-sm font-semibold text-slate-700 mb-2">
                                Recipient Information
                            </div>
                            <div className="text-sm text-slate-600">
                                <div><strong>Name:</strong> {candidateName}</div>
                                <div><strong>Email:</strong> {candidateEmail || 'N/A'}</div>
                                <div><strong>Type:</strong> {recipientTypeLabel}</div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                        Send To
                                    </label>
                                    <select
                                        value={sendToMode}
                                        onChange={(e) => setSendToMode(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
                                    >
                                        <option value="CANDIDATE">Candidate (Default)</option>
                                        <option value="CUSTOM">External Email Only</option>
                                        <option value="CANDIDATE_AND_CUSTOM">Candidate + External Email</option>
                                    </select>
                                </div>

                                {(sendToMode === 'CUSTOM' || sendToMode === 'CANDIDATE_AND_CUSTOM') && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                                            External Email(s)
                                        </label>
                                        <input
                                            value={externalEmails}
                                            onChange={(e) => setExternalEmails(e.target.value)}
                                            placeholder="vendor@example.com, manager@example.com"
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
                                        />
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Use comma/semicolon to add multiple emails (max 10)
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 text-xs text-slate-600">
                                <strong>Will send to:</strong>{' '}
                                {sendToMode === 'CUSTOM'
                                    ? (parseEmailList(externalEmails).join(', ') || 'N/A')
                                    : sendToMode === 'CANDIDATE_AND_CUSTOM'
                                        ? ([candidateEmail, ...parseEmailList(externalEmails)].filter(Boolean).join(', ') || 'N/A')
                                        : (candidateEmail || 'N/A')}
                            </div>
                        </div>
                    )}

                    {/* Custom Message */}
                    {selectedEmailType && (
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Additional Message (Optional)
                            </label>
                            <textarea
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                placeholder="Add a custom message to include in the email..."
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                rows={4}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                This message will be added to the standard email template
                            </p>
                        </div>
                    )}

                    {/* Preview Toggle */}
                    {selectedEmailType && selectedTemplate && (
                        <div className="mb-4">
                            <button
                                onClick={() => setPreviewMode(!previewMode)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                {previewMode ? '✕ Hide Preview' : '👁️ Preview Email'}
                            </button>
                        </div>
                    )}

                    {/* Email Preview */}
                    {previewMode && selectedTemplate && (
                        <div className="mb-6 border border-slate-300 rounded-lg overflow-hidden">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-300">
                                <div className="text-sm font-semibold text-slate-700">
                                    Email Preview
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                    Subject: {selectedTemplate.subject}
                                </div>
                            </div>
                            <div
                                className="p-4 bg-white max-h-96 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                        {selectedEmailType && (
                            <span className="flex items-center gap-2">
                                <Info size={16} />
                                Email will be logged for audit trail
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendEmail}
                            disabled={!selectedEmailType || loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Send Email
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SendEmailModal;
