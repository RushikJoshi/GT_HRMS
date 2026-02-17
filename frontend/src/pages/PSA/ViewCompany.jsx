import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Mail,
    Globe,
    Calendar,
    CheckCircle2,
    Package,
    Edit3,
    Hash,
    Shield,
    Building2,
    User,
    Clock,
    Zap,
    LayoutGrid,
    CheckCircle,
    Activity,
    ShieldCheck,
    Briefcase,
    Settings
} from 'lucide-react';
import companiesService from '../../services/companiesService';
import { API_ROOT } from '../../utils/api';
import { enabledModulesToArray, normalizeEnabledModules } from '../../utils/moduleConfig';

export default function ViewCompany() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    const getLogoUrl = (url) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_ROOT}${url}`;
    };

    useEffect(() => {
        loadCompany();
    }, [id]);

    const loadCompany = async () => {
        try {
            setLoading(true);
            const data = await companiesService.getCompanyById(id);
            setCompany(data);
        } catch (error) {
            console.error('Failed to load company details', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB]">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Accessing Intelligence Registry...</p>
        </div>
    );

    if (!company) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] p-6 text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
                <Shield size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Access Denied</h2>
            <p className="text-slate-500 mb-8 max-w-xs">The requested entity could not be located within the current ecosystem registry.</p>
            <button
                onClick={() => navigate('/super-admin/companies')}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
            >
                Return to Registry
            </button>
        </div>
    );

    const activeModules = enabledModulesToArray(normalizeEnabledModules(company.enabledModules, company.modules));

    return (
        <div className="min-h-screen bg-[#F0F2F5] font-sans pb-12 sm:pb-20">
            {/* Immersive Header Backdrop */}
            <div className="h-32 sm:h-48 bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-emerald-500 rounded-full blur-[60px] sm:blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-teal-500 rounded-full blur-[60px] sm:blur-[100px] translate-x-1/2 translate-y-1/2"></div>
                </div>
            </div>

            <div className="w-full mx-auto px-4 sm:px-6 -mt-16 sm:-mt-24 space-y-6 sm:space-y-8 relative">

                {/* 1. Profile Hero Card */}
                <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-50 flex flex-col md:flex-row items-center md:items-center gap-6 sm:gap-10 text-center md:text-left">
                    <div className="relative group shrink-0">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-50 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105">
                            {company.meta?.logo ? (
                                <img src={getLogoUrl(company.meta.logo)} alt="Logo" className="w-full h-full object-contain p-4" />
                            ) : (
                                <span className="text-sm font-black text-slate-800">
                                    {activeModules.length}
                                </span>
                            )}
                        </div>
                        <div className={`absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border-4 border-white shadow-lg ${company.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                            {company.status === 'active' ? <Zap size={16} className="text-white" /> : <Shield size={16} className="text-white" />}
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 w-full">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                                    <button
                                        onClick={() => navigate('/super-admin/companies')}
                                        className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Profile</span>
                                </div>
                                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-4 truncate">{company.name}</h1>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-100">
                                        <Hash size={12} className="text-slate-300" /> {company.code || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-100">
                                        <Globe size={12} className="text-slate-300" /> {company.domain || 'no-domain'}
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-100">
                                        <Package size={12} /> {company.plan || 'Standard'} Plan
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate(`/super-admin/companies/edit/${company._id}`)}
                                className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-3.5 sm:py-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xl shadow-emerald-200 transition-all active:scale-95 shrink-0"
                            >
                                <Settings size={18} /> Manage Entity
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

                    {/* 2. Intelligence Details Section */}
                    <div className="lg:col-span-1 space-y-6 sm:space-y-8">
                        {/* Administrative Intelligence */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden">
                            <div className="p-6 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Personnel Intel</h3>
                                <ShieldCheck size={18} className="text-emerald-400" />
                            </div>
                            <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                                <div className="group">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Owner / Administrator</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
                                            <User size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 tracking-tight truncate">{company.meta?.ownerName || 'Unknown Entity'}</p>
                                            <p className="text-[10px] font-medium text-slate-400 truncate">{company.meta?.primaryEmail || 'No contact mail'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">System Identity (Login)</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
                                            <Mail size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-900 tracking-tight truncate">{company.meta?.email || 'N/A'}</p>
                                            <p className="text-[10px] font-medium text-slate-400">Main Backend Identifier</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Registry Timestamp</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 tracking-tight">
                                                {new Date(company.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                                <Clock size={10} /> {new Date(company.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Operational Status */}
                        <div className={`p-6 sm:p-8 rounded-2xl border shadow-sm flex items-center gap-6 ${company.status === 'active' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' : 'bg-rose-50/50 border-rose-100 text-rose-700'}`}>
                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${company.status === 'active' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-rose-600 text-white shadow-rose-200'}`}>
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">Current State</p>
                                <p className="text-lg sm:text-xl font-black tracking-tight">{company.status === 'active' ? 'FULLY OPERATIONAL' : 'SYSTEM RESTRICTED'}</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. Capability Grid (Modules) Section */}
                    <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-50 overflow-hidden h-full flex flex-col">
                            <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-wrap justify-between items-center bg-slate-50/30 gap-4">
                                <div className="flex items-center gap-3">
                                    <LayoutGrid size={18} className="text-slate-400" />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Capability Matrix</h3>
                                </div>
                                <div>
                                    <span className="px-3 py-1 bg-white border border-slate-200 text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
                                        {activeModules.length} Modules Active
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 sm:p-10 flex-1">
                                {activeModules.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        {activeModules.map((mod) => (
                                                <div key={mod} className="group relative p-5 sm:p-6 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all duration-300 flex items-center gap-4 sm:gap-5">
                                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-50 text-emerald-500 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-teal-500 group-hover:text-white transition-all duration-500 shadow-inner shrink-0">
                                                        <CheckCircle2 size={22} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm sm:text-lg font-bold text-slate-900 capitalize tracking-tight truncate">{mod === 'employeePortal' ? 'Employee Portal' : mod === 'hr' ? 'HR Management' : mod.replace('-', ' ')}</h4>
                                                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                                            <Activity size={10} /> Permission Active
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 px-6 sm:py-20 sm:px-10 border-2 border-dashed border-slate-100 rounded-2xl">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 transform rotate-12">
                                            <Package className="text-slate-200 w-8 h-8 sm:w-10 sm:h-10" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Zero Capabilities Detected</h3>
                                        <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-xs mx-auto mt-2">This entity has no active module subscriptions registered.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Note */}
                            <div className="p-6 sm:p-10 bg-slate-50/50 border-t border-slate-100 mt-auto">
                                <div className="flex items-start sm:items-center gap-4 text-slate-400">
                                    <Briefcase size={20} className="shrink-0 mt-1 sm:mt-0" />
                                    <p className="text-[11px] font-medium leading-relaxed italic">Intelligence data is synchronized with the main HRMS core. Any policy updates in the matrix will be reflected immediately.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
