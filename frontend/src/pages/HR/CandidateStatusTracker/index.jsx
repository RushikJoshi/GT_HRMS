import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { Eye, Clock, User, Briefcase, Calendar, CheckCircle, XCircle, ChevronRight, RefreshCw, Database, Search, Filter } from 'lucide-react';
import dayjs from 'dayjs';

export default function CandidateStatusTracker() {
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const loadCandidates = async () => {
        setLoading(true);
        try {
            const res = await api.get('/hr/candidate-status');
            setCandidates(res.data || []);
        } catch (err) {
            console.error('[CANDIDATE_LOAD_ERR]', err);
            // alert('Failed to load candidates');
        } finally {
            setLoading(false);
        }
    };

    const seedSampleData = async () => {
        if (!confirm('This will seed sample candidates. Continue?')) return;
        setLoading(true);
        try {
            await api.post('/hr/candidate-status/seed');
            await loadCandidates();
        } catch (err) {
            console.error('[SEED_ERR]', err);
            alert('Failed to seed sample data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCandidates();
    }, []);

    const getStatusBadge = (status) => {
        const config = {
            'Applied': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: Clock },
            'Shortlisted': { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: CheckCircle },
            'Interview Scheduled': { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', icon: Calendar },
            'Selected': { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle },
            'Rejected': { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: XCircle },
        };
        const style = config[status] || { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', icon: Clock };
        const Icon = style.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${style.bg} ${style.color} ${style.border}`}>
                <Icon size={12} strokeWidth={2.5} />
                {status}
            </span>
        );
    };

    const getStageBadge = (stage) => {
        // Map raw stages to display labels
        let label = stage;
        let styleKey = 'Default';

        if (stage === 'Applied' || stage === 'New') {
            label = 'APPLICATION STAGE';
            styleKey = 'Application';
        } else if (stage === 'Shortlisted' || stage === 'Interview Scheduled' || stage === 'HR' || stage === 'Technical') {
            label = 'INTERVIEW STAGE';
            styleKey = 'Interview';
        } else if (stage === 'Selected' || stage === 'Offer Sent' || stage === 'Hired') {
            label = 'FINAL STAGE';
            styleKey = 'Final';
        } else if (stage === 'Rejected') {
            label = 'CLOSED';
            styleKey = 'Closed';
        }

        const styles = {
            'Application': 'text-blue-600 bg-blue-50 ring-blue-100',
            'Interview': 'text-orange-600 bg-orange-50 ring-orange-100',
            'Final': 'text-purple-600 bg-purple-50 ring-purple-100',
            'Closed': 'text-slate-500 bg-slate-50 ring-slate-200',
            'Default': 'text-slate-600 bg-slate-50 ring-slate-100'
        };

        return (
            <span className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest ring-1 ring-inset whitespace-nowrap ${styles[styleKey]}`}>
                {label}
            </span>
        );
    };

    const filteredCandidates = candidates.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.requirementTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 w-full mx-auto min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Candidate Status Tracker</h1>
                    <p className="text-slate-500 mt-2 flex items-center gap-2 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Real-time applicant progression monitoring
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={seedSampleData}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm font-semibold text-sm"
                    >
                        <Database size={18} className="text-slate-400" />
                        Seed Data
                    </button>
                    <button
                        onClick={loadCandidates}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-200 font-semibold text-sm active:scale-95"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh List
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                    { label: 'Total Tracked', count: candidates.length, color: 'blue', icon: User, gradient: 'from-blue-500 to-indigo-600' },
                    { label: 'In Interview', count: candidates.filter(c => c.currentStatus === 'Interview Scheduled').length, color: 'purple', icon: Calendar, gradient: 'from-purple-500 to-fuchsia-600' },
                    { label: 'Selected Candidates', count: candidates.filter(c => c.currentStatus === 'Selected').length, color: 'emerald', icon: CheckCircle, gradient: 'from-emerald-500 to-teal-600' },
                    { label: 'Rejected', count: candidates.filter(c => c.currentStatus === 'Rejected').length, color: 'rose', icon: XCircle, gradient: 'from-rose-500 to-pink-600' },
                ].map((stat, i) => (
                    <div key={i} className="relative overflow-hidden bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
                            <stat.icon size={64} className={`text-${stat.color}-600`} />
                        </div>
                        <div className="relative z-10">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{stat.label}</div>
                            <div className="flex items-end gap-2">
                                <div className={`text-4xl font-black text-slate-800`}>{stat.count}</div>
                                {stat.count > 0 && <span className={`text-xs font-bold text-${stat.color}-600 mb-1`}>+{(stat.count / (candidates.length || 1) * 100).toFixed(0)}%</span>}
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradient}`}></div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white border border-slate-200/60 overflow-hidden">
                {/* Toolbar */}
                <div className="p-5 border-b border-slate-100 bg-white flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
                    <div className="relative w-full md:w-96 group">
                        <input
                            type="text"
                            placeholder="Search by candidate or job role..."
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium group-hover:border-slate-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={18} className="absolute left-4 top-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 rounded-lg bg-slate-50 text-xs font-semibold text-slate-500 border border-slate-100">
                            Total Records: <span className="text-slate-900">{filteredCandidates.length}</span>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Role Applied</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Stage</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Applied On</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Timeline</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && candidates.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
                                            <p className="text-slate-400 font-medium text-sm">Loading tracker data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCandidates.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="bg-slate-50 p-4 rounded-full mb-2">
                                                <User size={32} className="text-slate-300" />
                                            </div>
                                            <p className="text-slate-800 font-bold">No candidates found</p>
                                            <p className="text-slate-500 text-sm">Try adjusting your search filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCandidates.map((candidate, idx) => (
                                    <tr key={candidate._id} className="group hover:bg-slate-50/80 transition-colors duration-200">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-100 ring-2 ring-white bg-gradient-to-br ${idx % 3 === 0 ? 'from-blue-500 to-indigo-600' :
                                                    idx % 3 === 1 ? 'from-violet-500 to-purple-600' : 'from-emerald-500 to-teal-600'
                                                    }`}>
                                                    {candidate.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors truncate max-w-[180px]" title={candidate.name}>
                                                        {candidate.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5 font-medium opacity-80 truncate max-w-[180px]" title={candidate.email}>
                                                        {candidate.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
                                                    <Briefcase size={14} />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">{candidate.requirementTitle}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {getStatusBadge(candidate.currentStatus)}
                                        </td>
                                        <td className="px-6 py-5">
                                            {getStageBadge(candidate.currentStage)}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded w-fit">
                                                <Calendar size={12} />
                                                {dayjs(candidate.createdAt).format('MMM DD, YYYY')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button
                                                onClick={() => navigate(`/hr/candidate-status/${candidate._id}`)}
                                                className="group/btn relative inline-flex items-center justify-center p-2 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
                                            >
                                                <span className="sr-only">View Details</span>
                                                <Eye size={20} className="group-hover/btn:scale-110 transition-transform" />
                                                <span className="absolute right-full mr-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    View Details
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
