import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    Eye,
    Edit2,
    Power,
    EyeOff,
    ExternalLink
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

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Companies</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage all tenant companies from here.</p>
                    </div>
                    {/* Button removed as per request */}
                </div>

                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Filter /> Filter
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading companies...</div>
                    ) : filteredCompanies.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No companies found. Add one to get started.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Admin Account</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Modules</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCompanies.map((company) => (
                                        <tr key={company._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                                {company.code}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap max-w-[250px]">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">
                                                        {getLogoUrl(company.meta?.logo) ? (
                                                            <img src={getLogoUrl(company.meta.logo)} alt="" className="h-full w-full object-contain" />
                                                        ) : (
                                                            company.name?.charAt(0)
                                                        )}
                                                    </div>
                                                    <div className="ml-4 overflow-hidden">
                                                        <div className="text-sm font-medium text-gray-900 truncate" title={company.name}>{company.name}</div>
                                                        <div className="text-xs text-gray-500 truncate" title={company.meta?.primaryEmail}>{company.meta?.primaryEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap max-w-[200px]">
                                                <div className="text-xs text-gray-500">
                                                    <div className="truncate" title={company.meta?.email}>{company.meta?.email}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <code className="bg-gray-100 px-1 rounded">
                                                            {revealPassword[company._id] ? company.meta?.adminPassword : '••••••'}
                                                        </code>
                                                        <button onClick={() => togglePassword(company._id)} className="text-gray-400 hover:text-blue-600">
                                                            {revealPassword[company._id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {company.modules?.slice(0, 3).map(m => (
                                                        <span key={m} className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded border border-blue-100 capitalize">
                                                            {m.replace('-', ' ')}
                                                        </span>
                                                    ))}
                                                    {company.modules?.length > 3 && (
                                                        <span className="px-1.5 py-0.5 text-xs text-gray-500 bg-gray-100 rounded">+{company.modules.length - 3}</span>
                                                    )}
                                                    {(!company.modules?.length) && <span className="text-gray-400 text-xs italic">-</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${company.status === 'active'
                                                    ? 'bg-green-50 text-green-700 border-green-100'
                                                    : 'bg-red-50 text-red-700 border-red-100'
                                                    }`}>
                                                    {company.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button onClick={() => navigate(`/psa/companies/view/${company._id}`)} className="text-gray-400 hover:text-blue-600" title="View">
                                                        <Eye size={16} />
                                                    </button>
                                                    <button onClick={() => navigate(`/psa/companies/edit/${company._id}`)} className="text-gray-400 hover:text-green-600" title="Edit">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => window.open(`/jobs/${company.code}`, '_blank')} className="text-gray-400 hover:text-indigo-600" title="Public Portal">
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button onClick={() => handleToggleStatus(company)} className={`text-gray-400 ${company.status === 'active' ? 'hover:text-red-600' : 'hover:text-green-600'}`} title="Toggle Status">
                                                        <Power size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
