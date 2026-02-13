import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { showToast } from '../../../utils/uiNotifications';
import {
    Shield, Search, Filter, CheckCircle, XCircle, Clock, AlertCircle,
    Eye, Download, ChevronRight, User, Calendar, FileText, ArrowRight,
    Package, TrendingUp, AlertTriangle, PlayCircle, CheckSquare, XSquare
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import InitiateBGVModal from './InitiateBGVModal';
import BGVDetailModal from './BGVDetailModal';


dayjs.extend(relativeTime);

const BGVDashboard = () => {
    const [cases, setCases] = useState([]);
    const [stats, setStats] = useState(null);
    const [riskStats, setRiskStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [packageFilter, setPackageFilter] = useState('all');
    const [selectedCase, setSelectedCase] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showInitiateModal, setShowInitiateModal] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchStats();
        fetchRiskDashboard();
        fetchCases();
    }, [page, statusFilter, packageFilter, searchQuery]);

    const fetchRiskDashboard = async () => {
        try {
            const res = await api.get('/bgv/risk-dashboard');
            setRiskStats(res.data.data);
        } catch (err) {
            console.error('Failed to fetch risk dashboard:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/bgv/stats');
            setStats(res.data.data);
        } catch (err) {
            console.error('Failed to fetch BGV stats:', err);
        }
    };

    const fetchCases = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 20,
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(packageFilter !== 'all' && { package: packageFilter }),
                ...(searchQuery && { search: searchQuery })
            };

            const res = await api.get('/bgv/cases', { params });
            const casesData = res.data.data || [];

            // Fetch risk scores for each case
            const casesWithRisk = await Promise.all(
                casesData.map(async (caseItem) => {
                    try {
                        const riskRes = await api.get(`/bgv/case/${caseItem._id}/risk-score`);
                        return {
                            ...caseItem,
                            riskScore: riskRes.data.data?.riskScore || null
                        };
                    } catch (err) {
                        // If risk score not found, return case without it
                        return { ...caseItem, riskScore: null };
                    }
                })
            );

            setCases(casesWithRisk);
            setTotalPages(res.data.pagination?.pages || 1);
        } catch (err) {
            console.error('Failed to fetch BGV cases:', err);
            showToast('error', 'Error', 'Failed to load background verification cases');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (caseItem) => {
        try {
            const res = await api.get(`/bgv/case/${caseItem._id}`);
            setSelectedCase(res.data.data);
            setShowDetailModal(true);
        } catch (err) {
            showToast('error', 'Error', 'Failed to load case details');
        }
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'VERIFIED': return 'bg-emerald-500 text-white';
            case 'VERIFIED_WITH_DISCREPANCIES': return 'bg-blue-500 text-white';
            case 'FAILED': return 'bg-rose-500 text-white';
            case 'IN_PROGRESS': return 'bg-amber-500 text-white';
            case 'PENDING': return 'bg-slate-400 text-white';
            case 'CLOSED': return 'bg-purple-500 text-white';
            default: return 'bg-slate-300 text-slate-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'VERIFIED': return <CheckCircle size={16} />;
            case 'VERIFIED_WITH_DISCREPANCIES': return <Shield size={16} />;
            case 'FAILED': return <XCircle size={16} />;
            case 'IN_PROGRESS': return <Clock size={16} />;
            case 'PENDING': return <AlertCircle size={16} />;
            case 'CLOSED': return <CheckSquare size={16} />;
            default: return <AlertCircle size={16} />;
        }
    };

    const getPackageBadge = (pkg) => {
        const styles = {
            BASIC: 'bg-slate-100 text-slate-700 border-slate-200',
            STANDARD: 'bg-blue-100 text-blue-700 border-blue-200',
            PREMIUM: 'bg-purple-100 text-purple-700 border-purple-200'
        };
        return styles[pkg] || styles.BASIC;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-200">
                            <Shield size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                                Background Verification
                            </h1>
                            <p className="text-slate-600 font-medium mt-1">
                                Secure, auditable, and compliant verification workflow
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowInitiateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
                    >
                        <PlayCircle size={20} />
                        Initiate BGV
                    </button>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <StatCard
                            title="Total Cases"
                            value={stats.total}
                            icon={<FileText size={24} />}
                            color="blue"
                            trend="+12%"
                        />
                        <StatCard
                            title="Pending"
                            value={stats.pending}
                            icon={<Clock size={24} />}
                            color="amber"
                            onClick={() => setStatusFilter('PENDING')}
                        />
                        <StatCard
                            title="Verified"
                            value={stats.verified}
                            icon={<CheckCircle size={24} />}
                            color="emerald"
                            onClick={() => setStatusFilter('VERIFIED')}
                        />
                        <StatCard
                            title="Failed"
                            value={stats.failed}
                            icon={<XCircle size={24} />}
                            color="rose"
                            onClick={() => setStatusFilter('FAILED')}
                        />
                        <StatCard
                            title="Overdue"
                            value={stats.overdue}
                            icon={<AlertTriangle size={24} />}
                            color="orange"
                            urgent={stats.overdue > 0}
                        />
                    </div>
                )}

                {/* 🔥 NEW: Risk Dashboard Section */}
                {riskStats && (
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-rose-500 to-orange-500 rounded-lg">
                                    <AlertTriangle size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Risk Assessment Dashboard</h2>
                                    <p className="text-sm text-slate-600">Real-time risk scoring across all BGV cases</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-600">Average Risk Score</p>
                                <p className="text-2xl font-bold text-slate-900">{riskStats.averageRiskScore?.toFixed(1) || '0.0'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <RiskCard
                                level="CLEAR"
                                count={riskStats.summary?.CLEAR || 0}
                                color="emerald"
                                icon={<CheckCircle size={24} />}
                                description="No issues found"
                            />
                            <RiskCard
                                level="LOW RISK"
                                count={riskStats.summary?.LOW_RISK || 0}
                                color="blue"
                                icon={<Shield size={24} />}
                                description="Minor discrepancies"
                            />
                            <RiskCard
                                level="MODERATE"
                                count={riskStats.summary?.MODERATE_RISK || 0}
                                color="amber"
                                icon={<AlertCircle size={24} />}
                                description="Requires review"
                            />
                            <RiskCard
                                level="HIGH RISK"
                                count={riskStats.summary?.HIGH_RISK || 0}
                                color="orange"
                                icon={<AlertTriangle size={24} />}
                                description="Significant issues"
                            />
                            <RiskCard
                                level="CRITICAL"
                                count={riskStats.summary?.CRITICAL || 0}
                                color="rose"
                                icon={<XCircle size={24} />}
                                description="Severe concerns"
                                urgent={true}
                            />
                        </div>

                        {riskStats.highRiskCases && riskStats.highRiskCases.length > 0 && (
                            <div className="mt-4 p-4 bg-rose-50 border-2 border-rose-200 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle size={18} className="text-rose-600" />
                                    <h3 className="font-bold text-rose-900">High-Risk Cases Requiring Attention</h3>
                                </div>
                                <div className="space-y-2">
                                    {riskStats.highRiskCases.slice(0, 3).map((riskCase) => (
                                        <div key={riskCase.caseId} className="flex items-center justify-between bg-white p-3 rounded-lg">
                                            <div>
                                                <p className="font-semibold text-slate-900">{riskCase.caseId}</p>
                                                <p className="text-sm text-slate-600">{riskCase.candidateName}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-sm text-slate-600">Risk Score</p>
                                                    <p className="text-lg font-bold text-rose-600">{riskCase.totalRiskScore}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskCase.riskLevel === 'CRITICAL' ? 'bg-rose-500 text-white' : 'bg-orange-500 text-white'
                                                    }`}>
                                                    {riskCase.riskLevel}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by case ID or candidate name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-medium"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-medium appearance-none bg-white"
                        >
                            <option value="all">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="VERIFIED_WITH_DISCREPANCIES">Verified with Discrepancies</option>
                            <option value="FAILED">Failed</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>

                    {/* Package Filter */}
                    <div className="relative">
                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <select
                            value={packageFilter}
                            onChange={(e) => setPackageFilter(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-medium appearance-none bg-white"
                        >
                            <option value="all">All Packages</option>
                            <option value="BASIC">Basic</option>
                            <option value="STANDARD">Standard</option>
                            <option value="PREMIUM">Premium</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Cases Table */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                ) : cases.length === 0 ? (
                    <div className="text-center py-20">
                        <Shield size={64} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-xl font-bold text-slate-400">No BGV cases found</p>
                        <p className="text-slate-500 mt-2">Start by initiating a new background verification</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Case ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Candidate</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Package</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Risk Score</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Progress</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">SLA</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Initiated</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {cases.map((caseItem) => (
                                        <tr key={caseItem._id} className="hover:bg-blue-50/50 transition-all group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={16} className="text-blue-600" />
                                                    <span className="font-bold text-slate-900">{caseItem.caseId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-bold text-slate-900">{caseItem.candidateName}</div>
                                                    <div className="text-sm text-slate-500">{caseItem.candidateEmail}</div>
                                                    <div className="text-xs text-slate-400 mt-1">{caseItem.jobTitle}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black uppercase ${getPackageBadge(caseItem.package)}`}>
                                                    <Package size={12} />
                                                    {caseItem.package}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase ${getStatusStyles(caseItem.overallStatus)}`}>
                                                    {getStatusIcon(caseItem.overallStatus)}
                                                    {caseItem.overallStatus?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {caseItem.riskScore ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-right">
                                                            <div className="text-lg font-black text-slate-900">{caseItem.riskScore.totalRiskScore || 0}</div>
                                                            <div className="text-xs text-slate-500">points</div>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${caseItem.riskScore.riskLevel === 'CLEAR' ? 'bg-emerald-100 text-emerald-700' :
                                                            caseItem.riskScore.riskLevel === 'LOW_RISK' ? 'bg-blue-100 text-blue-700' :
                                                                caseItem.riskScore.riskLevel === 'MODERATE_RISK' ? 'bg-amber-100 text-amber-700' :
                                                                    caseItem.riskScore.riskLevel === 'HIGH_RISK' ? 'bg-orange-100 text-orange-700' :
                                                                        'bg-rose-100 text-rose-700'
                                                            }`}>
                                                            {caseItem.riskScore.riskLevel?.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">Not assessed</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {caseItem.checksProgress && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                                                    style={{ width: `${caseItem.checksProgress.percentage}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">{caseItem.checksProgress.percentage}%</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {caseItem.checksProgress.verified}/{caseItem.checksProgress.total} verified
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {caseItem.sla && (
                                                    <div className={`text-sm font-bold ${caseItem.sla.isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                                        {caseItem.sla.isOverdue ? (
                                                            <span className="flex items-center gap-1">
                                                                <AlertTriangle size={14} />
                                                                Overdue
                                                            </span>
                                                        ) : (
                                                            dayjs(caseItem.sla.dueDate).fromNow()
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600">
                                                    {dayjs(caseItem.initiatedAt).format('MMM DD, YYYY')}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {dayjs(caseItem.initiatedAt).fromNow()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(caseItem)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                                <div className="text-sm text-slate-600">
                                    Page {page} of {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 bg-white border-2 border-slate-200 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 bg-white border-2 border-slate-200 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {showInitiateModal && (
                <InitiateBGVModal
                    onClose={() => setShowInitiateModal(false)}
                    onSuccess={() => {
                        setShowInitiateModal(false);
                        fetchCases();
                        fetchStats();
                    }}
                />
            )}

            {showDetailModal && selectedCase && (
                <BGVDetailModal
                    caseData={selectedCase}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedCase(null);
                    }}
                    onUpdate={() => {
                        fetchCases();
                        fetchStats();
                    }}
                />
            )}

        </div>
    );
};

// Statistics Card Component
const StatCard = ({ title, value, icon, color, trend, onClick, urgent }) => {
    const colorStyles = {
        blue: 'from-blue-500 to-blue-600 shadow-blue-200',
        amber: 'from-amber-500 to-amber-600 shadow-amber-200',
        emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
        rose: 'from-rose-500 to-rose-600 shadow-rose-200',
        orange: 'from-orange-500 to-orange-600 shadow-orange-200'
    };

    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-2xl shadow-lg border border-slate-200 p-6 ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-105' : ''} transition-all duration-200 ${urgent ? 'ring-2 ring-rose-500 animate-pulse' : ''}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${colorStyles[color]} rounded-xl shadow-lg`}>
                    <div className="text-white">{icon}</div>
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-emerald-600 text-sm font-bold">
                        <TrendingUp size={14} />
                        {trend}
                    </div>
                )}
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</div>
        </div>
    );
};

// 🔥 NEW: Risk Card Component
const RiskCard = ({ level, count, color, icon, description, urgent = false }) => {
    const colorStyles = {
        emerald: 'from-emerald-500 to-teal-500',
        blue: 'from-blue-500 to-indigo-500',
        amber: 'from-amber-500 to-yellow-500',
        orange: 'from-orange-500 to-red-500',
        rose: 'from-rose-500 to-pink-500'
    };

    const bgStyles = {
        emerald: 'bg-emerald-50 border-emerald-200',
        blue: 'bg-blue-50 border-blue-200',
        amber: 'bg-amber-50 border-amber-200',
        orange: 'bg-orange-50 border-orange-200',
        rose: 'bg-rose-50 border-rose-200'
    };

    return (
        <div className={`${bgStyles[color]} border-2 rounded-xl p-4 ${urgent ? 'ring-2 ring-rose-500 animate-pulse' : ''} transition-all`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 bg-gradient-to-br ${colorStyles[color]} rounded-lg shadow-lg`}>
                    <div className="text-white">{icon}</div>
                </div>
                <div className="text-3xl font-black text-slate-900">{count}</div>
            </div>
            <div className="font-bold text-slate-900 mb-1">{level}</div>
            <div className="text-xs text-slate-600">{description}</div>
        </div>
    );
};

export default BGVDashboard;
