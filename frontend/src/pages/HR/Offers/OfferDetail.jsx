import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { API_ROOT } from '../../../utils/api';
import dayjs from 'dayjs';
import { ArrowLeft, Clock, FileText, CheckCircle, XCircle, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { showToast, showConfirmToast } from '../../../utils/uiNotifications';
import { DatePicker } from 'antd';

const BACKEND_URL = API_ROOT || 'https://hrms.gitakshmi.com';

const OfferCountdownBig = ({ expiryDate }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            if (!expiryDate) return;
            const now = dayjs();
            const expiry = dayjs(expiryDate);
            const diffMs = expiry.diff(now);

            if (diffMs <= 0) {
                setIsExpired(true);
                setTimeLeft('Expired');
                return;
            }

            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            let timeString = '';
            if (days > 0) timeString += `${days} days `;
            timeString += `${hours}h ${minutes}m`;

            setTimeLeft(timeString);
        };

        calculateTime();
        const timer = setInterval(calculateTime, 60000);
        return () => clearInterval(timer);
    }, [expiryDate]);

    if (isExpired) return <div className="text-xl font-bold text-rose-600">Expired</div>;
    return <div className="text-2xl font-bold text-slate-800">{timeLeft}</div>;
};

export default function OfferDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [offer, setOffer] = useState(null);
    const [loading, setLoading] = useState(true);

    // Joining Modal State
    const [showJoiningModal, setShowJoiningModal] = useState(false);
    const [joiningTemplateId, setJoiningTemplateId] = useState('');
    const [joiningTemplates, setJoiningTemplates] = useState([]);
    const [generatingJoining, setGeneratingJoining] = useState(false);
    const [joiningRefNo, setJoiningRefNo] = useState('');
    const [joiningIssueDate, setJoiningIssueDate] = useState(dayjs().format('YYYY-MM-DD'));

    useEffect(() => {
        loadOffer();
        fetchJoiningTemplates();
    }, [id]);

    const loadOffer = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/offers/${id}`);
            setOffer(res.data);
        } catch (err) {
            console.error("Failed to load offer", err);
            showToast('error', 'Error', 'Failed to load offer details');
        } finally {
            setLoading(false);
        }
    };

    const fetchJoiningTemplates = async () => {
        try {
            const res = await api.get('/letters/templates?type=joining');
            setJoiningTemplates(res.data || []);
        } catch (err) { console.error("Failed to load joining templates", err); }
    };

    const handleReOffer = async () => {
        showConfirmToast({
            title: 'Confirm Re-Offer',
            description: 'This will create a new offer record with 48h validity based on this one. Continue?',
            onConfirm: async () => {
                try {
                    await api.post(`/offers/reoffer/${id}`);
                    showToast('success', 'Success', 'Offer Re-Issued successfully!');
                    loadOffer();
                } catch (err) {
                    showToast('error', 'Error', 'Failed to re-offer');
                }
            }
        });
    };

    const handleCancel = async () => {
        showConfirmToast({
            title: 'Revoke Offer',
            description: 'Are you sure you want to revoke this offer? The candidate will no longer be able to accept it.',
            danger: true,
            onConfirm: async () => {
                try {
                    await api.post(`/offers/cancel/${id}`);
                    showToast('success', 'Success', 'Offer Revoked');
                    loadOffer();
                } catch (err) {
                    showToast('error', 'Error', 'Failed to revoke offer');
                }
            }
        });
    };

    const openJoiningModal = () => {
        setJoiningTemplateId('');
        setJoiningRefNo('');
        setJoiningIssueDate(dayjs().format('YYYY-MM-DD'));
        setShowJoiningModal(true);
    };

    const handleJoiningGenerate = async () => {
        try {
            setGeneratingJoining(true);
            const res = await api.post('/letters/generate-joining', {
                employeeId: offer.applicantId._id,
                templateId: joiningTemplateId,
                refNo: joiningRefNo,
                issueDate: joiningIssueDate
            });
            if (res.data.downloadUrl) {
                const url = `${BACKEND_URL}${res.data.downloadUrl}`;
                window.open(url, '_blank');
                setShowJoiningModal(false);
                showToast('success', 'Success', 'Joining Letter Generated!');
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to generate joining letter');
        } finally {
            setGeneratingJoining(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Offer...</div>;
    if (!offer) return <div className="p-8 text-center text-red-500">Offer not found</div>;

    const isTimeExpired = offer.expiryDate && new Date(offer.expiryDate) < new Date();
    const effectiveStatus = (offer.status === 'Sent' && isTimeExpired) ? 'Expired' : offer.status;

    return (
        <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/hr/offers')} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Offer Detail</h1>
                    <div className="text-slate-500 text-sm">Reference: {offer.offerCode || offer._id}</div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Info & Status */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Current Status</h2>
                                <div className="flex items-center gap-2">
                                    {effectiveStatus === 'Accepted' && <CheckCircle className="text-emerald-500" size={24} />}
                                    {effectiveStatus === 'Rejected' && <XCircle className="text-rose-500" size={24} />}
                                    {effectiveStatus === 'Sent' && <Clock className="text-amber-500" size={24} />}
                                    {effectiveStatus === 'Expired' && <AlertTriangle className="text-rose-500" size={24} />}
                                    {effectiveStatus === 'ReOffered' && <RefreshCw className="text-blue-500" size={24} />}

                                    <span className={`text-3xl font-black ${effectiveStatus === 'Expired' ? 'text-rose-600' :
                                        effectiveStatus === 'ReOffered' ? 'text-blue-600' :
                                            effectiveStatus === 'Rejected' ? 'text-rose-600' :
                                                effectiveStatus === 'Accepted' ? 'text-emerald-600' :
                                                    effectiveStatus === 'Sent' ? 'text-amber-600' : 'text-slate-900'
                                        }`}>
                                        {effectiveStatus === 'ReOffered' ? 'RE-OFFERED' : effectiveStatus.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {(effectiveStatus === 'Sent' || effectiveStatus === 'ReOffered') && (
                                <div className="text-right">
                                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Expires In</h2>
                                    <OfferCountdownBig expiryDate={offer.expiryDate} />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex gap-3 pt-6 border-t border-slate-100">
                            {effectiveStatus === 'Expired' && (
                                <button onClick={handleReOffer} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow">
                                    Re-Offer Candidate
                                </button>
                            )}
                            {(effectiveStatus === 'Sent' || effectiveStatus === 'ReOffered') && (
                                <button onClick={handleCancel} className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg font-bold hover:bg-rose-100 transition">
                                    Revoke Offer
                                </button>
                            )}
                            {effectiveStatus === 'Accepted' && (
                                <button
                                    onClick={openJoiningModal}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition shadow flex items-center gap-2"
                                >
                                    <FileText size={18} /> Generate Joining Letter
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Candidate Info */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Candidate Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Name</div>
                                <div className="font-medium">{offer.candidateName || (offer.applicantId ? `${offer.applicantId.firstName} ${offer.applicantId.lastName}` : 'N/A')}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Email</div>
                                <div className="font-medium">{offer.candidateEmail || offer.applicantId?.email || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Role</div>
                                <div className="font-medium">{offer.jobTitle}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Joining Date</div>
                                <div className="font-medium">{offer.joiningDate ? dayjs(offer.joiningDate).format('DD MMM YYYY') : '-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Annual CTC</div>
                                <div className="font-medium text-emerald-600">{offer.ctc ? `₹ ${offer.ctc.toLocaleString()}` : '-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Re-Offer Count</div>
                                <div className="font-medium">{offer.reofferCount || 0}</div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline / History */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Offer Timeline</h3>
                        <div className="space-y-4">
                            {offer.history?.map((h, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                                        {i < offer.history.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 my-1"></div>}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">{h.action}</div>
                                        <div className="text-xs text-slate-500">
                                            by {h.by} • {dayjs(h.timestamp).format('DD MMM, h:mm a')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: PDF Preview */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full min-h-[500px] flex flex-col">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex justify-between items-center">
                            Letter Preview
                            {offer.letterUrl && (
                                <a href={offer.letterUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800"><Download size={20} /></a>
                            )}
                        </h3>
                        <div className="bg-slate-100 rounded-lg flex-1 border border-slate-200 overflow-hidden relative">
                            {offer.letterUrl ? (
                                <iframe src={offer.letterUrl} className="w-full h-full absolute inset-0" title="PDF Preview" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                    No Document Available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Joining Modal */}
            {showJoiningModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">Joining Letter - {offer.candidateName || offer.applicantId?.firstName}</h2>
                            <button onClick={() => setShowJoiningModal(false)} className="text-slate-400 hover:text-slate-600 transition">✕</button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto">
                            <p className="text-sm text-slate-600">Select a template to generate the joining letter.</p>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Template</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={joiningTemplateId}
                                    onChange={(e) => setJoiningTemplateId(e.target.value)}
                                >
                                    <option value="">Choose a template...</option>
                                    {joiningTemplates.map(t => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Reference Number</label>
                                <input
                                    type="text"
                                    value={joiningRefNo}
                                    onChange={(e) => setJoiningRefNo(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. JL/2025/001"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Letter Issue Date</label>
                                <DatePicker
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    format="DD-MM-YYYY"
                                    value={joiningIssueDate ? dayjs(joiningIssueDate) : null}
                                    onChange={(date) => setJoiningIssueDate(date ? date.format('YYYY-MM-DD') : '')}
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setShowJoiningModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm font-medium">Cancel</button>
                            <button
                                onClick={handleJoiningGenerate}
                                disabled={!joiningTemplateId || generatingJoining}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-md disabled:opacity-50 text-sm font-medium"
                            >
                                {generatingJoining ? 'Generating...' : 'Generate PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
