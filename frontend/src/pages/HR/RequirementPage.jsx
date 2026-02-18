import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import RequirementForm from '../../components/RequirementForm';
import { Plus, Layout, Settings2, Search, Table as TableIcon, LayoutGrid, ChevronRight, Briefcase, MapPin, Zap, Building2, Users, Eye, Edit3, CheckCircle, XCircle, X } from 'lucide-react';

export default function RequirementPage() {
    const navigate = useNavigate();
    const [requirements, setRequirements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openForm, setOpenForm] = useState(false);
    const [currentReq, setCurrentReq] = useState(null);
    const [openView, setOpenView] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });

    // Load List of Requirements
    async function loadRequirements(page = 1) {
        setLoading(true);
        try {
            const res = await api.get(`/requirements?page=${page}&limit=${pagination.limit}&search=${searchQuery}`);
            if (res.data.requirements) {
                setRequirements(res.data.requirements);
                setPagination(res.data.pagination);
            } else if (Array.isArray(res.data)) {
                setRequirements(res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRequirements(pagination.page);
    }, [pagination.page, searchQuery]);

    async function toggleStatus(id, currentStatus) {
        const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
        try {
            await api.patch(`/requirements/${id}/status`, { status: newStatus });
            loadRequirements(pagination.page);
        } catch (err) {
            console.error(err);
        }
    }

    function openNew() { navigate('/hr/create-requirement'); }
    function openFormBuilder() { navigate('/hr/apply-builder'); }

    function handleEdit(req) {
        setCurrentReq(req);
        setIsEditMode(true);
        setOpenForm(true);
    }

    function handleView(req) {
        setCurrentReq(req);
        setOpenView(true);
    }

    return (
        <div className="p-10 w-full animate-in fade-in duration-700 font-sans selection:bg-indigo-100 selection:text-indigo-600">
            {/* Ultra Modern Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        <Users size={12} /> Workforce Acquisition
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">
                        Recruitment <span className="text-indigo-600">Engine</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-lg max-w-xl leading-relaxed">
                        Orchestrate your hiring lifecycle, manage vacancies, and design seamless entry points for top talent.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-white p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-2">
                        <div className="flex items-center gap-3 px-6 py-2 border-r border-slate-100">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                <Plus size={24} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Positions</span>
                                <span className="text-xl font-black text-slate-900 leading-none">{pagination.total}</span>
                            </div>
                        </div>
                        <button
                            onClick={openFormBuilder}
                            className="flex items-center gap-3 px-6 py-3 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                        >
                            <Settings2 size={16} /> Customize Form
                        </button>
                        <button
                            onClick={openNew}
                            className="flex items-center gap-3 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-slate-200"
                        >
                            Launch Recruitment
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Filters and Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-white/50 backdrop-blur-md p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search positions, IDs or departments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-3.5 bg-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-3 bg-slate-100/50 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <TableIcon size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <LayoutGrid size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`grid gap-8 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                {loading ? (
                    <div className="col-span-full p-32 flex flex-col items-center justify-center gap-6 bg-white/50 backdrop-blur-xl rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20">
                        <div className="relative">
                            <div className="h-16 w-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Zap size={20} className="text-indigo-600 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-slate-900 font-black text-xs uppercase tracking-[0.3em] mb-2">Syncing Data</p>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Optimizing recruitment records...</p>
                        </div>
                    </div>
                ) : requirements.length === 0 ? (
                    <div className="col-span-full p-32 text-center bg-white/50 backdrop-blur-xl rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-col items-center">
                        <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-12 group hover:rotate-0 transition-transform duration-500">
                            <Briefcase size={40} className="text-indigo-600" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">No positions found.</h3>
                        <p className="text-slate-500 font-bold text-lg max-w-sm mx-auto mb-10 leading-relaxed">
                            It seems your recruitment engine is idle. Launch your first channel to attract top-tier talent.
                        </p>
                        <button
                            onClick={openNew}
                            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
                        >
                            Trigger New Recruitment
                        </button>
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] shadow-2xl shadow-slate-200/30 border border-white overflow-hidden border-slate-100">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference No.</th>
                                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Role & Function</th>
                                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Intake</th>
                                        <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow Status</th>
                                        <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Orchestration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {requirements.map(req => (
                                        <tr key={req._id} className="hover:bg-indigo-50/30 transition-all duration-300 group">
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-mono font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    {req.jobOpeningId || 'DRAFT'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-none mb-1">{req.jobTitle || req.title}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{req.department}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 font-black text-xs group-hover:scale-110 transition-transform">
                                                        {req.vacancy}
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Slots</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-4 py-1.5 text-[9px] font-black rounded-full uppercase tracking-widest border ${req.status === 'Open'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${req.status === 'Open' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleView(req)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Review Details">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => toggleStatus(req._id, req.status)} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Toggle Pipeline">
                                                        {req.status === 'Open' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                                    </button>
                                                    <div className="w-px h-6 bg-slate-100 mx-1"></div>
                                                    <button onClick={() => handleEdit(req)} className="p-2.5 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-lg hover:shadow-indigo-100" title="Modify Config">
                                                        <Edit3 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    requirements.map(req => (
                        <div key={req._id} className="bg-white/70 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-indigo-100/30 hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
                            {/* Decorative element */}
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>

                            <div className="relative">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-mono font-black tracking-widest">
                                        {req.jobOpeningId || 'NEW'}
                                    </div>
                                    <span className={`inline-flex items-center px-4 py-1.5 text-[9px] font-black rounded-full uppercase tracking-widest border ${req.status === 'Open'
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : 'bg-rose-50 text-rose-600 border-rose-100'
                                        }`}>
                                        {req.status}
                                    </span>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight tracking-tight mb-2">
                                        {req.jobTitle || req.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                                        <Building2 size={14} /> {req.department}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Target Intake</span>
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-indigo-600" />
                                            <span className="text-lg font-black text-slate-900">{req.vacancy} Position(s)</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Location</span>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-indigo-600" />
                                            <span className="text-sm font-black text-slate-900 truncate">{req.workMode}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleView(req)}
                                        className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye size={16} /> Details
                                    </button>
                                    <button
                                        onClick={() => handleEdit(req)}
                                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit3 size={16} /> Configure
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Premium Pagination */}
            {pagination.totalPages > 1 && (
                <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8 bg-white/50 backdrop-blur-xl p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Showing <span className="text-slate-900 font-black">{(pagination.page - 1) * pagination.limit + 1}</span> - <span className="text-slate-900 font-black">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-indigo-600 font-black">{pagination.total}</span> Recruitments
                    </p>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:shadow-lg disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronRight size={20} className="rotate-180" />
                        </button>

                        <div className="flex gap-2">
                            {[...Array(pagination.totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                                    className={`w-12 h-12 rounded-2xl font-black text-xs transition-all ${pagination.page === i + 1 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                            disabled={pagination.page === pagination.totalPages}
                            className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:shadow-lg disabled:opacity-30 transition-all active:scale-90"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {openForm && (
                <RequirementForm
                    initialData={currentReq}
                    isEdit={isEditMode}
                    isModal={true}
                    onClose={() => setOpenForm(false)}
                    onSuccess={() => loadRequirements(1)} // Reset to page 1 on new creation
                />
            )}

            {openView && currentReq && (
                <ViewRequirementModal
                    req={currentReq}
                    onClose={() => { setOpenView(false); setCurrentReq(null); }}
                />
            )}
        </div>
    );
}

function ViewRequirementModal({ req, onClose }) {
    if (!req) return null;

    const sections = [
        { label: 'Role Context', icon: Briefcase, value: req.jobTitle, sub: req.department },
        { label: 'Deployment', icon: MapPin, value: req.workMode, sub: req.jobType },
        { label: 'Capacity', icon: Users, value: `${req.vacancy} Position(s)`, sub: `Priority: ${req.priority}` },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-white rounded-[3rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.15)] w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden border border-white/20">
                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-indigo-100">
                            <Briefcase size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{req.jobTitle}</h2>
                                <span className="text-[10px] font-mono font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-lg border border-slate-200 uppercase tracking-widest">
                                    REF: {req.jobOpeningId || 'DRAFT'}
                                </span>
                            </div>
                            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                                <Building2 size={14} className="text-indigo-400" /> {req.department}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full transition-colors active:scale-90">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-12">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {sections.map((sec, i) => (
                            <div key={i} className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/30 transition-all duration-500">
                                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                                    <sec.icon size={20} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{sec.label}</p>
                                <p className="text-lg font-black text-slate-900 leading-tight mb-1">{sec.value}</p>
                                <p className="text-xs font-bold text-indigo-600/70">{sec.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Job Mission & Scope</h3>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">
                            {req.description || "No detailed description provided for this role."}
                        </div>
                    </div>

                    {/* Workflow Visualization */}
                    {(req.pipelineStages || req.workflow) && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Acquisition Pipeline</h3>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                {(req.pipelineStages && req.pipelineStages.length > 0
                                    ? ['Applied', ...req.pipelineStages.map(s => s.stageName), 'Finalized', 'Rejected']
                                    : req.workflow || ['Applied', 'Shortlisted', 'Interview', 'Finalized']).map((stage, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${stage === 'Applied' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                stage === 'Finalized' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' :
                                                    stage === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        'bg-white text-indigo-600 border-indigo-100 shadow-sm'
                                                }`}>
                                                {stage}
                                            </div>
                                            {i < ((req.pipelineStages?.length || 0) + 2) && (
                                                <div className="text-slate-200">
                                                    <ChevronRight size={20} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}


                    {/* Salary & More */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Bandwidth</h4>
                            <div className="text-2xl font-black text-slate-900 tracking-tighter">
                                {req.salaryMin && req.salaryMax ? `₹${Number(req.salaryMin).toLocaleString()} - ₹${Number(req.salaryMax).toLocaleString()}` : "Confidential"}
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Annual CTC Range</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience Prerequisite</h4>
                            <div className="text-2xl font-black text-slate-900 tracking-tighter">
                                {req.minExperienceMonths ? `${Math.floor(req.minExperienceMonths / 12)}Y ${req.minExperienceMonths % 12}M+` : "Fresher / Entry"}
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Industrial Exposure</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end sticky bottom-0 z-10">
                    <button onClick={onClose} className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95">
                        Dismiss View
                    </button>
                </div>
            </div>
        </div>
    );
}
