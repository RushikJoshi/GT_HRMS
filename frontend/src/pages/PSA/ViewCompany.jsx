import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Mail,
    Globe,
    Calendar,
    CheckCircle,
    Package,
    Edit3,
    Hash,
    Shield
} from 'lucide-react';
import companiesService from '../../services/companiesService';

export default function ViewCompany() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helper for safe logo URL
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
            setCompany(data);
        } catch (error) {
            console.error('Failed to load company details', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!company) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="text-red-500 text-xl font-semibold mb-2">Company not found</div>
            <button onClick={() => navigate('/psa/companies')} className="text-blue-600 hover:underline">
                Return to Companies List
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-12">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-8 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/psa/companies')}
                        className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Company Profile</h1>
                        <p className="text-xs text-gray-500">View and manage tenant details</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/psa/companies/edit/${company._id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
                >
                    <Edit3 /> Edit Company
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* 1. Hero Section */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center gap-8">
                    {/* Logo Box */}
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-50 rounded-2xl border border-gray-200 p-2 flex items-center justify-center shadow-inner">
                        {company.meta?.logo ? (
                            <img src={getLogoUrl(company.meta.logo)} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-4xl font-bold text-gray-300 select-none">{company.name?.charAt(0)}</span>
                        )}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{company.name}</h1>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md font-mono text-gray-600">
                                        <Hash className="text-gray-400" /> {company.code}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Globe className="text-gray-400" /> {company.domain || 'No domain configured'}
                                    </span>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className={`px-4 py-1.5 rounded-full text-sm font-semibold border flex items-center gap-2 ${company.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${company.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                {company.status === 'active' ? 'Active Subscription' : 'Inactive Account'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* 2. Contact & Admin Information */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Shield className="text-blue-500" /> Admin Contact
                                </h3>
                            </div>
                            <div className="p-6 space-y-5">
                                <div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Primary Email</div>
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                            <Mail size={18} />
                                        </div>
                                        <span className="font-medium">{company.meta?.email || 'N/A'}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Backup Email / Owner</div>
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                            <Mail size={18} />
                                        </div>
                                        <span className="font-medium">{company.meta?.primaryEmail || 'N/A'}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Created On</div>
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                            <Calendar size={18} />
                                        </div>
                                        <span className="font-medium">
                                            {new Date(company.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Modules & System Plan */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Package className="text-indigo-500" /> Subscribed Modules
                                </h3>
                                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    Plan: {company.plan?.toUpperCase() || 'STANDARD'}
                                </span>
                            </div>
                            <div className="p-8">
                                {company.modules && company.modules.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {company.modules.map((mod) => (
                                            <div key={mod} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <CheckCircle size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-900 capitalize">{mod.replace('-', ' ')}</h4>
                                                    <span className="text-xs text-green-600 font-medium">Active</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Package className="text-gray-300 w-8 h-8" />
                                        </div>
                                        <h3 className="text-gray-900 font-medium">No Modules Active</h3>
                                        <p className="text-gray-500 text-sm mt-1">This company has not subscribed to any modules yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
