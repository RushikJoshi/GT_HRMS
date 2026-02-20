import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    UploadCloud,
    Phone,
    MapPin,
    Mail,
    User,
    Lock,
    Building2,
    ChevronRight
} from 'lucide-react';
import companiesService from '../../services/companiesService';
import { createDefaultEnabledModules } from '../../utils/moduleConfig';

const DEFAULT_MODULE_CODES = [
    'hr',
    'payroll',
    'attendance',
    'leave',
    'employeePortal',
    'recruitment',
    'backgroundVerification',
    'documentManagement',
    'socialMediaIntegration'
];

export default function AddCompany() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        ownerName: '',
        password: '',
        phone: '',
        address: '',
        logo: null
    });

    const [logoPreview, setLogoPreview] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const defaultEnabledModules = createDefaultEnabledModules(false, DEFAULT_MODULE_CODES);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, logo: file }));
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const validate = () => {
        const errs = {};
        if (!formData.name) errs.name = 'Organization name is required';
        if (!formData.email) errs.email = 'Valid corporate email required';
        if (!formData.ownerName) errs.ownerName = 'Lead contact required';
        if (!formData.password) errs.password = 'System access key required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            let logoUrl = '';
            if (formData.logo) {
                try {
                    const upRes = await companiesService.uploadLogo(formData.logo);
                    logoUrl = upRes.url || upRes.path || '';
                } catch { console.warn('Logo upload skipped'); }
            }

            const payload = {
                name: formData.name,
                code: formData.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10),
                status: 'active',
                enabledModules: defaultEnabledModules,
                meta: {
                    primaryEmail: formData.email,
                    email: formData.email,
                    ownerName: formData.ownerName,
                    phone: formData.phone,
                    address: formData.address,
                    adminPassword: formData.password,
                    logo: logoUrl
                }
            };

            await companiesService.createCompany(payload);
            navigate('/super-admin/companies');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-700 font-['Inter',sans-serif] relative">
            {/* Visual Decorative Elements */}
            <div className="fixed -top-20 -right-20 w-[600px] h-[600px] bg-emerald-50/50 blur-[150px] rounded-full -z-10 animate-pulse"></div>
            <div className="fixed -bottom-20 -left-20 w-[500px] h-[500px] bg-[#14B8A6]/5 blur-[120px] rounded-full -z-10 animate-pulse delay-1000"></div>

            {/* Header / Breadcrumb */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/super-admin/companies')}
                    className="group flex items-center gap-2 text-slate-400 hover:text-[#14B8A6] transition-all text-[13px] font-bold uppercase tracking-wider bg-white/50 px-4 py-2 rounded-xl border border-slate-100/50 hover:border-[#14B8A6]/20"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Registry
                </button>
            </div>

            <form onSubmit={handleSubmit} className="w-full">
                <div className="bg-white rounded-[40px] border border-slate-100/80 overflow-hidden shadow-sm shadow-slate-200/20 relative">
                    <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">

                        {/* 1. Company Name */}
                        <div className="lg:col-span-2 space-y-3 group/field">
                            <div className="flex items-center gap-2 ml-1">
                                <Building2 size={14} className="text-slate-400 group-hover/field:text-[#14B8A6] transition-colors" />
                                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest group-hover/field:text-[#14B8A6] transition-all">Company Name</label>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="e.g. Acme Corporation"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={`w-full h-12 px-5 rounded-xl bg-slate-50 border ${errors.name ? 'border-red-200 bg-red-50/30' : 'border-transparent'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#14B8A6]/5 focus:border-[#14B8A6]/30 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300`}
                                />
                            </div>
                            {errors.name && <p className="text-red-500 text-[11px] font-bold uppercase tracking-tight ml-1">{errors.name}</p>}
                        </div>

                        {/* 2. Company Email */}
                        <div className="lg:col-span-2 space-y-3 group/field">
                            <div className="flex items-center gap-2 ml-1">
                                <Mail size={14} className="text-slate-400 group-hover/field:text-[#14B8A6] transition-colors" />
                                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest group-hover/field:text-[#14B8A6] transition-all">Company Email</label>
                            </div>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="admin@company.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`w-full h-12 px-5 rounded-xl bg-slate-50 border ${errors.email ? 'border-red-200 bg-red-50/30' : 'border-transparent'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#14B8A6]/5 focus:border-[#14B8A6]/30 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300`}
                                />
                            </div>
                            {errors.email && <p className="text-red-500 text-[11px] font-bold uppercase tracking-tight ml-1">{errors.email}</p>}
                        </div>

                        {/* 3. Owner Name */}
                        <div className="lg:col-span-1 space-y-3 group/field">
                            <div className="flex items-center gap-2 ml-1">
                                <User size={14} className="text-slate-400 group-hover/field:text-[#14B8A6] transition-colors" />
                                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest group-hover/field:text-[#14B8A6] transition-all">Owner Name</label>
                            </div>
                            <input
                                type="text"
                                name="ownerName"
                                placeholder="Full Name"
                                value={formData.ownerName}
                                onChange={handleInputChange}
                                className={`w-full h-12 px-5 rounded-xl bg-slate-50 border ${errors.ownerName ? 'border-red-200 bg-red-50/30' : 'border-transparent'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#14B8A6]/5 focus:border-[#14B8A6]/30 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300`}
                            />
                        </div>

                        {/* 4. Password */}
                        <div className="lg:col-span-1 space-y-3 group/field">
                            <div className="flex justify-between items-center ml-1">
                                <div className="flex items-center gap-2">
                                    <Lock size={14} className="text-slate-400 group-hover/field:text-[#14B8A6] transition-colors" />
                                    <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest group-hover/field:text-[#14B8A6] transition-all">Password</label>
                                </div>
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[10px] font-black uppercase text-slate-300 hover:text-[#14B8A6]">
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleInputChange}
                                className={`w-full h-12 px-5 rounded-xl bg-slate-50 border ${errors.password ? 'border-red-200 bg-red-50/30' : 'border-transparent'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#14B8A6]/5 focus:border-[#14B8A6]/30 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300`}
                            />
                        </div>

                        {/* 5. Phone Number */}
                        <div className="lg:col-span-1 space-y-3 group/field">
                            <div className="flex items-center gap-2 ml-1">
                                <Phone size={14} className="text-slate-400 group-hover/field:text-[#14B8A6] transition-colors" />
                                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest group-hover/field:text-[#14B8A6] transition-all">Phone Number</label>
                            </div>
                            <input
                                type="text"
                                name="phone"
                                placeholder="+1 (000) 000-0000"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full h-12 px-5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#14B8A6]/5 focus:border-[#14B8A6]/30 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300"
                            />
                        </div>

                        {/* 6. Company Logo */}
                        <div className="lg:col-span-1 space-y-3 group/field">
                            <div className="flex items-center gap-2 ml-1">
                                <UploadCloud size={14} className="text-slate-400 group-hover/field:text-[#14B8A6] transition-colors" />
                                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest group-hover/field:text-[#14B8A6] transition-all">Company Logo</label>
                            </div>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="h-12 bg-slate-50 border border-transparent rounded-xl px-5 flex items-center justify-between cursor-pointer hover:bg-white hover:border-[#14B8A6]/30 transition-all"
                            >
                                <div className="flex items-center gap-3 truncate">
                                    <div className="w-8 h-8 bg-white rounded-lg border border-slate-100 flex items-center justify-center shrink-0">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <UploadCloud size={16} className="text-slate-300" />
                                        )}
                                    </div>
                                    <p className="text-[13px] text-[#14B8A6] font-bold truncate">{logoPreview ? 'Change Logo' : 'Choose File'}</p>
                                </div>
                                <ChevronRight size={14} className="text-slate-300" />
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                        </div>

                        {/* 7. Corporate Address */}
                        <div className="lg:col-span-4 space-y-3 group/field">
                            <div className="flex items-center gap-2 ml-1">
                                <MapPin size={14} className="text-slate-400 group-hover/field:text-[#14B8A6] transition-colors" />
                                <label className="text-[13px] font-bold text-slate-500 uppercase tracking-widest group-hover/field:text-[#14B8A6] transition-all">Corporate Address</label>
                            </div>
                            <textarea
                                name="address"
                                rows="3"
                                placeholder="Enter operational headquarters address..."
                                value={formData.address}
                                onChange={handleInputChange}
                                className="w-full px-6 py-4 rounded-[24px] bg-slate-50 border border-transparent focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#14B8A6]/5 focus:border-[#14B8A6]/30 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-300 resize-none leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Footer Section */}
                    <div className="p-6 sm:p-8 border-t border-slate-100/80 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-end gap-6">
                        <button
                            type="button"
                            onClick={() => navigate('/super-admin/companies')}
                            className="text-[13px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto bg-[#14B8A6] hover:bg-[#0D9488] text-white px-10 h-12 rounded-xl font-black uppercase text-[12px] tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 group"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Processing...
                                </div>
                            ) : (
                                <>
                                    Save
                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
