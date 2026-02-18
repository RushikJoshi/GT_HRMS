import React, { useEffect, useState } from "react";
import { Pagination, Modal, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from "../../utils/api";
import CompanyForm from "./CompanyForm";
import ModuleConfig from "./ModuleConfig";
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
    Key,
    ShieldCheck,
    AlertCircle
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
    const [openModules, setOpenModules] = useState(false);
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
            iconColor: 'text-blue-600',
            iconBg: 'bg-blue-50',
        },
        {
            label: 'ACTIVE COMPANIES',
            value: stats.active,
            icon: Users,
            iconColor: 'text-emerald-600',
            iconBg: 'bg-emerald-50',
        },
        {
            label: 'INACTIVE COMPANIES',
            value: stats.inactive,
            icon: Activity,
            iconColor: 'text-slate-400',
            iconBg: 'bg-slate-100',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8 font-sans text-slate-900 overflow-x-hidden">
            <div className="w-full mx-auto space-y-8 animate-in fade-in duration-700 px-0">

                {/* Top Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                            <Building2 size={24} />
                        </div>
                        <div className="space-y-0.5">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Companies</h1>
                            <p className="text-[12px] font-medium text-slate-400 tracking-tight">Central ecosystem management for all tenant organizations.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setSelected(null); setOpenForm(true); }}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 active:scale-95"
                    >
                        <Plus size={16} /> Onboard New Company
                    </button>
                </div>

                {/* Local Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                    {statsCards.map((card, idx) => (
                        <div
                            key={idx}
                            className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between transition-all hover:shadow-md h-32"
                        >
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {card.label}
                                </p>
                                <h3 className="text-3xl font-bold text-slate-900">
                                    {card.value}
                                </h3>
                            </div>
                            <div className={`${card.iconBg} ${card.iconColor} w-12 h-12 rounded-xl flex items-center justify-center shadow-sm`}>
                                <card.icon size={22} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 px-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Filter companies by name, code or email..."
                            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all text-sm font-medium text-slate-600 placeholder:text-slate-300 shadow-sm"
                        />
                    </div>
                    <button className="flex items-center justify-center gap-2 px-8 py-4 bg-white border border-slate-200/60 text-slate-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                        <Filter size={14} /> Filter
                    </button>
                </div>

                {/* Content Table Card (Full Width) */}
                <div className="bg-white border-y md:border border-slate-200/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Company Branding</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Client Code</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Admin Credentials</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">Ecosystem Status</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100 text-right">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paged.map((c) => (
                                    <tr key={c._id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                                                    {c.meta?.logo ? (
                                                        <img src={c.meta.logo.startsWith('http') ? c.meta.logo : `${API_ORIGIN}${c.meta.logo}`} alt="logo" className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <Building2 className="text-slate-200" size={20} />
                                                    )}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[13px] font-bold text-slate-800">{c.name}</p>
                                                    <p className="text-[11px] font-medium text-slate-400">{c.meta?.primaryEmail || c.meta?.email || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                {c.code || '-'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1.5">
                                                <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                                                    <Mail size={12} className="text-slate-300" />
                                                    {c.meta?.primaryEmail || c.meta?.email || '-'}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Lock size={12} className="text-slate-300" />
                                                        <span className="text-[11px] font-bold text-slate-400 tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100/50">
                                                            {revealMap[c._id] ? (c.meta?.adminPassword || '-') : '••••••••'}
                                                        </span>
                                                    </div>
                                                    {c.meta?.adminPassword && (
                                                        <button onClick={() => handleToggleReveal(c._id)} className="text-slate-300 hover:text-blue-500 p-1 transition-colors">
                                                            {revealMap[c._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${c.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                                                <span className="text-[10px] font-extrabold uppercase tracking-widest">
                                                    {c.status === 'active' ? 'OPERATIONAL' : 'SUSPENDED'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => navigate(`/super-admin/companies/view/${c._id}`)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="View">
                                                    <Eye size={16} />
                                                </button>
                                                <button onClick={() => navigate(`/super-admin/companies/edit/${c._id}`)} className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => { setTargetCompany(c); setShowChangePasswordModal(true); }} className="p-2 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all" title="Change Admin Password">
                                                    <Key size={16} />
                                                </button>
                                                <button onClick={() => { setSelected(c); setOpenModules(true); }} className="p-2 text-slate-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-all" title="Modules">
                                                    <Settings size={16} />
                                                </button>
                                                <button onClick={() => toggleActive(c)} className={`p-2 rounded-lg transition-all ${c.status === 'active' ? 'text-slate-300 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}`} title={c.status === 'active' ? 'Deactivate' : 'Activate'}>
                                                    <Zap size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Pagination Footer */}
                    <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-white border-t border-slate-100 gap-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            PAGE {currentPage} OF {Math.ceil(companies.length / pageSize)} — SHOWING {paged.length} OF {companies.length} ORGANIZATIONS
                        </p>
                        {companies.length > pageSize && (
                            <div className="flex items-center gap-4">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 disabled:opacity-30 transition-colors"
                                >
                                    PREVIOUS
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(companies.length / pageSize) }, (_, i) => i + 1).map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setCurrentPage(num)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all ${currentPage === num ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    disabled={currentPage === Math.ceil(companies.length / pageSize)}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 disabled:opacity-30 transition-colors"
                                >
                                    NEXT
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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

            {openModules && (
                <ModuleConfig
                    company={selected}
                    onClose={() => {
                        setOpenModules(false);
                        load();
                    }}
                />
            )}

            <PasswordPromptModal
                open={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                onSuccess={onVerifySuccess}
            />

            <ChangePasswordModal
                open={showChangePasswordModal}
                company={targetCompany}
                onClose={(didUpdate) => {
                    setShowChangePasswordModal(false);
                    setTargetCompany(null);
                    if (didUpdate) load();
                }}
            />
        </div>
    );
}
