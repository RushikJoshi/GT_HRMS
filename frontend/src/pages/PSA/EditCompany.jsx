import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Upload,
    Check,
    Briefcase,
    Users,
    Clock,
    Activity,
    Cpu,
    Save,
    Trash2,
    Shield,
    Globe,
    Zap,
    Mail,
    Lock,
    Settings,
    LayoutGrid,
    CheckCircle2,
    BarChart3,
    UserCircle2,
    X,
    Building2,
    Code
} from 'lucide-react';
import companiesService from '../../services/companiesService';
import { API_ROOT } from '../../utils/api';

export default function EditCompany() {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        email: '',
        modules: [],
        status: 'active'
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Modules
    const availableModules = [
        { id: 'hr', name: 'HR Core', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { id: 'payroll', name: 'Payroll', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'attendance', name: 'Attendance', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { id: 'recruitment', name: 'Recruitment', icon: Briefcase, color: 'text-rose-600', bg: 'bg-rose-50' },
        { id: 'ess', name: 'Employee Portal', icon: UserCircle2, color: 'text-sky-600', bg: 'bg-sky-50' },
        { id: 'analytics', name: 'Analytics', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

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
            setFormData({
                code: data.code || '',
                name: data.name || '',
                email: data.meta?.email || '',
                modules: data.modules || [],
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
    };

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
        setFormData(prev => {
            const newModules = prev.modules.includes(modId)
                ? prev.modules.filter(m => m !== modId)
                : [...prev.modules, modId];
            return { ...prev, modules: newModules };
        });
    };

    const validate = () => {
        const errs = {};
        if (!formData.code) errs.code = 'Registry index required';
        if (!formData.name) errs.name = 'Entity nomenclature required';
        if (!formData.email) errs.email = 'Secure communication point required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            let logoUrl = formData.logo;
            if (logoFile) {
                try {
                    const upRes = await companiesService.uploadLogo(logoFile);
                    logoUrl = upRes.url || upRes.path || '';
                } catch (e) { console.warn('Logo upload excluded'); }
            }

            const payload = {
                code: formData.code,
                name: formData.name,
                status: formData.status,
                modules: formData.modules,
                meta: {
                    ...formData.meta,
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB]">
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-6 text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Entity Registry...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F9FAFB] p-4 sm:p-6 lg:p-12 font-sans selection:bg-emerald-100 selection:text-emerald-600 pb-20 sm:pb-24">
            <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-4 w-full text-center md:text-left">
                        <button
                            onClick={() => navigate('/super-admin/companies')}
                            className="group inline-flex items-center gap-3 text-emerald-600 hover:text-emerald-800 transition-all font-bold text-[10px] uppercase tracking-[0.25em]"
                        >
                            <div className="w-8 h-8 rounded-full bg-white border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                                <ArrowLeft size={14} />
                            </div>
                            Registry Explorer
                        </button>
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">Reconfigure Entity</h1>
                            <p className="text-slate-500 text-sm sm:text-base font-medium max-w-lg mx-auto md:mx-0">Modify organizational parameters and capability matrix for <span className="text-emerald-600 font-bold">{formData.name}</span>.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">

                    {/* LEFT: Core Identity Information */}
                    <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                        <div className="bg-white rounded-2xl p-6 sm:p-12 shadow-sm border border-slate-50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-500 to-teal-500"></div>

                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 sm:mb-10 flex items-center gap-2">
                                <Globe size={14} className="text-emerald-400" /> Administrative Protocol
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Registry Code</label>
                                    <div className="relative">
                                        <Code className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            name="code"
                                            value={formData.code}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 sm:pl-14 pr-6 py-4 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all font-bold text-slate-700 text-sm"
                                        />
                                    </div>
                                    {errors.code && <p className="text-[10px] font-black text-rose-500 mt-2 px-1">{errors.code}</p>}
                                </div>

                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Entity Nomenclature</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 sm:pl-14 pr-6 py-4 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all font-bold text-slate-700 text-sm"
                                        />
                                    </div>
                                    {errors.name && <p className="text-[10px] font-black text-rose-500 mt-2 px-1">{errors.name}</p>}
                                </div>

                                <div className="md:col-span-2 group">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Communication Hub (Email)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={18} />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 sm:pl-14 pr-6 py-4 bg-slate-50/50 rounded-xl border border-slate-100 group-hover:border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all font-bold text-slate-700 text-sm"
                                        />
                                    </div>
                                    {errors.email && <p className="text-[10px] font-black text-rose-500 mt-2 px-1">{errors.email}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Brand Identity (Logo)</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="group relative h-32 sm:h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-emerald-400 transition-all overflow-hidden"
                                    >
                                        {logoPreview ? (
                                            <div className="relative w-full h-full flex items-center justify-center p-6">
                                                <img src={logoPreview} className="max-h-full max-w-full object-contain drop-shadow-lg" alt="Preview" />
                                                <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/10 transition-colors flex items-center justify-center">
                                                    <Settings size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center space-y-2">
                                                <Upload className="text-slate-300 w-8 h-8 mx-auto group-hover:text-emerald-500 transition-all" />
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Update Entity Mark</p>
                                            </div>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Status & Matrix Selection */}
                    <div className="space-y-6 sm:space-y-8">

                        {/* Status Hub */}
                        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Zap size={14} className="text-emerald-400" /> Operational Status
                            </h3>
                            <div className="space-y-3">
                                <div
                                    onClick={() => handleInputChange({ target: { name: 'status', value: 'active' } })}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${formData.status === 'active' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.status === 'active' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-200 text-slate-400'}`}>
                                            <Shield size={16} />
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${formData.status === 'active' ? 'text-emerald-700' : 'text-slate-400'}`}>Operational</span>
                                    </div>
                                    {formData.status === 'active' && <CheckCircle2 size={18} className="text-emerald-500" />}
                                </div>

                                <div
                                    onClick={() => handleInputChange({ target: { name: 'status', value: 'inactive' } })}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${formData.status === 'inactive' ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.status === 'inactive' ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-slate-200 text-slate-400'}`}>
                                            <X size={16} />
                                        </div>
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${formData.status === 'inactive' ? 'text-rose-700' : 'text-slate-400'}`}>Suspended</span>
                                    </div>
                                    {formData.status === 'inactive' && <CheckCircle2 size={18} className="text-rose-500" />}
                                </div>
                            </div>
                        </div>

                        {/* Capability Matrix Selection */}
                        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <LayoutGrid size={14} className="text-emerald-400" /> Subscription Matrix
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                                {availableModules.map(mod => (
                                    <div
                                        key={mod.id}
                                        onClick={() => handleModuleToggle(mod.id)}
                                        className={`group flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-300 ${formData.modules.includes(mod.id)
                                            ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                            : 'bg-white border-slate-50 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${formData.modules.includes(mod.id) ? `${mod.bg} ${mod.color}` : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100'}`}>
                                            <mod.icon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-[11px] font-black uppercase tracking-widest transition-colors truncate ${formData.modules.includes(mod.id) ? 'text-slate-900' : 'text-slate-400'}`}>{mod.name}</span>
                                                {formData.modules.includes(mod.id) && <Zap className="text-emerald-500 shrink-0" size={12} />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tactical Actions */}
                        <div className="flex flex-col gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full relative group bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-5 rounded-xl font-black text-[10px] uppercase tracking-[0.25em] shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-3 justify-center">
                                    {submitting ? 'Synchronizing...' : <> <Save size={16} /> Update Entity </>}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/super-admin/companies')}
                                className="w-full py-5 text-slate-400 hover:text-rose-500 font-bold text-[10px] uppercase tracking-[0.25em] transition-all flex items-center gap-3 justify-center"
                            >
                                <X size={16} /> Discard Changes
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
