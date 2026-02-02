import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobPortalAuth } from '../../context/JobPortalAuthContext';
import api from '../../utils/api';
import { getCompany, getTenantId } from '../../utils/auth';
import {
    Briefcase, MapPin, Clock, ArrowRight, Layers,
    TrendingUp, CheckCircle2, XCircle, AlertCircle, Sparkles
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
            const tid = candidate?.tenantId || getTenantId();

            if (!tid) {
                setError("Company identification lost. Please log in again.");
                setLoading(false);
                return;
            }

            let applications = [];
            try {
                const dashRes = await api.get(`/candidate/dashboard`);
                if (dashRes.data) {
                    applications = dashRes.data.applications || [];
                }
            } catch (dashErr) {
                console.warn("Could not fetch candidate stats:", dashErr.message);
            }

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
                <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Dashboard...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="h-[60vh] flex items-center justify-center">
            <div className="max-w-md bg-white p-10 rounded-[2rem] shadow-[0px_8px_16px_rgba(0,0,0,0.06)] border border-slate-100 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Oops! Something went wrong</h3>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">{error}</p>
                <button
                    onClick={fetchData}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-10 py-3.5 rounded-full font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 mx-auto"
                >
                    Retry Now
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Luxury Header Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-700 to-indigo-900 rounded-[2.5rem] p-12 lg:p-16 text-white shadow-2xl shadow-indigo-100">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/20 to-purple-500/0 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] -ml-24 -mb-24"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl w-fit px-5 py-2 rounded-full mb-8 border border-white/10 shadow-inner">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Executive Dashboard</span>
                    </div>

                    <div className="max-w-3xl">
                        <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-tight mb-6">
                            Welcome back, <span className="bg-gradient-to-r from-indigo-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent">{candidate?.name?.split(' ')[0] || 'Candidate'}</span><span className="text-white">.</span>
                        </h1>
                        <p className="text-slate-400 font-medium text-xl leading-relaxed max-w-2xl">
                            You're doing great. You have <span className="text-white font-bold">{stats.total}</span> active applications
                            at <span className="text-indigo-400 font-bold">{companyName || 'our firm'}</span>.
                            Let's find your next big opportunity today.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-12">
                        <button
                            onClick={() => navigate('/candidate/open-positions')}
                            className="px-8 py-4 bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/20 flex items-center gap-3 active:scale-95"
                        >
                            View Openings <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={() => navigate('/candidate/profile')}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md active:scale-95"
                        >
                            Update Profile
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Luxury Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'Total Applied', value: stats.total, icon: Layers, gradient: 'from-indigo-50 to-white', iconBg: 'bg-indigo-600', iconText: 'text-white', shadow: 'shadow-indigo-100/50' },
                    { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, gradient: 'from-amber-50 to-white', iconBg: 'bg-amber-500', iconText: 'text-white', shadow: 'shadow-amber-100/50' },
                    { label: 'Shortlisted', value: stats.selected, icon: CheckCircle2, gradient: 'from-emerald-50 to-white', iconBg: 'bg-emerald-500', iconText: 'text-white', shadow: 'shadow-emerald-100/50' },
                    { label: 'Not Proceeded', value: stats.rejected, icon: XCircle, gradient: 'from-rose-50 to-white', iconBg: 'bg-rose-500', iconText: 'text-white', shadow: 'shadow-rose-100/50' },
                ].map((stat, idx) => (
                    <div
                        key={idx}
                        className={`group bg-gradient-to-br ${stat.gradient} p-10 rounded-[2.5rem] border border-white shadow-xl ${stat.shadow} hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden`}
                    >
                        {/* Subtle decorative number background */}
                        <span className="absolute -right-4 -bottom-4 text-9xl font-black text-indigo-900/5 select-none pointer-events-none group-hover:scale-110 transition-transform duration-500">
                            {stat.value}
                        </span>

                        <div className={`w-14 h-14 ${stat.iconBg} ${stat.iconText} rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                            <stat.icon className="w-7 h-7" />
                        </div>

                        <div className="relative z-10">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
                            <h3 className="text-5xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>


        </div>
    );
}
