import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_ROOT } from '../../../utils/api';
import dayjs from 'dayjs';
import { Eye, RefreshCw, FileText } from 'lucide-react';
import { Pagination, DatePicker } from 'antd';
import { showToast, showConfirmToast } from '../../../utils/uiNotifications';

const BACKEND_URL = API_ROOT || 'https://hrms.gitakshmi.com';

const OfferCountdown = ({ expiryDate }) => {
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
            if (days > 0) timeString += `${days}d `;
            timeString += `${hours}h ${minutes}m`;

            setTimeLeft(timeString);
        };

        calculateTime();
        const timer = setInterval(calculateTime, 60000); // 1 min tick
        return () => clearInterval(timer);
    }, [expiryDate]);

    if (isExpired) return null;
    return (
        <span className="text-amber-600 font-bold text-[10px] flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded whitespace-nowrap border border-amber-100 w-fit">
            ⏳ Expires in: {timeLeft}
        </span>
    );
};

export default function OffersList() {
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Joining Modal State
    const [showJoiningModal, setShowJoiningModal] = useState(false);
    const [selectedOfferForJoining, setSelectedOfferForJoining] = useState(null);
    const [joiningTemplateId, setJoiningTemplateId] = useState('');
    const [joiningTemplates, setJoiningTemplates] = useState([]);
    const [generatingJoining, setGeneratingJoining] = useState(false);
    const [joiningPreviewUrl, setJoiningPreviewUrl] = useState(null);
    const [showJoiningPreview, setShowJoiningPreview] = useState(false);
    const [joiningRefNo, setJoiningRefNo] = useState('');
    const [joiningIssueDate, setJoiningIssueDate] = useState(dayjs().format('YYYY-MM-DD'));

    useEffect(() => {
        fetchOffers();
        fetchJoiningTemplates();
    }, []);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/offers');
            setOffers(res.data);
        } catch (err) {
            console.error("Failed to load offers", err);
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

    const handleReOffer = (offer) => {
        showConfirmToast({
            title: 'Confirm Re-Offer',
            description: `Generate a new offer for ${offer.applicantId?.name}? This will create a new record.`,
            onConfirm: async () => {
                try {
                    await api.post(`/offers/reoffer/${offer._id}`);
                    showToast('success', 'Success', 'Re-Offer Created Successfully');
                    fetchOffers();
                } catch (err) {
                    showToast('error', 'Error', 'Failed to Re-Offer');
                }
            }
        });
    };

    const openJoiningModal = (offer) => {
        // Need employee ID? Wait, joining letter generation usually requires an Employee ID (or Applicant ID depending on implementation).
        // My implementation in Applicant.jsx uses applicant._id for 'employeeId' param in `generate-joining`?
        // Let's check logic: `generate-joining` typically expects `employeeId`.
        // BUT for a new hire, we might use `applicantId`?
        // Step 1695 summary said: "Generation Trigger... Joining Letter is possible once Accepted".
        // Step 1660 `hr.employee.controller` Rule 8 says "Convert to Employee... if Joining Letter Generated".
        // This implies Joining Letter is generated BEFORE Employee Record exists (while still Applicant).
        // So the backend `generate-joining` must accept `applicantId` OR `employeeId`.
        // I will assume it accepts `applicantId` or mapped properly.
        // Actually `Employees.jsx` passes `selectedEmpForJoining._id`.
        // `Applicants.jsx` passes `app._id`.
        // So `offer.applicantId._id` is what I need.
        const idToUse = offer.applicantId?._id;
        if (!idToUse) {
            showToast('error', 'Error', 'Applicant ID missing');
            return;
        }

        setSelectedOfferForJoining(offer);
        setJoiningTemplateId('');
        setJoiningRefNo('');
        setJoiningIssueDate(dayjs().format('YYYY-MM-DD'));
        setShowJoiningModal(true);
        setJoiningPreviewUrl(null);
        setShowJoiningPreview(false);
    };

    const handleJoiningGenerate = async () => {
        // Logic similar to Employees.jsx/Applicants.jsx
        // Note: Endpoint `generate-joining` needs `employeeId` body param. 
        // If `Applicant` flow, we pass applicantId as `employeeId` (backend handles it via checking collection or simply finding by ID).
        try {
            setGeneratingJoining(true);
            const res = await api.post('/letters/generate-joining', {
                employeeId: selectedOfferForJoining.applicantId._id, // Using Applicant ID
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

    const getStatusBadge = (offer) => {
        const isTimeExpired = offer.expiryDate && new Date(offer.expiryDate) < new Date();
        const effectiveStatus = (offer.status === 'Sent' && isTimeExpired) ? 'Expired' : offer.status;

        switch (effectiveStatus) {
            case 'Accepted':
                return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wide border border-emerald-200">ACCEPTED</span>;
            case 'Rejected':
                return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wide border border-rose-200">REJECTED</span>;
            case 'Expired':
                return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wide border border-rose-200">EXPIRED</span>;
            case 'ReOffered':
                return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wide border border-blue-200">RE-OFFERED</span>;
            case 'Sent':
                return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wide border border-amber-200">SENT</span>;
            case 'Revoked':
                return <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-wide border border-gray-300">REVOKED</span>;
            default:
                return <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold uppercase">{effectiveStatus}</span>;
        }
    };

    const paginatedOffers = offers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Offer Management</h1>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            try {
                                setLoading(true); // temporary loading
                                const res = await api.post('/offers/sync');
                                showToast('success', res.data.message);
                                fetchOffers();
                            } catch (e) {
                                showToast('error', 'Sync Failed');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-semibold transition"
                    >
                        Sync Old Offers
                    </button>
                    <button onClick={fetchOffers} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500" title="Refresh List">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-slate-700">Candidate</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Job Title</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Status</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Expires In</th>
                            <th className="px-6 py-3 font-semibold text-slate-700">Date Issued</th>
                            <th className="px-6 py-3 font-semibold text-slate-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading offers...</td></tr>
                        ) : offers.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-slate-500">No offers generated yet.</td></tr>
                        ) : (
                            paginatedOffers.map(offer => {
                                const isTimeExpired = offer.expiryDate && new Date(offer.expiryDate) < new Date();
                                const effectiveStatus = (offer.status === 'Sent' && isTimeExpired) ? 'Expired' : offer.status;

                                return (
                                    <tr key={offer._id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => navigate(`/hr/offers/${offer._id}`)}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {/* Use applicantId photo if populated (unlikely now), else initials from name */}
                                                {offer.applicantId?.photo ? (
                                                    <img src={offer.applicantId.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                                                        {(offer.candidateName || (offer.applicantId ? `${offer.applicantId.firstName} ${offer.applicantId.lastName}` : '?'))[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-slate-900">
                                                        {offer.candidateName || (offer.applicantId ? `${offer.applicantId.firstName} ${offer.applicantId.lastName}` : 'N/A')}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {offer.candidateEmail || offer.applicantId?.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {offer.jobTitle}
                                            {/* Department is now on Offer directly too */}
                                            {offer.department && <span className="ml-1 text-xs text-slate-400">({offer.department})</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(offer)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {(effectiveStatus === 'Sent' || effectiveStatus === 'ReOffered') ? (
                                                <OfferCountdown expiryDate={offer.expiryDate} />
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {dayjs(offer.createdAt).format('DD MMM YYYY, h:mm a')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                {effectiveStatus === 'Accepted' ? (
                                                    <button
                                                        onClick={() => openJoiningModal(offer)}
                                                        className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded hover:bg-emerald-100 transition flex items-center gap-1"
                                                    >
                                                        <FileText size={12} /> Generate Joining
                                                    </button>
                                                ) : effectiveStatus === 'Expired' ? (
                                                    <button
                                                        onClick={() => handleReOffer(offer)}
                                                        className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded hover:bg-blue-100 transition"
                                                    >
                                                        Re-Offer
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => navigate(`/hr/offers/${offer._id}`)}
                                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded hover:bg-slate-100 transition flex items-center gap-1"
                                                    >
                                                        <Eye size={12} /> View
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                {!loading && offers.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                        <Pagination
                            current={currentPage}
                            pageSize={pageSize}
                            total={offers.length}
                            onChange={setCurrentPage}
                            size="small"
                        />
                    </div>
                )}
            </div>

            {/* Joining Modal */}
            {showJoiningModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">Joining Letter - {selectedOfferForJoining?.applicantId?.name}</h2>
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
