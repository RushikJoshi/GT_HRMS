import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    UploadCloud,
    Building2,
    Mail,
    Hash,
    Briefcase,
    Users,
    Clock,
    UserCircle2,
    BarChart3,
    CheckCircle2,
    ShieldCheck,
    FileText,
    Globe,
    Calendar,
    ChevronLeft,
    Save,
    Activity,
    X
} from 'lucide-react';
import companiesService from '../../services/companiesService';
import { API_ROOT } from '../../utils/api';
import { normalizeEnabledModules, MODULE_CODES } from '../../utils/moduleConfig';

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

    // Available Modules List mapped to MODULE_CODES
    const availableModules = [
        { id: 'hr', name: 'HR Management', icon: Users },
        { id: 'payroll', name: 'Payroll System', icon: BarChart3 },
        { id: 'attendance', name: 'Attendance', icon: Clock },
        { id: 'leave', name: 'Leave Management', icon: Calendar },
        { id: 'recruitment', name: 'Recruitment', icon: Briefcase },
        { id: 'backgroundVerification', name: 'Verification', icon: ShieldCheck },
        { id: 'documentManagement', name: 'Doc Management', icon: FileText },
        { id: 'socialMediaIntegration', name: 'Social Media', icon: Globe },
        { id: 'employeePortal', name: 'Employee Portal', icon: UserCircle2 },
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
                email: data.meta?.email || data.meta?.primaryEmail || '',
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
        if (!formData.code) errs.code = 'Required';
        if (!formData.name) errs.name = 'Required';
        if (!formData.email) errs.email = 'Required';
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
            navigate(`/super-admin/companies/view/${id}`);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-[400px] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#14B8A6] rounded-full animate-spin"></div>
            <p className="mt-4 text-[13px] font-medium text-slate-400 animate-pulse">Initializing configuration...</p>
        </div>
    );

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-700 font-['Inter',sans-serif] relative pb-20">
            {/* Background Aura */}
            <div className="fixed -top-10 -right-10 w-[500px] h-[500px] bg-emerald-50/40 blur-[120px] rounded-full -z-10 animate-pulse"></div>

            {/* Toolbar */}
            <div className="flex items-center px-2">
                <button
                    onClick={() => navigate(`/super-admin/companies/view/${id}`)}
                    className="group flex items-center gap-2 px-5 h-10 bg-white border border-slate-100 text-slate-500 rounded-xl text-[12px] font-medium hover:text-[#14B8A6] hover:border-[#14B8A6]/30 transition-all shadow-sm"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Profile</span>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-2">
                {/* Identity Card */}
                <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden hover:shadow-sm transition-all duration-300">
                    <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Company Configuration</h3>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                        {/* Logo Upload */}
                        <div className="flex flex-col items-center gap-4">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-32 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-[#14B8A6]/40 transition-all overflow-hidden relative group"
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-4 group-hover:opacity-40 transition-opacity" />
                                ) : (
                                    <UploadCloud className="text-slate-300 group-hover:text-[#14B8A6] transition-colors" size={32} />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-bold text-[#14B8A6] uppercase bg-white/90 px-3 py-1 rounded-full shadow-sm">Change</span>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company Logo</p>
                        </div>

                        {/* Text Fields */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                                    <div className="relative">
                                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#14B8A6]/40 focus:ring-0 transition-all font-medium text-slate-700 text-[13px]"
                                            placeholder="Company Name"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Company Code</label>
                                    <div className="relative">
                                        <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            type="text"
                                            name="code"
                                            value={formData.code}
                                            onChange={handleInputChange}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#14B8A6]/40 focus:ring-0 transition-all font-medium text-slate-700 text-[13px]"
                                            placeholder="Company Code"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Company Email</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#14B8A6]/40 focus:ring-0 transition-all font-medium text-slate-700 text-[13px]"
                                        placeholder="admin@company.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modules & Status Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Modules Card */}
                    <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[28px] overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/30">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Protocol Authorization (Modules)</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {availableModules.map(mod => (
                                <div
                                    key={mod.id}
                                    onClick={() => handleModuleToggle(mod.id)}
                                    className={`group flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${formData.enabledModules[mod.id]
                                        ? 'bg-white border-[#14B8A6]/20 shadow-sm'
                                        : 'bg-slate-50/50 border-transparent hover:border-slate-200'
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${formData.enabledModules[mod.id] ? 'bg-[#14B8A6] text-white shadow-lg shadow-teal-100' : 'bg-white text-slate-300 shadow-sm'}`}>
                                        <mod.icon size={16} strokeWidth={formData.enabledModules[mod.id] ? 2.5 : 2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[12px] font-bold leading-none ${formData.enabledModules[mod.id] ? 'text-slate-800' : 'text-slate-400'}`}>{mod.name}</p>
                                    </div>
                                    {formData.enabledModules[mod.id] && (
                                        <CheckCircle2 size={12} className="text-[#14B8A6]" strokeWidth={3} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status & Finalize Card */}
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden p-6">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Deployment Status</h3>
                            <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                                    className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-300 ${formData.status === 'active'
                                        ? 'bg-white text-[#14B8A6] shadow-sm border border-[#14B8A6]/10'
                                        : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Activity size={16} className={formData.status === 'active' ? 'mb-1' : 'mb-1 opacity-40'} />
                                    <span className="text-[11px] font-bold uppercase tracking-tight">Operational</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, status: 'inactive' }))}
                                    className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-300 ${formData.status === 'inactive'
                                        ? 'bg-white text-rose-500 shadow-sm border border-rose-100'
                                        : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <X size={16} className={formData.status === 'inactive' ? 'mb-1' : 'mb-1 opacity-40'} />
                                    <span className="text-[11px] font-bold uppercase tracking-tight">Decoupled</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-12 bg-[#14B8A6] hover:bg-[#0D9488] text-white rounded-xl font-bold text-[13px] uppercase tracking-widest shadow-lg shadow-teal-100 transition-all active:scale-95 disabled:opacity-50 overflow-hidden relative group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                <div className="flex items-center justify-center gap-2">
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    <span>{submitting ? 'Applying...' : 'Apply Changes'}</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(`/super-admin/companies/view/${id}`)}
                                className="w-full h-12 bg-white border border-slate-100 text-slate-400 rounded-xl font-bold text-[13px] uppercase tracking-widest hover:text-slate-600 transition-all"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
