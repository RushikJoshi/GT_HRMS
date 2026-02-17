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
        <div className="min-h-screen bg-[#F0F2F5] p-4 sm:p-6 lg:p-10 font-sans selection:bg-emerald-100 selection:text-emerald-600">
            <div className="w-full mx-auto space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-emerald-600 p-6 sm:p-10 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="space-y-3 relative z-10">
                        <button
                            onClick={() => navigate('/super-admin/companies')}
                            className="group flex items-center gap-2 text-emerald-100 hover:text-white transition-all font-semibold text-[10px] sm:text-xs uppercase tracking-widest"
                        >
                            <ArrowLeft size={16} />
                            Back to Registry
                        </button>
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-none mb-2">Onboard Organization</h1>
                            <p className="text-emerald-100 font-medium text-sm sm:text-lg">Register and configure a new tenant entity.</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                    {/* Primary Info Card */}
                    <div className="bg-white rounded-2xl p-6 sm:p-10 md:p-16 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 sm:w-3 h-full bg-gradient-to-b from-emerald-500 to-teal-500"></div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">

                            {/* Brand Identity Section */}
                            <div className="lg:col-span-2 flex flex-col md:flex-row gap-8 sm:gap-10 items-center bg-slate-50/50 p-6 sm:p-8 rounded-2xl border border-slate-100 border-dashed">
                                <div className="relative group shrink-0">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-2xl border-4 border-dashed border-slate-200 hover:border-emerald-500 cursor-pointer transition-all flex items-center justify-center overflow-hidden group shadow-sm"
                                    >
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-4" />
                                        ) : (
                                            <div className="text-center space-y-2">
                                                <UploadCloud size={32} className="text-emerald-300 mx-auto group-hover:text-emerald-600 transition-colors" />
                                                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Upload Profile</p>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>

                                <div className="flex-1 w-full group">
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 sm:mb-4 ml-1">Organization Name</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-emerald-500 sm:w-6 sm:h-6 w-5 h-5" />
                                        <input
                                            type="text"
                                            name="name"
                                            placeholder="Legal entity name..."
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className={`w-full pl-12 sm:pl-16 pr-6 py-4 sm:py-6 bg-white rounded-xl border-2 ${errors.name ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-100'} focus:outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-800 text-base sm:text-lg placeholder:text-slate-300 shadow-sm`}
                                        />
                                    </div>
                                    {errors.name && <div className="mt-3 flex items-center gap-2 text-rose-600 text-[10px] font-bold uppercase tracking-widest px-2"> <AlertCircle size={14} /> {errors.name}</div>}
                                </div>
                            </div>

                            {/* Personnel Details */}
                            <div className="space-y-6 sm:space-y-8">
                                <div className="group">
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 sm:mb-4 ml-1">Master Administrator</label>
                                    <div className="relative">
                                        <User className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-emerald-400 sm:w-5 sm:h-5 w-4 h-4" />
                                        <input
                                            type="text"
                                            name="ownerName"
                                            placeholder="Full legal name"
                                            value={formData.ownerName}
                                            onChange={handleInputChange}
                                            className={`w-full pl-12 sm:pl-16 pr-6 py-4 sm:py-5 bg-slate-50/50 rounded-xl border-2 ${errors.ownerName ? 'border-rose-400' : 'border-slate-100'} focus:bg-white focus:outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-800 text-sm sm:text-base placeholder:text-slate-300`}
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 sm:mb-4 ml-1">Digital Mailbox</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-emerald-400 sm:w-5 sm:h-5 w-4 h-4" />
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="corporate@identity.com"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={`w-full pl-12 sm:pl-16 pr-6 py-4 sm:py-5 bg-slate-50/50 rounded-xl border-2 ${errors.email ? 'border-rose-400' : 'border-slate-100'} focus:bg-white focus:outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-800 text-sm sm:text-base placeholder:text-slate-300`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Access & Security Details */}
                            <div className="space-y-6 sm:space-y-8">
                                <div className="group">
                                    <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
                                        <label className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-widest">Access Key</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-800 transition-colors"
                                        >
                                            {showPassword ? 'Hide Secret' : 'Reveal Secret'}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-emerald-400 sm:w-5 sm:h-5 w-4 h-4" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="Establish root password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className={`w-full pl-12 sm:pl-16 pr-6 py-4 sm:py-5 bg-slate-50/50 rounded-xl border-2 ${errors.password ? 'border-rose-400' : 'border-slate-100'} focus:bg-white focus:outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-800 text-sm sm:text-base placeholder:text-slate-300`}
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 sm:mb-4 ml-1">Secure Line</label>
                                    <div className="relative">
                                        <Phone className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-emerald-400 sm:w-5 sm:h-5 w-4 h-4" />
                                        <input
                                            type="text"
                                            name="phone"
                                            placeholder="Telecommunication link"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 sm:pl-16 pr-6 py-4 sm:py-5 bg-slate-50/50 rounded-xl border-2 border-slate-100 focus:bg-white focus:outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-800 text-sm sm:text-base placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Geographic Presence */}
                            <div className="lg:col-span-2 group pt-2 sm:pt-4">
                                <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 sm:mb-4 ml-1">Spatial Hub Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-5 sm:left-6 top-6 text-emerald-400 sm:w-5 sm:h-5 w-4 h-4" />
                                    <textarea
                                        name="address"
                                        rows="4"
                                        placeholder="Full geographic headquarters location..."
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 sm:pl-16 pr-6 py-5 sm:py-6 bg-slate-50/50 rounded-xl border-2 border-slate-100 focus:bg-white focus:outline-none focus:ring-8 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-800 text-sm sm:text-base placeholder:text-slate-300 resize-none shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Capability Notification */}
                        <div className="mt-8 sm:mt-12 p-6 sm:p-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-center gap-6 shadow-sm text-center sm:text-left">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                <Zap size={28} className="animate-pulse" />
                            </div>
                            <div>
                                <h4 className="text-[11px] sm:text-sm font-bold text-emerald-800 uppercase tracking-widest mb-1">Provisioning Protocol</h4>
                                <p className="text-[9px] sm:text-[11px] font-bold text-emerald-600 leading-relaxed uppercase tracking-wider">Entity will be instantiated with {Object.values(defaultEnabledModules).filter(Boolean).length} core capability modules enabled by default.</p>
                            </div>
                        </div>
                    </div>

                    {/* Master Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-4 sm:gap-6 pt-4 sm:pt-6 pb-12 sm:pb-20">
                        <button
                            type="button"
                            onClick={() => navigate('/super-admin/companies')}
                            className="w-full sm:w-auto px-10 py-4 sm:py-5 font-bold text-[10px] sm:text-xs uppercase tracking-[0.25em] text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center gap-2"
                        >
                            <X size={18} /> Discard
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto relative group bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-12 sm:px-20 py-5 sm:py-6 rounded-xl font-bold text-[10px] sm:text-sm uppercase tracking-[0.25em] shadow-xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 overflow-hidden flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <> <div className="w-4 h-4 sm:w-5 sm:h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> Syncing... </>
                            ) : (
                                <> <Check size={20} /> Deploy Entity </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
