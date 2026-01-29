import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import api from '../../utils/api';
import { getCompany, getTenantId } from '../../utils/auth';
import {
    Briefcase, MapPin, Clock, ArrowRight, Layers,
    TrendingUp, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

export default function CandidateDashboard() {
    const navigate = useNavigate();
    const { candidate } = useJobPortalAuth();
    const [stats, setStats] = useState({ total: 0, applied: 0, inProgress: 0, selected: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [companyName, setCompanyName] = useState('Careers');
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Get Tenant ID from Auth Context or fallback to storage
            const tid = candidate?.tenantId || getTenantId();

            if (!tid) {
                console.warn("Dashboard loaded without tenantId context");
                setError("Company identification lost. Please log in again.");
                setLoading(false);
                return;
            }

            // 2. Fetch applications for stats (Protected route, token in headers)
            let applications = [];
            try {
                const dashRes = await api.get(`/jobs/candidate/dashboard`);
                if (dashRes.data) {
                    applications = dashRes.data.applications || [];
                }
            } catch (dashErr) {
                console.warn("Could not fetch candidate stats:", dashErr.message);
                // We'll continue with empty apps instead of failing completely
            }

            // Calculate or read detailed stats
            const isArray = Array.isArray(applications);
            setStats({
                total: isArray ? applications.length : (applications.total || 0),
                applied: isArray
                    ? applications.filter(a => a?.status && a.status.toLowerCase() === 'applied').length
                    : (applications.applied || 0),
                inProgress: isArray
                    ? applications.filter(a => {
                        if (!a?.status) return false;
                        const status = a.status.toLowerCase();
                        return !['hired', 'rejected', 'selected', 'offered'].includes(status);
                    }).length
                    : (applications.inProgress || 0),
                selected: isArray
                    ? applications.filter(a => {
                        if (!a?.status) return false;
                        const status = a.status.toLowerCase();
                        return ['hired', 'selected', 'offered'].includes(status);
                    }).length
                    : (applications.selected || 0),
                rejected: isArray
                    ? applications.filter(a => a?.status && a.status.toLowerCase() === 'rejected').length
                    : (applications.rejected || 0),
                items: isArray ? applications : (applications.items || [])
            });

        } catch (err) {
            console.error("Dashboard Global Error:", err);
            setError(err.response?.data?.error || "Failed to load dashboard data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [candidate]);

    useEffect(() => {
        const company = getCompany();
        if (company?.name) {
            setCompanyName(company.name);
        }
        fetchData();
    }, [fetchData]);

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Loading Dashboard...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="text-xl font-black text-gray-900 mb-2">Oops! Something went wrong</h3>
                <p className="text-gray-500 font-medium mb-6">{error}</p>
                <button
                    onClick={fetchData}
                    className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all"
                >
                    Retry
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20 px-4 sm:px-0">
            {/* Header Section */}
            <div>
                <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                    {companyName}<span className="text-blue-600">.</span>
                </h1>
                <p className="text-gray-500 font-medium mt-3 text-lg">
                    Hello, <span className="text-blue-600 font-black">{candidate?.name || 'Candidate'}</span>.
                    Track your applications and career progress here.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {[
                    { label: 'Total Applied', value: stats.total, icon: Layers, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
                    { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600' },
                    { label: 'Selected', value: stats.selected, icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' },
                    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 group">
                        <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.text} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                            <stat.icon className="w-7 h-7" />
                        </div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-4xl font-black text-gray-900 mt-2 tracking-tighter">{stat.value}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
}
