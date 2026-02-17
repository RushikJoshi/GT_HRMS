import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Upload,
    Check,
    Briefcase,
    Users,
    IndianRupee,
    Clock,
    Activity,
    Cpu,
    Save
} from 'lucide-react';
import companiesService from '../../services/companiesService';

export default function EditCompany() {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        email: '',
        // password: '', // Password editing usually separate for security
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
        { id: 'hr', name: 'HR Management', icon: Users, desc: 'Employees & Depts' },
        { id: 'payroll', name: 'Payroll', icon: IndianRupee, desc: 'Salary & Tax' },
        { id: 'attendance', name: 'Attendance', icon: Clock, desc: 'Time & Shifts' },
        { id: 'recruitment', name: 'Recruitment', icon: Briefcase, desc: 'Hiring Pipeline' },
        { id: 'performance', name: 'Performance', icon: Activity, desc: 'Goals & Reviews' },
        { id: 'leave', name: 'Leave Mgmt', icon: Cpu, desc: 'Time Off' },
    ];

    // Environment helper
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
    const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
    const getLogoUrl = (url) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
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
            alert('Error loading company data');
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
        if (!file.type.startsWith('image/')) return alert('Images only');

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
        if (!formData.code) errs.code = 'Required';
        if (!formData.name) errs.name = 'Required';
        if (!formData.email) errs.email = 'Required';
        if (!formData.modules.length) errs.modules = 'Select at least one';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            let logoUrl = formData.logo; // Keep existing logic if no new file

            // 1. Upload Logo if CHANGED
            if (logoFile) {
                try {
                    const upRes = await companiesService.uploadLogo(logoFile);
                    logoUrl = upRes.url || upRes.path || '';
                } catch (e) { console.warn('Logo upload excluded'); }
            }

            // 2. Prepare Payload
            const payload = {
                code: formData.code,
                name: formData.name,
                status: formData.status,
                modules: formData.modules,
                meta: {
                    ...formData.meta, // Preserve other meta
                    primaryEmail: formData.email,
                    email: formData.email,
                    logo: logoUrl || undefined // Only send if we have a URL
                }
            };

            // 3. Update Company
            await companiesService.updateCompany(id, payload);

            // 4. Redirect
            navigate('/psa/companies');

        } catch (error) {
            console.error(error);
            alert('Failed to update company. Check console.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/psa/companies')} className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors text-gray-600 shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Edit Company</h1>
                            <p className="text-sm text-gray-500">Update company details and settings</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Company Info */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="tex-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Company Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company ID *</label>
                                    <input
                                        type="text" name="code" value={formData.code} onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.code ? 'border-red-500' : 'border-gray-200'}`}
                                    />
                                    {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                    <input
                                        type="text" name="name" value={formData.name} onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
                                    />
                                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        {logoPreview ? (
                                            <img src={logoPreview} className="h-20 object-contain mb-2" alt="Preview" />
                                        ) : (
                                            <Upload className="text-gray-400 w-8 h-8 mb-2" />
                                        )}
                                        <p className="text-sm text-gray-600 font-medium">Click to change logo</p>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Info */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="tex-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Admin Contact</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
                                    <input
                                        type="email" name="email" value={formData.email} onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                                    />
                                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                                </div>
                                {/* Password usually not editable here directly or needs a "Create New Password" flow */}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Modules & Actions */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="tex-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Modules</h3>
                            <div className="space-y-3">
                                {availableModules.map(mod => (
                                    <div
                                        key={mod.id}
                                        onClick={() => handleModuleToggle(mod.id)}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.modules.includes(mod.id)
                                            ? 'bg-blue-50 border-blue-200'
                                            : 'bg-white border-gray-100 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className={`p-1.5 rounded ${formData.modules.includes(mod.id) ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                            <mod.icon size={14} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm font-medium ${formData.modules.includes(mod.id) ? 'text-blue-900' : 'text-gray-700'}`}>{mod.name}</span>
                                                {formData.modules.includes(mod.id) && <Check className="text-blue-600" size={14} />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {errors.modules && <p className="text-xs text-red-500 mt-3 text-center">Please select at least one module</p>}
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                                >
                                    <Save /> {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/psa/companies')}
                                    className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
