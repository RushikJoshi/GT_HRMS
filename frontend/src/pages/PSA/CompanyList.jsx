import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    Eye,
    Edit2,
    Power,
    EyeOff,
    ExternalLink,
    Briefcase,
    Plus,
    Users,
    Activity,
    Mail,
    Lock
} from 'lucide-react';
import companiesService from '../../services/companiesService';

export default function CompanyList() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [revealPassword, setRevealPassword] = useState({});

    // Environment helper
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
    const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const data = await companiesService.getAllCompanies();
            setCompanies(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load companies', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (company) => {
        if (!window.confirm(`Are you sure you want to ${company.status === 'active' ? 'deactivate' : 'activate'} this company?`)) return;
        try {
            await companiesService.toggleCompanyStatus(company._id, company.status);
            fetchCompanies();
        } catch (error) {
            alert('Status update failed');
        }
    };

    const togglePassword = (id) => {
        setRevealPassword(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getLogoUrl = (url) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
    };

    const filteredCompanies = companies.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.meta?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: companies.length,
        active: companies.filter(c => c.status === 'active').length,
        inactive: companies.filter(c => c.status !== 'active').length
    };

    return (
        <div className="p-8 bg-[#F8FAFC] min-h-screen font-sans selection:bg-indigo-100 selection:text-indigo-600">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">

                {/* Header Area */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                <Briefcase size={22} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Companies</h1>
                        </div>
                        <p className="text-slate-500 font-medium ml-1">Central ecosystem management for all tenant organizations.</p>
                    </div>
                    <button
                        onClick={() => navigate('/psa/companies/add')}
                        className="bg-slate-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-xl shadow-slate-200 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        <Plus size={18} /> Onboard New Company
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Total Companies', value: stats.total, icon: Users, color: 'bg-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-600' },
                        { label: 'Active Companies', value: stats.active, icon: Activity, color: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
                        { label: 'Inactive Companies', value: stats.inactive, icon: Power, color: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-500' }
                    ].map((s, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-md transition-shadow">
                            <div className={`w-14 h-14 ${s.bg} ${s.text} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                                <s.icon size={26} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tight">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">

                    {/* Control Bar */}
                    <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full max-w-md group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Filter companies by name, code or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 border border-slate-200 rounded-2xl hover:bg-white transition-all">
                                <Filter size={14} /> Filter
                            </button>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Branding</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Code</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Credentials</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ecosystem Status</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Synchronizing Data...</td></tr>
                                ) : filteredCompanies.length === 0 ? (
                                    <tr><td colSpan="5" className="p-12 text-center text-slate-400 font-medium">No organizations found in the current landscape.</td></tr>
                                ) : (
                                    filteredCompanies.map((company) => (
                                        <tr key={company._id} className="hover:bg-indigo-50/20 transition-all group">
                                            <td className="px-8 py-6 min-w-[280px]">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-14 w-14 flex-shrink-0 bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center">
                                                        {getLogoUrl(company.meta?.logo) ? (
                                                            <img src={getLogoUrl(company.meta.logo)} alt="" className="h-full w-full object-contain p-1" />
                                                        ) : (
                                                            <span className="text-xl font-black text-slate-300">{company.name?.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-base font-bold text-slate-900 leading-none mb-1.5 group-hover:text-indigo-600 transition-colors truncate" title={company.name}>{company.name}</h3>
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <Mail size={12} className="shrink-0" />
                                                            <span className="text-xs font-semibold truncate" title={company.meta?.primaryEmail}>{company.meta?.primaryEmail}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 font-mono tracking-wider">
                                                    {company.code}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 min-w-[240px]">
                                                <div className="space-y-1.5">
                                                    <div className="text-xs font-bold text-slate-600 truncate max-w-[220px]" title={company.meta?.email}>
                                                        {company.meta?.email}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1.5 rounded-md">
                                                            <Lock size={10} className="text-slate-400" />
                                                            <span className="text-[10px] font-mono text-slate-500">
                                                                {revealPassword[company._id] ? company.meta?.adminPassword : '••••••••'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => togglePassword(company._id)}
                                                            className="text-slate-300 hover:text-indigo-600 transition-colors shrink-0"
                                                        >
                                                            {revealPassword[company._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`${company.status === 'active'
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        : 'bg-rose-50 text-rose-600 border-rose-100'
                                                    } flex items-center gap-2 w-fit px-3.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${company.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></div>
                                                    {company.status === 'active' ? 'Operational' : 'Restricted'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right min-w-[200px]">
                                                <div className="flex items-center justify-end gap-2.5 group-hover:translate-x-[-4px] transition-transform">
                                                    <button
                                                        onClick={() => navigate(`/psa/companies/view/${company._id}`)}
                                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm shrink-0"
                                                        title="Detailed Intel"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/psa/companies/edit/${company._id}`)}
                                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0"
                                                        title="Modify Config"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => window.open(`/jobs/${company.code}`, '_blank')}
                                                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm shrink-0"
                                                        title="Launch Portal"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(company)}
                                                        className={`w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 transition-all shadow-sm shrink-0 ${company.status === 'active'
                                                                ? 'text-rose-400 hover:bg-rose-600 hover:text-white'
                                                                : 'text-emerald-400 hover:bg-emerald-600 hover:text-white'
                                                            }`}
                                                        title={company.status === 'active' ? 'Kill Process' : 'Resume Process'}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 bg-slate-50/50 border-t border-slate-50 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest decoration-indigo-200 underline-offset-4">
                            End of organizational landscape • {filteredCompanies.length} entries shown
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
