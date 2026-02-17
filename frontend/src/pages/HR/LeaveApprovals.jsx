import React, { useState, useEffect } from 'react';
import { Pagination, notification } from 'antd';
import api from '../../utils/api';
import { Check, X, Eye, ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle, XCircle, FileText, Filter } from 'lucide-react';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../utils/dateUtils';

export default function LeaveApprovals({
    isManagerView = false,
    endpoint = '/hr/leaves/requests',
    actionEndpoint = '/hr/leaves/requests'
}) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    // Modals state
    const [viewReason, setViewReason] = useState(null); // content string or null
    const [actionModal, setActionModal] = useState(null); // { id, type } or null
    const [remark, setRemark] = useState('');

    useEffect(() => {
        fetchRequests(pagination.page);
    }, [pagination.page, endpoint]);

    const fetchRequests = async (page = 1) => {
        setLoading(true);
        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            const res = await api.get(`${endpoint}${separator}page=${page}&limit=${pagination.limit}`);
            if (res.data.data) {
                // New format with pagination
                setRequests(res.data.data);
                setPagination(prev => ({ ...prev, ...res.data.meta }));
            } else {
                // Fallback for old API if something goes wrong or returns array
                setRequests(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleActionSubmit = async () => {
        if (!actionModal) return;
        if (!remark.trim()) {
            notification.error({ message: 'Error', description: "Remark is mandatory.", placement: 'topRight' });
            return;
        }

        try {
            const body = { remark, rejectionReason: remark };
            await api.post(`${actionEndpoint}/${actionModal.id}/${actionModal.type}`, body);
            notification.success({
                message: 'Success',
                description: `Request ${actionModal.type === 'approve' ? 'Approved' : 'Rejected'} Successfully`,
                placement: 'topRight'
            });
            setActionModal(null);
            setRemark('');
            fetchRequests(pagination.page);
        } catch (err) {
            notification.error({
                message: 'Action Failed',
                description: err.response?.data?.error || "An error occurred",
                placement: 'topRight'
            });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'text-emerald-700 bg-emerald-50 border-emerald-200 ring-emerald-200/50';
            case 'Rejected': return 'text-rose-700 bg-rose-50 border-rose-200 ring-rose-200/50';
            default: return 'text-amber-700 bg-amber-50 border-amber-200 ring-amber-200/50';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Stats */}
            {!isManagerView && (
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                            Leave Requests
                        </h1>
                        <p className="text-sm text-slate-500">
                            Review and manage employee leave applications.
                        </p>
                    </div>

                    {/* Stats Cards Layout (Compact) */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-shrink-0 min-w-[500px]">
                        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20 flex flex-col justify-between h-24">
                            <div className="relative z-10">
                                <div className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">Total Requests</div>
                                <div className="text-2xl font-bold mt-1">{pagination.total}</div>
                            </div>
                            <FileText className="absolute right-[-10px] bottom-[-10px] text-white opacity-10" size={60} />
                        </div>

                        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg shadow-amber-500/20 flex flex-col justify-between h-24">
                            <div className="relative z-10">
                                <div className="text-amber-100 text-[10px] font-bold uppercase tracking-wider">Pending Action</div>
                                <div className="text-2xl font-bold mt-1">
                                    {requests.filter(r => r.status === 'Pending').length}
                                    <span className="text-xs font-normal opacity-70 ml-1">on this page</span>
                                </div>
                            </div>
                            <Clock className="absolute right-[-10px] bottom-[-10px] text-white opacity-10" size={60} />
                        </div>

                        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between h-24">
                            <div className="relative z-10">
                                <div className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Approved</div>
                                <div className="text-2xl font-bold mt-1">
                                    {requests.filter(r => r.status === 'Approved').length}
                                    <span className="text-xs font-normal opacity-70 ml-1">on this page</span>
                                </div>
                            </div>
                            <CheckCircle className="absolute right-[-10px] bottom-[-10px] text-white opacity-10" size={60} />
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Table Header/Toolbar */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-semibold text-slate-700">All Applications</h3>
                    <div className="flex gap-2">
                        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                            <Filter size={16} />
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="table-responsive mobile-card-hide">

                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                            <table className="min-w-[900px] w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-3 font-semibold text-slate-500 w-[20%]">Employee</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 w-[12%]">Type</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 w-[20%]">Dates</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 w-[10%]">Duration</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 text-center w-[12%]">Reason</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 w-[14%]">Status</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 text-right w-[12%]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="7" className="p-10 text-center text-slate-400">Loading requests...</td></tr>
                                    ) : requests.length === 0 ? (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500">No leave requests found.</td></tr>
                                    ) : (
                                        requests.map(req => (
                                            <tr key={req._id} className="hover:bg-slate-50 transition duration-200">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white border border-blue-200 shadow-sm">
                                                            {req.employee?.firstName?.[0] || 'U'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-900 truncate">
                                                                {req.employee?.firstName} {req.employee?.lastName}
                                                            </div>
                                                            <div className="text-xs text-slate-500 truncate" title={req.employee?.email}>{req.employee?.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-700">{req.leaveType}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-700">
                                                            {formatDateDDMMYYYY(req.startDate)} - {formatDateDDMMYYYY(req.endDate)}
                                                        </span>
                                                        {req.isHalfDay && (
                                                            <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 w-fit px-1.5 rounded mt-0.5">
                                                                Half-Day
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                                                        {req.daysCount} Day{req.daysCount !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => setViewReason(req.reason)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 text-xs font-medium transition"
                                                    >
                                                        <Eye size={14} /> View
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ring-1 ring-inset shadow-sm ${getStatusColor(req.status)}`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {req.status === 'Pending' ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => { setActionModal({ id: req._id, type: 'approve' }); setRemark(''); }}
                                                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition shadow-sm"
                                                                title="Approve"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => { setActionModal({ id: req._id, type: 'reject' }); setRemark(''); }}
                                                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition shadow-sm"
                                                                title="Reject"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                                {req.status}
                                                            </span>
                                                            {req.actionDateTime && (
                                                                <span className="text-[10px] text-slate-400">
                                                                    {formatDateTimeDDMMYYYY(req.actionDateTime).split(' ')[0]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View (<= 480px) */}
                        <div className="mobile-card-show bg-slate-50/50 divide-y divide-slate-200">
                            {loading ? (
                                <div className="p-10 text-center text-slate-500">Loading...</div>
                            ) : requests.length === 0 ? (
                                <div className="p-10 text-center text-slate-500">No leave requests found.</div>
                            ) : (
                                requests.map(req => (
                                    <div key={req._id} className="p-4 bg-white space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                    {req.employee?.firstName?.[0] || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{req.employee?.firstName} {req.employee?.lastName}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{req.leaveType}</div>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${getStatusColor(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                                            <div>
                                                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Duration</div>
                                                <div className="text-xs font-semibold text-slate-700">
                                                    {formatDateDDMMYYYY(req.startDate)} - {formatDateDDMMYYYY(req.endDate)}
                                                    <span className="ml-1 text-blue-600">({req.daysCount} d)</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Reason</div>
                                                <button
                                                    onClick={() => setViewReason(req.reason)}
                                                    className="text-xs text-blue-600 font-bold hover:underline"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </div>

                                        {req.status === 'Pending' ? (
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => { setActionModal({ id: req._id, type: 'approve' }); setRemark(''); }}
                                                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    <Check size={14} /> APPROVE
                                                </button>
                                                <button
                                                    onClick={() => { setActionModal({ id: req._id, type: 'reject' }); setRemark(''); }}
                                                    className="flex-1 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                                                >
                                                    <X size={14} /> REJECT
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-slate-500 italic text-center py-1 bg-slate-50 rounded">
                                                Processed {req.actionDateTime && `on ${formatDateTimeDDMMYYYY(req.actionDateTime)}`} {req.actionBy && `by ${req.actionBy.firstName}`}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end bg-slate-50 dark:bg-slate-900/50">
                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                                <Pagination
                                    current={pagination.page}
                                    pageSize={pagination.limit}
                                    total={pagination.total}
                                    onChange={(page) => setPagination(prev => ({ ...prev, page }))}
                                    showSizeChanger={false}
                                    hideOnSinglePage
                                    size="small"
                                />
                            </div>
                        </div>

                        {/* View Reason Modal */}
                        {viewReason !== null && (
                            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                        <h3 className="text-lg font-bold text-slate-800">Leave Reason</h3>
                                        <button onClick={() => setViewReason(null)} className="text-slate-400 hover:text-slate-600 transition">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 min-h-[100px] whitespace-pre-wrap border border-slate-100 font-medium leading-relaxed">
                                        {viewReason || "No reason provided by the employee."}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button onClick={() => setViewReason(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium transition shadow-sm">
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Confirmation Modal */}
                        {actionModal && (
                            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex flex-col items-center mb-5 text-center">
                                        <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 shadow-sm ${actionModal.type === 'approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {actionModal.type === 'approve' ? <Check size={28} /> : <AlertCircle size={28} />}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 capitalize">
                                            {actionModal.type} Request
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-2 px-2 leading-relaxed">
                                            Are you sure you want to <strong>{actionModal.type}</strong> this leave request? This action cannot be undone.
                                        </p>
                                    </div>

                                    <div className="mb-5">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                                            Admin Remark <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            value={remark}
                                            onChange={(e) => setRemark(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[100px] resize-none outline-none transition"
                                            placeholder="Enter reason or remarks..."
                                            autoFocus
                                        ></textarea>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setActionModal(null)}
                                            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleActionSubmit}
                                            className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all transform active:scale-95 ${actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                                        >
                                            Confirm {actionModal.type === 'approve' ? 'Approval' : 'Rejection'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

