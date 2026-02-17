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
    Users
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!company) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Company Not Found</h2>
            <button
                onClick={() => navigate('/super-admin/companies')}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold"
            >
                Back to List
            </button>
        </div>
    );

    const activeModules = enabledModulesToArray(normalizeEnabledModules(company.enabledModules, company.modules));

    return (
        <div className="min-h-screen bg-slate-50/30 p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
            <div className="w-full mx-auto space-y-6 sm:space-y-8">

                {/* 1. Page Header / Breadcrumb */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate('/super-admin/companies')}
                            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all hover:bg-slate-100"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-none">Company Profile</h1>
                            <p className="text-[12px] font-medium text-slate-400 mt-1.5 uppercase tracking-tight">View and manage tenant details</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/super-admin/companies/edit/${company._id}`)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                        <Edit3 size={15} /> Edit Company
                    </button>
                </div>

                {/* 2. Brand Summary Card */}
                <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="w-32 h-32 bg-white rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner shrink-0 scale-110">
                        {company.meta?.logo ? (
                            <img src={getLogoUrl(company.meta.logo)} alt="Logo" className="w-full h-full object-contain p-4" />
                        ) : (
                            <div className="text-4xl font-bold text-slate-200">{company.name?.charAt(0)}</div>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-4">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{company.name}</h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-400">
                                <span className="text-[14px] font-bold text-slate-300">#</span>
                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">{company.code || 'tss001'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Globe size={16} className="text-slate-300" />
                                <span className="text-[12px] font-bold text-slate-500">{company.domain || 'No domain configured'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0">
                        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/50">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[11px] font-extrabold uppercase tracking-[0.1em]">Active Subscription</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 pb-12">

                    {/* 3. Admin Contact Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Shield size={16} />
                            </div>
                            <h3 className="text-[13px] font-bold text-slate-800 tracking-tight">Admin Contact</h3>
                        </div>
                        <div className="p-10 space-y-10">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Primary Email</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-400">
                                        <Mail size={18} />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-600">{company.meta?.primaryEmail || company.meta?.email || 'N/A'}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Backup Email / Owner</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-purple-400">
                                        <Users size={18} />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-600">{company.meta?.ownerName || 'N/A'}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Created On</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-rose-400">
                                        <Calendar size={18} />
                                    </div>
                                    <span className="text-[13px] font-bold text-slate-600">
                                        {company.createdAt ? new Date(company.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Modules Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Box size={16} />
                                </div>
                                <h3 className="text-[13px] font-bold text-slate-800 tracking-tight">Subscribed Modules</h3>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan: {company.plan || 'FREE'}</span>
                        </div>
                        <div className="p-10 flex-1 flex flex-col items-center justify-center text-center">
                            {company.modules && company.modules.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    {company.modules.map((mod) => (
                                        <div key={mod} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 group hover:bg-white hover:border-emerald-200 transition-all">
                                            <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                                <CheckCircle2 size={18} />
                                            </div>
                                            <span className="text-[13px] font-bold text-slate-700 capitalize">{mod.replace(/-/g, ' ')}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="w-20 h-20 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-100 mx-auto">
                                        <Box size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-[16px] font-bold text-slate-800">No Modules Active</h4>
                                        <p className="text-[12px] font-medium text-slate-400 mt-2">This company has not subscribed to any modules yet.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
