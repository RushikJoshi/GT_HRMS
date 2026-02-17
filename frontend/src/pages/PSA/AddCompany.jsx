import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    ArrowLeft,
    Shield,
    Globe,
    UploadCloud,
    CheckCircle2,
    X,
    Phone,
    MapPin,
    Mail,
    User,
    Lock,
    Building2,
    Check,
    AlertCircle,
    Building,
    Zap
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
        <div className="min-h-screen bg-slate-50/50 p-6 sm:p-8 lg:p-10 font-sans text-slate-900">
            <div className="w-full mx-auto space-y-8 animate-in fade-in duration-700">

                {/* Header Section */}
                <div className="space-y-4">
                    <button
                        onClick={() => navigate('/super-admin/companies')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-all font-bold text-[10px] uppercase tracking-[0.2em]"
                    >
                        <ArrowLeft size={14} />
                        Back to Companies
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Company</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Main Form Card */}
                    <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-200/60 relative">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Company Name - Full Width */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Company Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="Enter company name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={`w-full px-6 py-4 bg-slate-50 border ${errors.name ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-medium text-slate-800 text-sm placeholder:text-slate-300 rounded-xl shadow-sm`}
                                    />
                                </div>
                                {errors.name && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-1 ml-1">{errors.name}</p>}
                            </div>

                            {/* Company Email */}
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Company Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter company email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`w-full px-6 py-4 bg-[#E8F0FE] border ${errors.email ? 'border-rose-400' : 'border-transparent'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-medium text-slate-800 text-sm placeholder:text-slate-400 rounded-xl`}
                                />
                                {errors.email && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-1 ml-1">{errors.email}</p>}
                            </div>

                            {/* Owner Name */}
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Owner Name</label>
                                <input
                                    type="text"
                                    name="ownerName"
                                    placeholder="Enter owner name"
                                    value={formData.ownerName}
                                    onChange={handleInputChange}
                                    className={`w-full px-6 py-4 bg-slate-50 border ${errors.ownerName ? 'border-rose-400' : 'border-transparent'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-medium text-slate-800 text-sm placeholder:text-slate-300 rounded-xl`}
                                />
                                {errors.ownerName && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-1 ml-1">{errors.ownerName}</p>}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors"
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="********"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={`w-full px-6 py-4 bg-[#E8F0FE] border ${errors.password ? 'border-rose-400' : 'border-transparent'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-medium text-slate-800 text-sm placeholder:text-slate-400 rounded-xl`}
                                />
                                {errors.password && <p className="text-rose-500 text-[10px] font-bold uppercase tracking-widest mt-1 ml-1">{errors.password}</p>}
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="Enter contact number"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-medium text-slate-800 text-sm placeholder:text-slate-300 rounded-xl"
                                />
                            </div>

                            {/* Address - Full Width */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Address</label>
                                <textarea
                                    name="address"
                                    rows="3"
                                    placeholder="Enter full address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-4 bg-slate-50 border border-transparent focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all font-medium text-slate-800 text-sm placeholder:text-slate-300 rounded-xl resize-none shadow-sm"
                                />
                            </div>

                            {/* Company Logo - Full Width */}
                            <div className="md:col-span-2 space-y-4">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Company Logo</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-8 flex items-center justify-start gap-6 cursor-pointer hover:bg-slate-50 transition-all group"
                                >
                                    <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors shrink-0">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <UploadCloud size={24} />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <button type="button" className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm">
                                            Choose File
                                        </button>
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">PNG, JPG or SVG (Max 2MB)</p>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end gap-6 mt-12 border-t border-slate-100 pt-8">
                            <button
                                type="button"
                                onClick={() => navigate('/super-admin/companies')}
                                className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
