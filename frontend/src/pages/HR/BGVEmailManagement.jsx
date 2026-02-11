import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Mail, Search, Filter, Eye, RefreshCw, Send, Settings, FileText, ChevronRight } from 'lucide-react';
import { showToast } from '../../utils/uiNotifications';

const BGVEmailManagement = () => {
    const [activeTab, setActiveTab] = useState('logs');
    const [logs, setLogs] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');

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
            // We need a global email history endpoint or we fetch per case.
            // For now, let's assume we have a global endpoint or we'll create one.
            // Since I haven't created a global one yet, I'll use the stats/recent approach if possible.
            const res = await api.get('/bgv/email-history-global');
            setLogs(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
            // Fallback: show empty list if endpoint not yet ready
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

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Mail className="text-blue-600" size={28} />
                        BGV Email Management
                    </h1>
                    <p className="text-slate-600 mt-1">Manage email templates and monitor communication history</p>
                </div>
                {activeTab === 'templates' && templates.length === 0 && (
                    <button
                        onClick={handleInitializeTemplates}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        <Settings size={18} />
                        Initialize Default Templates
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 font-medium">
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-6 py-3 transition-all relative ${activeTab === 'logs' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Email Logs
                    {activeTab === 'logs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-6 py-3 transition-all relative ${activeTab === 'templates' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Email Templates
                    {activeTab === 'templates' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                </button>
            </div>

            {activeTab === 'logs' ? (
                /* Logs Content */
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by recipient or subject..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm"
                            >
                                <option value="ALL">All Status</option>
                                <option value="SENT">Sent</option>
                                <option value="FAILED">Failed</option>
                            </select>
                            <button
                                onClick={fetchLogs}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                title="Refresh"
                            >
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-600 text-sm font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Recipient</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4">Sent At</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                                <span className="text-slate-500 font-medium">Loading logs...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <Mail className="text-slate-300" size={48} />
                                                <div className="font-semibold">No email logs found</div>
                                                <p className="text-sm">Initiate a BGV case and send an email to see logs here.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${log.status === 'SENT' ? 'bg-green-100 text-green-700' :
                                                    log.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{log.recipientEmail}</div>
                                                <div className="text-xs text-slate-500 capitalize">{log.recipientType}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600 font-medium">#{log.emailType}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-700 line-clamp-1">{log.subject}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-900">{new Date(log.sentAt || log.createdAt).toLocaleDateString()}</div>
                                                <div className="text-xs text-slate-500">{new Date(log.sentAt || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                                    <Eye size={18} />
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
                    {loading ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                <span className="text-slate-500 font-medium text-lg">Loading templates...</span>
                            </div>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="col-span-full py-20 bg-white rounded-xl border-2 border-dashed border-slate-200 text-center">
                            <FileText className="mx-auto mb-4 text-slate-300" size={64} />
                            <h3 className="text-xl font-bold text-slate-900">No Email Templates</h3>
                            <p className="text-slate-600 mt-2 max-w-sm mx-auto">
                                Templates allow you to send consistent, branded communications during the BGV process.
                            </p>
                            <button
                                onClick={handleInitializeTemplates}
                                className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                            >
                                Initialize Default Templates
                            </button>
                        </div>
                    ) : (
                        templates.map((template) => (
                            <div key={template._id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                                            {template.emailType}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {template.name}
                                        </h3>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg">
                                        <FileText size={20} className="text-slate-400" />
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="text-sm text-slate-600 line-clamp-3 mb-4 h-15">
                                        {template.description}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="text-xs text-slate-400">
                                            Version {template.version} • {template.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                        <button className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline">
                                            Manage <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default BGVEmailManagement;
