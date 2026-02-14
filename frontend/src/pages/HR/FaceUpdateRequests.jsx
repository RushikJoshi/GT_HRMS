import React, { useState, useEffect } from 'react';
import {
    CheckCircle, XCircle, Clock, User, MessageSquare,
    Search, Loader2, AlertCircle, RefreshCcw
} from 'lucide-react';
import api from '../../utils/api';

const FaceUpdateRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rejectionModal, setRejectionModal] = useState({ show: false, requestId: null, reason: '' });

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/attendance/face/requests');
            setRequests(res.data.data);
        } catch (err) {
            console.error('Error fetching requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, status, rejectionReason = '') => {
        try {
            const res = await api.post('/attendance/face/action-request', {
                requestId,
                status,
                rejectionReason
            });
            if (res.data.success) {
                fetchRequests();
                setRejectionModal({ show: false, requestId: null, reason: '' });
            }
        } catch (err) {
            console.error('Error actioning request:', err);
            alert(err.response?.data?.message || 'Failed to update request status.');
        }
    };

    const filteredRequests = requests.filter(req =>
        `${req.employee?.firstName} ${req.employee?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.employee?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'used': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    if (loading && requests.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 w-full mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <RefreshCcw className="text-blue-600" />
                        Face Update Requests
                    </h1>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Review and approve employee face data updates</p>
                </div>
                <button
                    onClick={fetchRequests}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold text-sm uppercase"
                >
                    <RefreshCcw size={16} />
                    Refresh
                </button>
            </div>

            <div className="bg-white border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or employee ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Request Date</th>
                                <th className="px-6 py-4">Reason</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRequests.map((req) => (
                                <tr key={req._id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                {req.employee?.firstName?.[0]}{req.employee?.lastName?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{req.employee?.firstName} {req.employee?.lastName}</div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{req.employee?.employeeId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-600">{new Date(req.requestedAt).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-slate-400">{new Date(req.requestedAt).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs">
                                            <p className="text-sm text-slate-600 line-clamp-2 italic">\"{req.reason}\"</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {req.status === 'pending' ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleAction(req._id, 'approved')}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                                                    title="Approve"
                                                >
                                                    <CheckCircle size={20} />
                                                </button>
                                                <button
                                                    onClick={() => setRejectionModal({ show: true, requestId: req._id, reason: '' })}
                                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                                                    title="Reject"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Actioned</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                                <AlertCircle className="text-slate-300" size={32} />
                                            </div>
                                            <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">No matching requests found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rejection Modal */}
            {rejectionModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setRejectionModal({ show: false, requestId: null, reason: '' })}></div>
                    <div className="relative bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4">Reject Request</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Rejection Reason</label>
                                <textarea
                                    value={rejectionModal.reason}
                                    onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
                                    placeholder="Enter reason for rejection..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition h-32 resize-none font-medium"
                                ></textarea>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRejectionModal({ show: false, requestId: null, reason: '' })}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase text-xs transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleAction(rejectionModal.requestId, 'rejected', rejectionModal.reason)}
                                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold uppercase text-xs transition"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaceUpdateRequests;
