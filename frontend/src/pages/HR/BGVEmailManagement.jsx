import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Mail, Search, Filter, Eye, RefreshCw, Send, Settings, FileText, ChevronRight, PlusSquare, Trash2, X, AlertCircle } from 'lucide-react';
import { showToast } from '../../utils/uiNotifications';
import BGVEmailTemplateModal from './BGV/BGVEmailTemplateModal';

const BGVEmailManagement = () => {
    const [activeTab, setActiveTab] = useState('logs');
    const [logs, setLogs] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedLog, setSelectedLog] = useState(null);
    const [showLogModal, setShowLogModal] = useState(false);

    useEffect(() => {
        if (activeTab === 'logs') {
            fetchLogs();
        } else {
            fetchTemplates();
        }
    }, [activeTab]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/bgv/email-history-global');
            setLogs(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await api.get('/bgv/email-templates');
            setTemplates(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInitializeTemplates = async () => {
        try {
            await api.post('/bgv/email-templates/initialize');
            showToast('success', 'Success', 'Default templates initialized');
            fetchTemplates();
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to initialize templates';
            showToast('error', 'Error', msg);
        }
    };

    const handleManage = (template) => {
        setSelectedTemplate(template);
        setShowModal(true);
    };

    const handleCreate = () => {
        setSelectedTemplate(null);
        setShowModal(true);
    };

    const handleModalSuccess = () => {
        setShowModal(false);
        fetchTemplates();
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm('Are you sure you want to remove this template? This cannot be undone.')) return;

        try {
            await api.delete(`/bgv/email-template/${id}`);
            showToast('success', 'Removed', 'Template has been deleted');
            fetchTemplates();
        } catch (err) {
            showToast('error', 'Error', 'Failed to remove template');
        }
    };

    const handleViewLog = (log) => {
        setSelectedLog(log);
        setShowLogModal(true);
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-inter">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                            <Mail className="text-white" size={28} />
                        </div>
                        BGV Email Management
                    </h1>
                    <p className="text-slate-600 font-medium mt-1">Manage email templates and monitor communication history</p>
                </div>
                <div className="flex items-center gap-3">
                    {activeTab === 'templates' && (
                        <>
                            {templates.length === 0 && (
                                <button
                                    onClick={handleInitializeTemplates}
                                    className="flex items-center gap-2 bg-slate-100 text-slate-700 font-bold px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 font-bold text-sm"
                                >
                                    <Settings size={18} />
                                    Initialize Defaults
                                </button>
                            )}
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wider"
                            >
                                <PlusSquare size={18} />
                                Create New Template
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 font-bold uppercase tracking-widest text-xs">
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-8 py-4 transition-all relative ${activeTab === 'logs' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Email Logs
                    {activeTab === 'logs' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-8 py-4 transition-all relative ${activeTab === 'templates' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Email Templates
                    {activeTab === 'templates' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}
                </button>
            </div>

            {activeTab === 'logs' ? (
                /* Logs Content */
                <div className="bg-white border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by recipient or subject..."
                                className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl outline-none font-bold text-slate-600 text-sm focus:border-blue-500"
                            >
                                <option value="ALL">All Status</option>
                                <option value="SENT">Sent</option>
                                <option value="FAILED">Failed</option>
                            </select>
                            <button
                                onClick={fetchLogs}
                                className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Refresh"
                            >
                                <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Recipient</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4">Sent At</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading && logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                                                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing communications...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-5 bg-slate-50 rounded-3xl">
                                                    <Mail className="text-slate-300" size={56} />
                                                </div>
                                                <div className="font-black text-slate-400 uppercase tracking-widest text-sm">No activity records found</div>
                                                <p className="text-slate-400 text-xs max-w-[240px] leading-relaxed">System logs for BGV-related emails will appear here automatically.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-blue-50/20 transition-all border-l-4 border-transparent hover:border-blue-500">
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${log.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' :
                                                    log.status === 'FAILED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-slate-800">{log.recipientEmail}</div>
                                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mt-0.5">{log.recipientType}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-xs text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded border border-blue-100">#{log.emailType}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-medium text-slate-600 line-clamp-1">{log.subject}</div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-xs font-bold text-slate-800">{new Date(log.sentAt || log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(log.sentAt || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => handleViewLog(log)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Templates Content */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading && templates.length === 0 ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                                <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Loading templates...</span>
                            </div>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="col-span-full py-24 bg-white rounded-3xl border-4 border-dashed border-slate-100 text-center flex flex-col items-center">
                            <div className="p-6 bg-slate-50 rounded-full mb-6">
                                <FileText className="text-slate-300" size={64} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Email Library Empty</h3>
                            <p className="text-slate-400 mt-2 max-w-sm mx-auto font-medium text-sm leading-relaxed px-8">
                                Standardize your BGV communications by creating templates for common verification events.
                            </p>
                            <div className="flex items-center gap-3 mt-8">
                                <button
                                    onClick={handleInitializeTemplates}
                                    className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                    <Settings size={16} />
                                    Initialize Defaults
                                </button>
                                <div className="text-slate-300 font-black italic">OR</div>
                                <button
                                    onClick={handleCreate}
                                    className="px-8 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <PlusSquare size={16} />
                                    Build Template
                                </button>
                            </div>
                        </div>
                    ) : (
                        templates.map((template) => (
                            <div key={template._id} className="bg-white rounded-3xl shadow-xl shadow-slate-100/50 border border-slate-200 hover:shadow-2xl hover:shadow-blue-100 transition-all group overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white group-hover:bg-blue-50/10 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 truncate pr-4">
                                            {template.emailType}
                                        </div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight line-clamp-1 group-hover:text-blue-700 transition-colors">
                                            {template.name}
                                        </h3>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-white group-hover:shadow-lg group-hover:shadow-blue-100 transition-all">
                                        <FileText size={22} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3 mb-6">
                                        {template.description}
                                    </p>
                                    <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version {template.version}</div>
                                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter w-fit ${template.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {template.isActive ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteTemplate(template._id)}
                                                className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Remove Template"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleManage(template)}
                                                className="px-5 py-2.5 bg-slate-50 hover:bg-blue-600 text-slate-600 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 group/btn border border-slate-100 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-200"
                                            >
                                                Manage <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Log Detail Modal */}
            {showLogModal && selectedLog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                            <div>
                                <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Communication Detail</div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Email Transmission Log</h2>
                            </div>
                            <button onClick={() => setShowLogModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</div>
                                    <div className={`text-sm font-black ${selectedLog.status === 'SENT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {selectedLog.status}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</div>
                                    <div className="text-sm font-black text-slate-900">#{selectedLog.emailType}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Recipient Info</div>
                                    <div className="p-4 border-2 border-slate-100 rounded-2xl flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl">
                                            {selectedLog.recipientEmail?.[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{selectedLog.recipientEmail}</div>
                                            <div className="text-xs text-slate-500 font-medium">Recipient Type: {selectedLog.recipientType}</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject</div>
                                    <div className="p-4 bg-slate-50 rounded-2xl font-bold text-slate-700">
                                        {selectedLog.subject}
                                    </div>
                                </div>

                                {selectedLog.failureReason && (
                                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                                        <AlertCircle className="text-rose-600 shrink-0" size={20} />
                                        <div>
                                            <div className="text-xs font-black text-rose-700 uppercase tracking-widest mb-1">Failure Reason</div>
                                            <div className="text-sm text-rose-600 font-medium">{selectedLog.failureReason}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setShowLogModal(false)}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                Close Log
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Modal */}
            {showModal && (
                <BGVEmailTemplateModal
                    template={selectedTemplate}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
};

export default BGVEmailManagement;

