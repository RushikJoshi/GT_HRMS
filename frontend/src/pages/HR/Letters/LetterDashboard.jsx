import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import {
    FileText, Plus, Search, Filter, Mail, Eye, Download,
    CheckCircle, Clock, AlertCircle, FilePlus, ChevronRight, X,
    Trash2, RotateCcw, History
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../../utils/dateUtils';
import { showToast } from '../../../utils/uiNotifications';
import DocumentManagementPanel from '../../../components/DocumentManagementPanel';
import { useDocumentManagement } from '../../../hooks/useDocumentManagement';

export default function LetterDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalIssued: 0,
        pendingApprovals: 0,
        viewed: 0,
        sent: 0
    });
    const [recentLetters, setRecentLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLetterId, setSelectedLetterId] = useState(null);
    const [selectedLetter, setSelectedLetter] = useState(null);
    const userRole = localStorage.getItem('userRole') || 'employee';

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/letters/generated-letters');
            const letters = res.data.data;
            setRecentLetters(letters);

            // Calculate stats
            setStats({
                totalIssued: letters.length,
                pendingApprovals: letters.filter(l => l.status === 'pending').length,
                viewed: letters.filter(l => l.status === 'viewed').length,
                sent: letters.filter(l => l.status === 'sent').length
            });
        } catch (error) {
            console.error('Failed to fetch letters', error);
            showToast('error', 'Error', 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleLetterUpdated = (updatedLetter) => {
        setRecentLetters(recentLetters.map(l => l._id === updatedLetter._id ? updatedLetter : l));
        setSelectedLetter(updatedLetter);
        showToast('success', 'Success', 'Letter updated successfully');
    };

    const handleOpenManagement = (letter) => {
        setSelectedLetter(letter);
        setSelectedLetterId(letter._id);
    };

    const handleCloseManagement = () => {
        setSelectedLetterId(null);
        setSelectedLetter(null);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'viewed': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 w-full mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Document Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1">Generate, track, and manage official HR documents</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => navigate('/hr/letters/templates')}
                        className="px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-black text-sm uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2"
                    >
                        <FileText size={18} /> Manage Templates
                    </button>
                    <button
                        onClick={() => navigate('/hr/letters/issue')}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} /> Issue New Letter
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Issued', value: stats.totalIssued, icon: FileText, color: 'blue' },
                    { label: 'Pending Approval', value: stats.pendingApprovals, icon: Clock, color: 'amber' },
                    { label: 'Sent to Recipients', value: stats.sent, icon: Mail, color: 'emerald' },
                    { label: 'Viewed by Recipient', value: stats.viewed, icon: Eye, color: 'purple' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition shadow-sm group">
                        <div className={`w-12 h-12 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                            <stat.icon className={`text-${stat.color}-600 dark:text-${stat.color}-400`} size={24} />
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mb-1 tracking-tighter">{stat.value}</div>
                        <div className="text-xs font-black text-slate-500 uppercase tracking-widest">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Recent Letters</h2>
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or id..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition text-sm font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Issued</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold">Loading...</td>
                                </tr>
                            ) : recentLetters.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold">No letters issued yet.</td>
                                </tr>
                            ) : recentLetters.filter(l =>
                                (l.employeeId?.firstName + ' ' + l.employeeId?.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
                                l.templateId?.name.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((letter) => (
                                <tr key={letter._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-black text-blue-600 dark:text-blue-400 text-xs shadow-inner">
                                                {letter.employeeId?.firstName?.[0]}{letter.employeeId?.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{letter.employeeId?.firstName} {letter.employeeId?.lastName}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{letter.employeeId?.employeeId || 'NO ID'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-slate-400" />
                                            <span className="font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-tight">{letter.templateId?.name || letter.letterType}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-tight">
                                        {formatDateDDMMYYYY(letter.createdAt)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${getStatusStyle(letter.status)} shadow-sm`}>
                                            {letter.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                            <button
                                                onClick={() => handleOpenManagement(letter)}
                                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-purple-500 hover:text-white transition"
                                                title="Manage"
                                            >
                                                <History size={16} />
                                            </button>
                                            <button
                                                onClick={() => window.open(letter.pdfUrl, '_blank')}
                                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-blue-500 hover:text-white transition"
                                                title="View"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-emerald-500 hover:text-white transition"
                                                title="Download"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Approval Workflow Teaser (If pending letters exist) */}
            {stats.pendingApprovals > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-amber-900 dark:text-amber-400 uppercase tracking-tighter">Approval Required</h3>
                            <p className="font-bold text-amber-700 dark:text-amber-500 text-sm">You have {stats.pendingApprovals} letters waiting for your review.</p>
                        </div>
                    </div>
                    <button className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition shadow-lg shadow-amber-500/20">
                        View Pending Tasks
                    </button>
                </div>
            )}

            {/* Document Management Modal/Panel */}
            {selectedLetterId && selectedLetter && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-start justify-end overflow-y-auto pt-4">
                    {/* Close on background click */}
                    <div
                        className="absolute inset-0 cursor-pointer"
                        onClick={handleCloseManagement}
                    />

                    {/* Side Panel */}
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-l-3xl shadow-2xl ml-4 mr-0 my-4 overflow-y-auto max-h-[calc(100vh-2rem)]">
                        {/* Close Button */}
                        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 flex justify-between items-center z-10">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                Letter Management
                            </h2>
                            <button
                                onClick={handleCloseManagement}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            >
                                <X size={24} className="text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* Document Management Panel */}
                        <div className="p-6">
                            <DocumentManagementPanel
                                letter={selectedLetter}
                                userRole={userRole}
                                onLetterUpdated={handleLetterUpdated}
                                showAuditTrail={true}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
