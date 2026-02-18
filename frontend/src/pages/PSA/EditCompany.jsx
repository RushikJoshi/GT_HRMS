import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    UploadCloud,
    Save,
    X,
    Building2,
    Mail,
    Hash,
    Briefcase,
    Users,
    Activity,
    Clock,
    UserCircle2,
    BarChart3,
    CheckCircle2
} from 'lucide-react';
import companiesService from '../../services/companiesService';
import { API_ROOT } from '../../utils/api';
import { normalizeEnabledModules } from '../../utils/moduleConfig';

export default function EditCompany() {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        email: '',
        enabledModules: {},
        status: 'active'
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Available Modules List
    const availableModules = [
        { id: 'hr', name: 'HR Management', icon: Users },
        { id: 'payroll', name: 'Payroll System', icon: BarChart3 },
        { id: 'attendance', name: 'Attendance & Time', icon: Clock },
        { id: 'leave', name: 'Leave Management', icon: Clock },
        { id: 'employeePortal', name: 'Employee Portal', icon: UserCircle2 },
        { id: 'recruitment', name: 'Recruitment', icon: Briefcase },
        { id: 'backgroundVerification', name: 'BGV', icon: Briefcase },
        { id: 'documentManagement', name: 'Document Management', icon: CheckCircle2 },
        { id: 'socialMediaIntegration', name: 'Social Media Integration', icon: CheckCircle2 },
    ];

    const getLogoUrl = (url) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_ROOT}${url}`;
    };

    const loadCompany = useCallback(async () => {
        try {
            setLoading(true);
            const data = await companiesService.getCompanyById(id);
            setFormData({
                code: data.code || '',
                name: data.name || '',
                email: data.meta?.email || '',
                enabledModules: normalizeEnabledModules(data.enabledModules, data.modules),
                status: data.status || 'active'
            });
            if (data.meta?.logo) {
                setLogoPreview(getLogoUrl(data.meta.logo));
            }
        } catch (error) {
            console.error('Failed to load company', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadCompany();
    }, [loadCompany]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result);
        reader.readAsDataURL(file);
        setLogoFile(file);
    };

    const handleModuleToggle = (modId) => {
        setFormData(prev => ({
            ...prev,
            enabledModules: {
                ...prev.enabledModules,
                [modId]: !prev.enabledModules[modId]
            }
        }));
    };

    const validate = () => {
        const errs = {};
        if (!formData.code) errs.code = 'Company ID is required';
        if (!formData.name) errs.name = 'Company Name is required';
        if (!formData.email) errs.email = 'Admin Email is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            let logoUrl = logoPreview;
            if (logoFile) {
                try {
                    const upRes = await companiesService.uploadLogo(logoFile);
                    logoUrl = upRes.url || upRes.path || '';
                } catch (e) { console.warn('Logo upload failed'); }
            }

            const payload = {
                code: formData.code,
                name: formData.name,
                status: formData.status,
                enabledModules: formData.enabledModules,
                meta: {
                    primaryEmail: formData.email,
                    email: formData.email,
                    logo: logoUrl || undefined
                }
            };

            await companiesService.updateCompany(id, payload);
            navigate('/super-admin/companies');
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/30 p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
            <div className="w-full mx-auto space-y-6">

                {/* Header Section */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-center gap-6">
                    <button
                        onClick={() => navigate('/super-admin/companies')}
                        className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all hover:bg-slate-100"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 leading-none">Edit Company</h1>
                        <p className="text-[12px] font-medium text-slate-400 mt-1.5 uppercase tracking-tight">Update company details and settings</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

                    {/* LEFT SECTION (Identity & Contact) */}
                    <div className="lg:col-span-2 space-y-6 sm:space-y-8">

                        {/* Company Information Card */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company Information</h3>
                            </div>
                            <div className="p-8 sm:p-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Company ID *</label>
                                        <div className="relative">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                            <input
                                                type="text"
                                                name="code"
                                                value={formData.code}
                                                onChange={handleInputChange}
                                                className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border ${errors.code ? 'border-rose-400' : 'border-slate-100'} rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-bold text-slate-700 text-sm`}
                                                placeholder="tss001"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Company Name *</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border ${errors.name ? 'border-rose-400' : 'border-slate-100'} rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-bold text-slate-700 text-sm`}
                                                placeholder="TSS Solutions"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Logo</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative group h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-blue-300 transition-all overflow-hidden"
                                    >
                                        {logoPreview ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <img src={logoPreview} className="h-24 max-w-full object-contain drop-shadow-md" alt="Preview" />
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Click to change logo</span>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-3">
                                                <UploadCloud className="text-slate-300 w-10 h-10 mx-auto group-hover:text-blue-500 transition-all" />
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click to change logo</p>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Contact Card */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Contact</h3>
                            </div>
                            <div className="p-8 sm:p-10">
                                <div className="space-y-2 max-w-md">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 border ${errors.email ? 'border-rose-400' : 'border-slate-100'} rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-bold text-slate-700 text-sm`}
                                            placeholder="admin@example.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SECTION (Modules & Status) */}
                    <div className="space-y-6 sm:space-y-8">

                        {/* Modules Selection Card */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-8 py-6 border-b border-slate-100">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modules</h3>
                            </div>
                            <div className="p-6 sm:p-8 space-y-3">
                                {availableModules.map(mod => (
                                    <div
                                        key={mod.id}
                                        onClick={() => handleModuleToggle(mod.id)}
                                        className={`group flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.enabledModules?.[mod.id]
                                            ? 'bg-white border-blue-500 text-blue-600 shadow-sm'
                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${formData.enabledModules?.[mod.id] ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'}`}>
                                                <mod.icon size={16} />
                                            </div>
                                            <span className={`text-[12px] font-bold tracking-tight ${formData.enabledModules?.[mod.id] ? 'text-slate-900' : ''}`}>{mod.name}</span>
                                        </div>
                                        {formData.enabledModules?.[mod.id] && (
                                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                                <CheckCircle2 size={12} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status Card */}
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100">
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</h3>
                            </div>
                            <div className="p-8">
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-bold text-slate-700 text-sm appearance-none"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.15em] shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/super-admin/companies')}
                                className="w-full bg-white border border-slate-200 text-slate-500 py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.15em] hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
