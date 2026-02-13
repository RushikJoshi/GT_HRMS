import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    Eye,
    Edit2,
    Power,
    EyeOff,
    ExternalLink,
    Briefcase,
    Plus,
    Users,
    Activity,
    Mail,
    Lock,
    Building2,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Globe
} from 'lucide-react';
import companiesService from '../../services/companiesService';
import { API_ROOT } from '../../utils/api';

export default function CompanyList() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [revealPassword, setRevealPassword] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const data = await companiesService.getAllCompanies();
            setCompanies(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load companies', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (company) => {
        if (!window.confirm(`Are you sure you want to change the operational state for ${company.name}?`)) return;
        try {
            await companiesService.toggleCompanyStatus(company._id, company.status);
            fetchCompanies();
        } catch (error) {
            alert('Status update failed');
        }
    };

    const togglePassword = (id, e) => {
        e.stopPropagation();
        setRevealPassword(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getLogoUrl = (url) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_ROOT}${url}`;
    };

    const filteredCompanies = companies.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.meta?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage) || 1;
    const currentCompanies = filteredCompanies.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const stats = {
        total: companies.length,
        active: companies.filter(c => c.status === 'active').length,
        inactive: companies.filter(c => c.status !== 'active').length
    };

    // Updated Stats Cards Configuration with Gradients
    const statCardsConfig = [
        {
            label: 'Total Entities',
            value: stats.total,
            icon: Building2,
            gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600',
            shadow: 'shadow-indigo-200'
        },
        {
            label: 'Operational',
            value: stats.active,
            icon: Activity,
            gradient: 'bg-gradient-to-br from-emerald-400 to-teal-500',
            shadow: 'shadow-emerald-200'
        },
        {
            label: 'Deactivated',
            value: stats.inactive,
            icon: EyeOff,
            gradient: 'bg-gradient-to-br from-rose-500 to-orange-500',
            shadow: 'shadow-orange-200'
        },
    ];

    return (
        <div className="min-h-screen bg-[#F9FAFB] p-4 sm:p-6 lg:p-10 font-sans text-slate-900">
            <div className="w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-700">

                {/* Header Area */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
                                <Building2 size={22} />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Global Registry</h1>
                        </div>
                        <p className="text-sm text-slate-500 font-medium ml-1">Centralized surveillance and management of tenant organizations.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="p-1 bgColor-white border border-slate-200 rounded-2xl flex md:flex gap-1 shadow-sm w-full sm:w-auto overflow-hidden">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                List
                            </button>
                        </div>
                        <button
                            onClick={() => navigate('/super-admin/companies/add')}
                            className="w-full sm:w-auto bg-gradient-to-br from-emerald-500 to-teal-600 border-none hover:from-emerald-600 hover:to-teal-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 transition-all active:scale-95"
                        >
                            <Plus size={18} /> Onboard
                        </button>
                    </div>
                </div>

                {/* Quick Stats Grid - Updated Design */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {statCardsConfig.map((s, i) => (
                        <div key={i} className={`${s.gradient} relative overflow-hidden p-6 sm:p-8 rounded-2xl flex items-center justify-between shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md group`}>
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
                            <div className="absolute bottom-10 -left-10 w-24 h-24 bg-black/5 rounded-full blur-xl"></div>

                            <div className="relative z-10">
                                <p className="text-[9px] sm:text-[10px] font-bold text-white/90 uppercase tracking-widest mb-1">{s.label}</p>
                                <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight drop-shadow-sm">{s.value}</p>
                            </div>
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-110 transition-transform relative z-10 shrink-0">
                                <s.icon size={22} className="sm:hidden" />
                                <s.icon size={26} className="hidden sm:block" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-3.5 sm:py-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all font-medium text-slate-700 placeholder:text-slate-400 shadow-sm text-sm"
                        />
                    </div>
                    <button className="w-full md:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white border border-slate-200 rounded-xl text-[10px] font-extrabold uppercase tracking-widest text-slate-500 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
                        <Filter size={16} /> Filters
                    </button>
                </div>

                {/* View Content Switching */}
                {loading ? (
                    <div className="py-24 text-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-emerald-600 border-t-transparent mx-auto"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Registry...</p>
                    </div>
                ) : filteredCompanies.length === 0 ? (
                    <div className="py-20 sm:py-32 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
                        <Search size={40} className="mx-auto text-slate-100 mb-6" />
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">No Matches Found</h3>
                        <p className="text-slate-400 text-sm font-medium mt-2">Adjust your filters to find the specific entity.</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 pb-10">
                                {currentCompanies.map((c) => (
                                    <div
                                        key={c._id}
                                        onClick={() => navigate(`/super-admin/companies/view/${c._id}`)}
                                        className="group bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500">
                                                {c.meta?.logo ? (
                                                    <img src={getLogoUrl(c.meta.logo)} alt="Logo" className="w-full h-full object-contain p-2" />
                                                ) : (
                                                    <span className="text-2xl font-bold text-slate-300">{c.name?.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${c.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                <div className={`w-1 h-1 rounded-full ${c.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                                {c.status}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">{c.name}</h3>
                                                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">{c.code || 'NO-CODE'}</p>
                                            </div>

                                            <div className="space-y-2.5 pt-2">
                                                <div className="flex items-center gap-2.5 text-slate-500">
                                                    <Globe size={14} className="text-emerald-400 shrink-0" />
                                                    <span className="text-[11px] font-bold truncate">{c.domain || 'Not Setup'}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-slate-500">
                                                    <Mail size={14} className="text-rose-400 shrink-0" />
                                                    <span className="text-[11px] font-bold truncate">{c.meta?.email || 'No Email'}</span>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-50 flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/companies/edit/${c._id}`); }}
                                                    className="flex-1 py-2.5 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex items-center justify-center group/btn"
                                                >
                                                    <Edit2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(c); }}
                                                    className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center group/btn ${c.status === 'active' ? 'bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100'}`}
                                                >
                                                    <Power size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/companies/view/${c._id}`); }}
                                                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all flex items-center justify-center group/btn"
                                                >
                                                    <ArrowUpRight size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead className="bg-slate-50/50">
                                            <tr>
                                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap w-[30%]">Entity Organization</th>
                                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap w-[15%]">Identification</th>
                                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap w-[25%]">Digital Domain</th>
                                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap w-[15%]">Status</th>
                                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right whitespace-nowrap w-[15%]">Operations</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {currentCompanies.map((c) => (
                                                <tr key={c._id} className="group hover:bg-slate-50/30 transition-colors cursor-pointer" onClick={() => navigate(`/super-admin/companies/view/${c._id}`)}>
                                                    <td className="px-8 py-5 border-b border-slate-50 shrink-0">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                                                                {c.meta?.logo ? (
                                                                    <img src={getLogoUrl(c.meta.logo)} className="w-7 h-7 object-contain" alt="logo" />
                                                                ) : (
                                                                    <Building2 size={16} className="text-slate-300" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-800 leading-none mb-1 truncate max-w-[200px]">{c.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[200px]">{c.meta?.email || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 border-b border-slate-50">
                                                        <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-slate-100">{c.code || 'ORG'}</span>
                                                    </td>
                                                    <td className="px-8 py-5 border-b border-slate-50">
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <Globe size={14} className="text-emerald-400 shrink-0" />
                                                            <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{c.domain || 'Not Setup'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 border-b border-slate-50">
                                                        <div className={`w-fit px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-2 ${c.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-rose-50 text-rose-600 border border-rose-100/50'}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500 shadow-sm' : 'bg-rose-500'}`}></div>
                                                            {c.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 border-b border-slate-50 text-right">
                                                        <div className="flex items-center justify-end gap-1 overflow-hidden">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/companies/edit/${c._id}`); }}
                                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleToggleStatus(c); }}
                                                                className={`p-2 rounded-lg transition-all ${c.status === 'active' ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                            >
                                                                <Power size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/companies/view/${c._id}`); }}
                                                                className="p-2 text-slate-400 hover:bg-slate-900 hover:text-white rounded-lg transition-all"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-6 sm:pt-10 pb-12 sm:pb-20">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="flex-1 sm:flex-none p-3 sm:p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-all font-bold uppercase text-[9px] sm:text-[10px] tracking-widest flex items-center justify-center gap-2"
                        >
                            <ChevronLeft size={16} /> <span className="hidden sm:inline">Prev</span>
                        </button>
                        <div className="flex items-center gap-2 scrollbar-hide overflow-x-auto max-w-[200px] sm:max-w-none">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl text-[10px] sm:text-xs font-bold transition-all shrink-0 ${currentPage === i + 1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="flex-1 sm:flex-none p-3 sm:p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-all font-bold uppercase text-[9px] sm:text-[10px] tracking-widest flex items-center justify-center gap-2"
                        >
                            <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
