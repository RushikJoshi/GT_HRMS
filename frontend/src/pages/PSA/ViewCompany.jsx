import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Mail,
    Globe,
    Calendar,
    Edit3,
    Hash,
    Shield,
    Box,
    CheckCircle2,
    Users,
    Activity,
    Cpu,
    Settings,
    ChevronLeft,
    Zap,
    Layout
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
        <div className="min-h-[400px] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#14B8A6] rounded-full animate-spin"></div>
            <p className="mt-4 text-[13px] font-medium text-slate-400 animate-pulse">Loading node data...</p>
        </div>
    );

    if (!company) return (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Company Not Found</h2>
            <button
                onClick={() => navigate('/super-admin/companies')}
                className="px-6 py-2 bg-[#14B8A6] text-white rounded-xl font-bold text-[13px] uppercase tracking-wider"
            >
                Back to List
            </button>
        </div>
    );

    const activeModules = enabledModulesToArray(normalizeEnabledModules(company.enabledModules, company.modules));

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-700 font-['Inter',sans-serif] relative pb-10">
            {/* Premium Background Aura */}
            <div className="fixed -top-10 -right-10 w-[500px] h-[500px] bg-emerald-50/40 blur-[120px] rounded-full -z-10 animate-pulse"></div>
            <div className="fixed -bottom-10 -left-10 w-[400px] h-[400px] bg-teal-50/30 blur-[100px] rounded-full -z-10 animate-pulse delay-700"></div>

            {/* Top Toolbar */}
            <div className="flex items-center px-2">
                <button
                    onClick={() => navigate('/super-admin/companies')}
                    className="group flex items-center gap-2 px-5 h-11 bg-white border border-slate-100 text-slate-500 rounded-2xl text-[13px] font-medium hover:text-[#14B8A6] hover:border-[#14B8A6]/30 transition-all active:scale-95 shadow-sm"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Companies</span>
                </button>
            </div>

            {/* Hero Profile Card */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-8 transition-all duration-300 hover:shadow-sm relative overflow-hidden group mx-2">

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Logo Section */}
                        <div className="w-24 h-24 bg-white rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-4">
                            {company.meta?.logo ? (
                                <img src={getLogoUrl(company.meta.logo)} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-4xl font-bold text-slate-100">{company.name?.charAt(0)}</div>
                            )}
                        </div>

                        {/* Basic Info */}
                        <div className="flex-1 text-center md:text-left space-y-3">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-normal text-slate-800 tracking-tight leading-none group-hover:text-[#14B8A6] transition-colors">{company.name}</h2>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                                    <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-400">
                                        <Hash size={11} className="text-[#14B8A6]" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{company.code || 'tss001'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-3">
                        {/* Operational Badge */}
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl border ${company.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${company.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'} ${company.status === 'active' && 'animate-pulse'}`}></div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {company.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split Details View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-2 pb-10">
                {/* Admin Infrastructure Card */}
                <div className="bg-white border border-slate-100 rounded-[28px] p-6 space-y-4 hover:shadow-none transition-all duration-300">
                    <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-[#14B8A6]">
                            <Cpu size={18} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-[14px] font-bold text-slate-800 tracking-tight flex-1">Admin Contact</h3>
                    </div>

                    <div className="space-y-3">
                        <div className="group">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Primary Email</p>
                            <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-transparent transition-all group-hover:bg-white group-hover:border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-white shadow-none border border-slate-100 flex items-center justify-center text-slate-400">
                                    <Mail size={16} strokeWidth={1.5} />
                                </div>
                                <span className="text-[13px] font-normal text-slate-700">{company.meta?.primaryEmail || company.meta?.email || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="group">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Owner</p>
                            <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-transparent transition-all group-hover:bg-white group-hover:border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-white shadow-none border border-slate-100 flex items-center justify-center text-slate-400">
                                    <Users size={16} strokeWidth={1.5} />
                                </div>
                                <span className="text-[13px] font-normal text-slate-700">{company.meta?.ownerName || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="group">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Created On</p>
                            <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-transparent transition-all group-hover:bg-white group-hover:border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-white shadow-none border border-slate-100 flex items-center justify-center text-slate-400">
                                    <Calendar size={16} strokeWidth={1.5} />
                                </div>
                                <span className="text-[13px] font-normal text-slate-700">
                                    {company.createdAt ? new Date(company.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modules Card */}
                <div className="bg-white border border-slate-100 rounded-[28px] p-6 flex flex-col hover:shadow-none transition-all duration-300">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-[#14B8A6]">
                                <Box size={18} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">Modules</h3>
                        </div>
                    </div>

                    <div className="flex-1">
                        {activeModules && activeModules.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {activeModules.map((mod, idx) => (
                                    <div
                                        key={mod}
                                        className="flex items-center gap-2 p-3 rounded-xl border border-slate-50 bg-slate-50/40 group hover:bg-white hover:border-[#14B8A6]/20 transition-all duration-300"
                                        style={{ animationDelay: `${idx * 40}ms` }}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white shadow-none flex items-center justify-center text-[#14B8A6] group-hover:bg-[#14B8A6] group-hover:text-white transition-all">
                                            <CheckCircle2 size={14} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[12px] font-normal text-slate-700 capitalize tracking-tight leading-none">{mod.replace(/-/g, ' ')}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-10 space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-100">
                                    <Box size={32} strokeWidth={1} />
                                </div>
                                <div className="text-center">
                                    <h4 className="text-[14px] font-bold text-slate-800 tracking-tight">No Modules Active</h4>
                                    <p className="text-[12px] font-medium text-slate-400 mt-1 max-w-[200px]">This company has no enabled functional modules yet.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Floating Edit Button */}
            <div className="flex justify-center pt-4">
                <button
                    onClick={() => navigate(`/super-admin/companies/edit/${company._id}`)}
                    className="group relative flex items-center gap-3 px-10 h-12 bg-[#14B8A6] text-white rounded-2xl text-[14px] font-bold hover:bg-[#0D9488] transition-all active:scale-95 shadow-lg shadow-teal-100 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <Edit3 size={18} />
                    <span>Edit Profile</span>
                </button>
            </div>
        </div>
    );
}
