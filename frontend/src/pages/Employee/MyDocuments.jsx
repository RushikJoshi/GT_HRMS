import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    FileText, Download, Eye, Search,
    Calendar, CheckCircle, Clock, ShieldCheck
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import { showToast } from '../../utils/uiNotifications';

export default function MyDocuments() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/letters/generated-letters'); // The controller already filters by tenant and optionally by status. I should ensure the backend also filters by current logged-in user if they are an employee.
            setDocuments(res.data.data);
        } catch (error) {
            console.error('Failed to fetch documents', error);
            showToast('error', 'Error', 'Failed to load your documents');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header Section with Glassmorphism */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl shadow-blue-500/20">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                    <ShieldCheck size={300} />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6 font-black text-[10px] uppercase tracking-[0.2em] text-white">
                        <ShieldCheck size={14} className="text-blue-200" /> Secure Document Vault
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-4 leading-tight">Your Official <span className="text-blue-200">Documents</span></h1>
                    <p className="text-blue-100/80 font-bold text-lg leading-relaxed">Access and download your official letters, certificates, and compliance documents issued by HR.</p>
                </div>
            </div>

            {/* Toolbar Area */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black" size={20} />
                    <input
                        type="text"
                        placeholder="Search documents by name..."
                        className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 focus:border-blue-500 rounded-2xl outline-none transition text-sm font-black uppercase tracking-tight shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 border-r border-slate-200 dark:border-slate-800">Showing {documents.length} items</span>
                    <button className="flex-1 sm:flex-none px-6 py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-300 transition border border-slate-200 dark:border-slate-700">
                        Sort by: Newest
                    </button>
                </div>
            </div>

            {/* Document Listing - Modern Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 animate-pulse" />
                    ))
                ) : documents.length === 0 ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6">
                            <FileText size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">No Documents Yet</h3>
                        <p className="text-slate-500 font-bold max-w-xs px-6">Any letters or documents issued to you will appear here automatically.</p>
                    </div>
                ) : (
                    documents.filter(doc => (doc.templateId?.name || doc.letterType).toLowerCase().includes(searchTerm.toLowerCase())).map((doc) => (
                        <div key={doc._id} className="group relative bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1">
                            {/* Card Content */}
                            <div className="flex justify-between items-start mb-8">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500 shadow-inner">
                                    <FileText size={28} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 border border-slate-200 dark:border-slate-700 shadow-sm">
                                        {doc.letterType}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-tight">
                                        <Calendar size={12} /> {formatDateDDMMYYYY(doc.createdAt)}
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                                {doc.templateId?.name || 'Official Letter'}
                            </h3>

                            <p className="text-sm font-bold text-slate-500 mb-8 line-clamp-2 leading-relaxed">
                                This is an official document issued for your record. Please keep it secure.
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => window.open(doc.pdfUrl, '_blank')}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 shadow-lg shadow-slate-900/10"
                                >
                                    <Eye size={16} /> View
                                </button>
                                <button
                                    className="flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-2xl font-black transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-blue-200"
                                    title="Download PDF"
                                >
                                    <Download size={18} />
                                </button>
                            </div>

                            {/* Hover Status Indicator */}
                            <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Available for download</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Assistance Section */}
            <div className="bg-white dark:bg-slate-800/50 rounded-[2.5rem] p-8 border-2 border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm flex items-center justify-center text-blue-600 border border-slate-100">
                        <Clock size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Missing something?</h4>
                        <p className="text-slate-500 font-bold">If you don't see a document you were expecting, please contact HR.</p>
                    </div>
                </div>
                <button className="px-8 py-4 bg-white dark:bg-slate-900 hover:shadow-xl rounded-2xl font-black text-xs uppercase tracking-[0.15em] text-slate-900 dark:text-white transition-all border border-slate-200 dark:border-slate-700">
                    Contact Document Support
                </button>
            </div>
        </div>
    );
}
