import React, { useEffect, useState } from "react";
import { Pagination, Modal, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from "../../utils/api";
import CompanyForm from "./CompanyForm";
import CompanyView from "./CompanyView";
import {
    Building2,
    Mail,
    Search,
    Plus,
    Filter,
    Zap,
    Eye,
    EyeOff,
    Edit2,
    Settings,
    LayoutGrid,
    Users,
    Activity,
    Lock,
    ArrowUpRight,
    TrendingUp,
    ShieldCheck,
    Cpu
} from 'lucide-react';
import companiesService from '../../services/companiesService';

// --- Sub-component: Password Prompt Modal ---
const PasswordPromptModal = ({ open, onClose, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (!password) return message.warning('Please enter your Super Admin password');
        setLoading(true);
        try {
            await companiesService.verifyPsaPassword(password);
            message.success('Identity verified');
            setPassword('');
            onSuccess();
        } catch (err) {
            message.error(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={<div className="flex items-center gap-2"><ShieldCheck className="text-blue-600" size={20} /> Identity Verification Required</div>}
            open={open}
            onCancel={() => { setPassword(''); onClose(); }}
            onOk={handleVerify}
            confirmLoading={loading}
            okText="Verify & Proceed"
            cancelText="Cancel"
            okButtonProps={{ className: 'bg-blue-600' }}
        >
            <div className="py-4 space-y-3">
                <p className="text-sm text-slate-500">For security reasons, please enter your **Super Admin** password to reveal company credentials.</p>
                <Input.Password
                    placeholder="Enter Super Admin Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onPressEnter={handleVerify}
                    autoFocus
                />
            </div>
        </Modal>
    );
};

// --- Sub-component: Change Password Modal ---
const ChangePasswordModal = ({ open, company, onClose }) => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!password) return message.warning('Enter new password');
        if (password !== confirm) return message.error('Passwords do not match');
        if (password.length < 6) return message.warning('Password should be at least 6 characters');

        setLoading(true);
        try {
            await companiesService.updateCompanyPassword(company._id, password);
            message.success(`Password for ${company.name} updated successfully`);
            setPassword('');
            setConfirm('');
            onClose(true);
        } catch (err) {
            message.error(err.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={<div className="flex items-center gap-2"><Key className="text-emerald-600" size={20} /> Reset Company Password</div>}
            open={open}
            onCancel={() => { setPassword(''); setConfirm(''); onClose(); }}
            onOk={handleUpdate}
            confirmLoading={loading}
            okText="Update Password"
            okButtonProps={{ className: 'bg-emerald-600' }}
        >
            <div className="py-4 space-y-4">
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-3">
                    <AlertCircle className="text-amber-600 shrink-0" size={18} />
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                        Setting a new password will immediately override the current one for <strong>{company?.name}</strong>.
                        Inform the client after the change.
                    </p>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">New Password</label>
                    <Input.Password
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Confirm Password</label>
                    <Input.Password
                        placeholder="Re-type new password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        onPressEnter={handleUpdate}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default function CompanyList() {
    const [companies, setCompanies] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [openForm, setOpenForm] = useState(false);
    const [selected, setSelected] = useState(null);

    const [openView, setOpenView] = useState(false);
    const [revealMap, setRevealMap] = useState({});

    // Security states
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [pendingRevealId, setPendingRevealId] = useState(null);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [targetCompany, setTargetCompany] = useState(null);

    const navigate = useNavigate();
    const API_BASE = import.meta.env.VITE_API_BASE || 'https://hrms.gitakshmi.com/api';
    const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

    async function load() {
        try {
            const data = await companiesService.getAllCompanies();
            setCompanies(Array.isArray(data) ? data : []);
        } catch (err) {
            console.log(err);
        }
    }

    useEffect(() => {
        (async () => {
            await load();
            setCurrentPage(1);
        })();
    }, []);

    // compute current page slice for rendering
    const start = (currentPage - 1) * pageSize;
    const paged = companies.slice(start, start + pageSize);

    async function toggleActive(company) {
        if (!window.confirm(`Are you sure you want to change the operational state for ${company.name}?`)) return;
        try {
            await companiesService.toggleCompanyStatus(company._id, company.status);
            load();
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    }

    function handleToggleReveal(id) {
        // If already revealed, we can hide without verification
        if (revealMap[id]) {
            setRevealMap(prev => ({ ...prev, [id]: false }));
            return;
        }

        // To reveal, we need verification
        setPendingRevealId(id);
        setShowVerifyModal(true);
    }

    function onVerifySuccess() {
        if (pendingRevealId) {
            setRevealMap(prev => ({ ...prev, [pendingRevealId]: true }));
        }
        setShowVerifyModal(false);
        setPendingRevealId(null);
    }

    // Calculate stats for local summary cards
    const stats = {
        total: companies.length,
        active: companies.filter(c => c.status === 'active').length,
        inactive: companies.filter(c => c.status !== 'active').length
    };

    const statsCards = [
        {
            label: 'TOTAL COMPANIES',
            value: stats.total,
            icon: LayoutGrid,
            bg: 'bg-[#00C292]',
        },
        {
            label: 'ACTIVE COMPANIES',
            value: stats.active,
            icon: Zap,
            bg: 'bg-[#7047EB]',
        },
        {
            label: 'INACTIVE COMPANIES',
            value: stats.inactive,
            icon: Activity,
            bg: 'bg-[#FF5C8D]',
        },
    ];

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-700 font-['Inter',sans-serif] relative pb-10">
            {/* Premium Background Aura */}
            <div className="fixed -top-20 -right-20 w-[500px] h-[500px] bg-emerald-50/40 blur-[150px] rounded-full -z-10 animate-pulse"></div>
            <div className="fixed -bottom-20 -left-20 w-[400px] h-[400px] bg-teal-50/30 blur-[130px] rounded-full -z-10 animate-pulse delay-1000"></div>


            {/* Local Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
                {statsCards.map((card, idx) => (
                    <div key={idx} className={`${card.bg} p-6 rounded-[32px] shadow-lg shadow-slate-200/20 hover:-translate-y-1 transition-all duration-500 group flex flex-col justify-between h-40 text-white relative overflow-hidden cursor-default`}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-2xl rounded-full -mr-8 -mt-8"></div>

                        <div className="flex justify-between items-start relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                                <card.icon size={18} strokeWidth={2} />
                            </div>
                            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] opacity-30">
                                ID-0{idx + 1}
                            </p>
                        </div>

                        <div className="space-y-0.5 relative z-10">
                            <p className="text-[9px] font-semibold text-white/50 uppercase tracking-[0.2em]">{card.label}</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-semibold tracking-tight leading-none">{card.value}</span>
                                <span className="text-[10px] font-semibold opacity-40 uppercase tracking-widest">Units</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Bar - Relocated Button */}
            <div className="flex justify-end px-2 pt-2">
                <button
                    onClick={() => { setSelected(null); setOpenForm(true); }}
                    className="group relative flex items-center gap-3 px-8 h-12 bg-[#14B8A6] text-white rounded-2xl text-[13px] font-bold uppercase tracking-widest hover:bg-[#0D9488] transition-all active:scale-95 shadow-lg shadow-emerald-500/20 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <Plus size={18} strokeWidth={3} />
                    <span>Add New Company</span>
                </button>
            </div>

            {/* Search Bar - Compressed */}
            <div className="relative group mx-2">
                <div className="relative flex items-center h-16 bg-white border border-slate-200/60 rounded-[24px] px-6 shadow-none focus-within:border-[#14B8A6]/40 transition-all duration-300">
                    <Search className="text-slate-400 group-focus-within:text-[#14B8A6] transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search tenants..."
                        className="flex-1 bg-transparent px-4 border-none focus:outline-none focus:ring-0 text-[15px] text-slate-700 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Content Table Card (Full Width) */}
            <div className="w-full min-w-[1000px] space-y-1">
                {/* Modern Table Header */}
                <div className="flex items-center px-10 py-4 bg-slate-50/50 rounded-xl mx-2 border border-slate-100/50">
                    <div className="w-[30%] text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Building2 size={12} className="text-[#14B8A6]" />
                        Company Branding
                    </div>
                    <div className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Cpu size={12} className="text-[#14B8A6]" />
                        Client Code
                    </div>
                    <div className="w-[25%] text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Lock size={12} className="text-[#14B8A6]" />
                        Access Credentials
                    </div>
                    <div className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity size={12} className="text-[#14B8A6]" />
                        Operational State
                    </div>
                    <div className="w-[15%] text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Management
                    </div>
                </div>

                {/* Table Body */}
                <div className="space-y-2 px-2 pt-1">
                    {paged.map((c, idx) => (
                        <div
                            key={c._id || idx}
                            className="group relative flex items-center px-10 py-4 bg-white border border-slate-100 rounded-[20px] transition-all duration-300 hover:border-[#14B8A6]/30 animate-in fade-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${idx * 30}ms` }}
                        >
                            {/* Subtle Gradient Line on Hover */}
                            <div className="absolute inset-y-4 left-0 w-[2px] bg-gradient-to-b from-[#14B8A6] to-emerald-300 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            {/* Branding */}
                            <div className="w-[30%] pr-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#14B8A6]/20 transition-colors shadow-none">
                                        {c.meta?.logo ? (
                                            <img src={c.meta.logo.startsWith('http') ? c.meta.logo : `${API_ORIGIN}${c.meta.logo}`} alt="logo" className="w-full h-full object-contain p-1.5" />
                                        ) : (
                                            <Building2 className="text-slate-200" size={20} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[14px] font-normal text-slate-800 tracking-tight leading-tight truncate group-hover:text-[#14B8A6] transition-colors">{c.name}</p>
                                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.meta?.primaryEmail || c.meta?.email || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Client Code */}
                            <div className="w-[15%]">
                                <span className="inline-block px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-400 group-hover:border-[#14B8A6]/10 transition-colors">
                                    {c.code || 'NULL'}
                                </span>
                            </div>

                            {/* Credentials */}
                            <div className="w-[25%] pr-6">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-700 transition-colors">
                                        <Mail size={12} strokeWidth={2} className="text-slate-300" />
                                        <span className="text-[12px] truncate">{c.meta?.primaryEmail || c.meta?.email || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
                                                <span className="text-[11px] font-black tracking-widest text-[#14B8A6]/60">
                                                    {revealMap[c._id] ? (c.meta?.adminPassword || '-') : '••••••••'}
                                                </span>
                                            </div>
                                            {c.meta?.adminPassword && (
                                                <button onClick={() => toggleReveal(c._id)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-[#14B8A6] hover:bg-[#14B8A6]/5 rounded-lg transition-all">
                                                    {revealMap[c._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="w-[15%]">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border ${c.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                    <div className={`w-1 h-1 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'} ${c.status === 'active' && 'animate-pulse'}`}></div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest">
                                        {c.status === 'active' ? 'Operational' : 'Suspended'}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="w-[15%] flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center bg-slate-50 rounded-xl p-1 gap-1">
                                    <button onClick={() => navigate(`/super-admin/companies/view/${c._id}`)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#14B8A6] hover:bg-white rounded-lg transition-all" title="View Profile">
                                        <Eye size={14} />
                                    </button>
                                    <button onClick={() => navigate(`/super-admin/companies/edit/${c._id}`)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#14B8A6] hover:bg-white rounded-lg transition-all" title="Edit Data">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => navigate(`/super-admin/modules/${c._id}`)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-white rounded-lg transition-all" title="Config Modules">
                                        <Settings size={14} />
                                    </button>
                                    <button onClick={() => toggleActive(c)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${c.status === 'active' ? 'text-slate-400 hover:text-rose-500 hover:bg-white' : 'text-slate-400 hover:text-emerald-600 hover:bg-white'}`} title={c.status === 'active' ? 'Deactivate' : 'Activate'}>
                                        <Zap size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination Controls - Shorter Padding */}
            {companies.length > pageSize && (
                <div className="flex items-center justify-center pt-6">
                    <div className="bg-white p-1 rounded-2xl border border-slate-100 flex items-center gap-1">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="h-11 px-5 rounded-2xl text-[13px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all"
                        >
                            Back
                        </button>
                        <div className="flex gap-1.5">
                            {Array.from({ length: Math.ceil(companies.length / pageSize) }, (_, i) => i + 1).map(num => (
                                <button
                                    key={num}
                                    onClick={() => setCurrentPage(num)}
                                    className={`w-11 h-11 rounded-2xl text-[13px] font-medium transition-all ${currentPage === num ? 'bg-[#14B8A6] text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <button
                            disabled={currentPage === Math.ceil(companies.length / pageSize)}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="h-11 px-5 rounded-2xl text-[13px] font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Modals/Forms */}
            {openForm && (
                <CompanyForm
                    company={selected}
                    onClose={() => {
                        setOpenForm(false);
                        load();
                    }}
                />
            )}

            {openView && (
                <CompanyView
                    company={selected}
                    onClose={() => {
                        setOpenView(false);
                        setSelected(null);
                    }}
                />
            )}
        </div>
    );
}
