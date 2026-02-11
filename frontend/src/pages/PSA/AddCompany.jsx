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
    MapPin
} from 'lucide-react';
import companiesService from '../../services/companiesService';

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

    const defaultModules = ['hr', 'leave', 'attendance', 'payroll', 'recruitment', 'performance'];

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
        if (!formData.name) errs.name = 'Organization name required';
        if (!formData.email) errs.email = 'Valid corporate email required';
        if (!formData.ownerName) errs.ownerName = 'Primary contact name required';
        if (!formData.password) errs.password = 'Secure password required';
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
                } catch (e) { console.warn('Logo upload skipped'); }
            }

            const payload = {
                name: formData.name,
                code: formData.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10),
                status: 'active',
                modules: defaultModules,
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
            navigate('/psa/companies');
        } catch (error) {
            console.error(error);
            alert('Provisioning failed. Please check parameters.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 font-sans selection:bg-indigo-100 selection:text-indigo-600">
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Top Actions */}
                <button
                    onClick={() => navigate('/psa/companies')}
                    className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-8 font-bold text-xs uppercase tracking-widest"
                >
                    <ArrowLeft size={14} /> Back to Companies
                </button>

                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Company</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-8 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

                            {/* Company Name - Full Width */}
                            <div className="md:col-span-2 group">
                                <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Company Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter company name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={`w-full px-5 py-4 bg-slate-50 rounded-2xl border ${errors.name ? 'border-rose-200 bg-rose-50/10' : 'border-slate-100 group-hover:border-slate-200'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold text-slate-700`}
                                />
                                {errors.name && <p className="text-xs text-rose-500 font-bold mt-2 px-1">{errors.name}</p>}
                            </div>

                            {/* Company Email & Owner Name */}
                            <div className="group">
                                <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Company Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter email address"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`w-full px-5 py-4 bg-slate-50 rounded-2xl border ${errors.email ? 'border-rose-200' : 'border-slate-100'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold text-slate-700`}
                                />
                                {errors.email && <p className="text-xs text-rose-500 font-bold mt-2 px-1">{errors.email}</p>}
                            </div>

                            <div className="group">
                                <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Owner Name</label>
                                <input
                                    type="text"
                                    name="ownerName"
                                    placeholder="Enter owner name"
                                    value={formData.ownerName}
                                    onChange={handleInputChange}
                                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold text-slate-700"
                                />
                                {errors.ownerName && <p className="text-xs text-rose-500 font-bold mt-2 px-1">{errors.ownerName}</p>}
                            </div>

                            {/* Password & Phone */}
                            <div className="group relative">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="block text-sm font-bold text-slate-700">Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700"
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Enter password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className={`w-full px-5 py-4 bg-slate-50 rounded-2xl border ${errors.password ? 'border-rose-200' : 'border-slate-100'} focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold text-slate-700`}
                                />
                                {errors.password && <p className="text-xs text-rose-500 font-bold mt-2 px-1">{errors.password}</p>}
                            </div>

                            <div className="group">
                                <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Phone</label>
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="Enter contact number"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold text-slate-700"
                                />
                            </div>

                            {/* Address - Full Width */}
                            <div className="md:col-span-2 group">
                                <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Address</label>
                                <textarea
                                    name="address"
                                    rows="3"
                                    placeholder="Enter full address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold text-slate-700 resize-none"
                                />
                            </div>

                            {/* Company Logo - Full Width */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-3 px-1">Company Logo</label>
                                <div className="flex items-center gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 border-dashed">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-20 h-20 shrink-0 bg-white rounded-2xl flex items-center justify-center border border-slate-200 hover:border-indigo-400 cursor-pointer transition-all shadow-sm group overflow-hidden"
                                    >
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <UploadCloud size={24} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                        )}
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                                        >
                                            Choose File
                                        </button>
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">PNG, JPG or SVG (Max 2MB)</p>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/psa/companies')}
                                className="px-8 py-3.5 font-bold text-sm text-slate-400 hover:text-slate-600 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
