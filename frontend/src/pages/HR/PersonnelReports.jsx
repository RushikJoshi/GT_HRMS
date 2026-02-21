import React, { useState, useEffect } from 'react';
import {
    Users, UserMinus, UserPlus, TrendingUp,
    AlertCircle, Download, Filter,
    Calendar, Building2, Briefcase, ChevronRight,
    BarChart3, Clock, CheckCircle2
} from 'lucide-react';
import api from '../../utils/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

const PersonnelReports = () => {
    const [activeTab, setActiveTab] = useState('existing');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        existing: [],
        replacements: [],
        analytics: null,
        sla: []
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'existing') {
                const res = await api.get('/reports/existing-employees');
                setData(prev => ({ ...prev, existing: res.data.data }));
            } else if (activeTab === 'replacement') {
                const res = await api.get('/reports/replacements');
                setData(prev => ({ ...prev, replacements: res.data.data }));
            } else if (activeTab === 'analytics') {
                const res = await api.get('/reports/analytics');
                setData(prev => ({ ...prev, analytics: res.data.data }));
            } else if (activeTab === 'sla') {
                const res = await api.get('/reports/sla');
                setData(prev => ({ ...prev, sla: res.data.data }));
            }
        } catch (err) {
            console.error("Failed to fetch report data", err);
        } finally {
            setLoading(false);
        }
    };

    const renderExistingReport = () => (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {data.existing.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm group hover:border-[#14B8A6]/30 transition-all">
                        <div className="flex justify-between items-start mb-1.5">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-widest truncate max-w-[120px] leading-tight">{item.department}</span>
                                <span className="text-[7px] font-medium text-slate-400 uppercase tracking-tighter">Team Staffing Overview</span>
                            </div>
                            <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight ${item.utilization > 90 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' : 'bg-teal-50 text-teal-600 dark:bg-teal-950/20'}`}>
                                {item.utilization.toFixed(0)}% Utilized
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{item.active}</span>
                            <span className="text-[10px] font-bold text-slate-400 leading-none">/ {item.budgeted} Currently Working</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <div className="flex-1 h-1.5 bg-slate-50 dark:bg-slate-950 rounded-full overflow-hidden shadow-inner border border-slate-200/20 dark:border-slate-800/20">
                                <div
                                    className="h-full bg-gradient-to-r from-[#14B8A6] to-teal-400 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(100, item.utilization)}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                            <div className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                                <div className="text-xs font-black text-slate-800 dark:text-white leading-none">{item.vacant}</div>
                                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Open Positions</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
                                <div className="text-xs font-black text-slate-800 dark:text-white leading-none">{item.notice + item.resigned}</div>
                                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Leaving Soon</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Premium Table Analysis */}
            {/* Dashboard Card-List Analysis */}
            <div className="space-y-3 pt-2">
                {/* Header Labels - Aligned to card sections */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1.2fr] px-10 py-2 opacity-60">
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Building2 size={12} className="text-[#14B8A6]" /> Department
                    </div>
                    <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Allowed</div>
                    <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Working</div>
                    <div className="text-right text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Open</div>
                    <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Notice</div>
                    <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Left</div>
                    <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pr-4">Utilization</div>
                </div>

                {/* Individual Data Cards */}
                {data.existing.map((row, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_1.2fr] items-center px-10 py-4 rounded-[2rem] border border-transparent dark:border-slate-800/40 shadow-sm hover:shadow-md hover:border-[#14B8A6]/30 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800/50 group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors shadow-inner">
                                <Briefcase size={16} className="text-[#14B8A6]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight leading-none">{row.department}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">HR Operations</span>
                            </div>
                        </div>
                        <div className="text-right text-sm font-black text-slate-600 dark:text-slate-400">{row.budgeted}</div>
                        <div className="text-right text-sm font-black text-teal-600 dark:text-teal-400">{row.active}</div>
                        <div className="text-right text-sm font-black text-rose-500">{row.vacant}</div>
                        <div className="text-right text-sm font-black text-amber-500">{row.notice}</div>
                        <div className="text-right text-sm font-black text-slate-400">{row.resigned}</div>
                        <div className="flex items-center justify-end gap-3">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#14B8A6] to-cyan-400 rounded-full transition-all duration-1000"
                                    style={{ width: `${row.utilization}%` }}
                                ></div>
                            </div>
                            <span className={`text-[11px] font-black min-w-[35px] ${row.utilization > 95 ? 'text-rose-500' : 'text-[#14B8A6]'}`}>
                                {row.utilization.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderReplacementReport = () => (
        <div className="space-y-3 pt-2 animate-in fade-in duration-500">
            {/* Header Labels - Aligned with the cards below */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.2fr] px-10 py-2 opacity-60">
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <UserPlus size={12} className="text-[#14B8A6]" /> Position & Dept
                </div>
                <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Previous Staff</div>
                <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Resigned On</div>
                <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Status</div>
                <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Avg SLA</div>
                <div className="text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pr-4">Performance</div>
            </div>

            {/* Individual Replacement Cards */}
            {data.replacements.map((row, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.2fr] items-center px-10 py-4 rounded-[2rem] border border-transparent dark:border-slate-800/40 shadow-sm hover:shadow-md hover:border-[#14B8A6]/30 transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-800/50 group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors shadow-inner">
                            <UserMinus size={16} className="text-[#14B8A6]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight leading-none">{row.position}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{row.department}</span>
                        </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                        <span className="text-xs font-black text-slate-600 dark:text-slate-400 leading-none">{row.oldEmployeeName}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Previous Holder</span>
                    </div>

                    <div className="text-right text-xs font-bold text-slate-500">
                        {row.resignationDate ? new Date(row.resignationDate).toLocaleDateString() : 'N/A'}
                    </div>

                    <div className="flex justify-end">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${row.replacementStatus === 'open' ? 'bg-blue-50/50 text-blue-600 border-blue-100/50' :
                            row.replacementStatus === 'hiring' ? 'bg-amber-50/50 text-amber-600 border-amber-100/50' :
                                'bg-emerald-50/50 text-emerald-600 border-emerald-100/50'
                            }`}>
                            {row.replacementStatus}
                        </span>
                    </div>

                    <div className="text-right text-xs font-black text-slate-700">
                        {row.slaDays} <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Days</span>
                    </div>

                    <div className="flex items-center justify-end">
                        {row.isSlaBreached ? (
                            <div className="bg-rose-50/50 px-4 py-2 rounded-2xl flex items-center gap-2 text-rose-500 font-black text-[9px] uppercase tracking-widest border border-rose-100/50">
                                <AlertCircle size={14} /> Breached
                            </div>
                        ) : (
                            <div className="bg-teal-50/50 px-4 py-2 rounded-2xl flex items-center gap-2 text-teal-600 font-black text-[9px] uppercase tracking-widest border border-teal-100/50">
                                <CheckCircle2 size={14} /> On Track
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderAnalytics = () => {
        if (!data.analytics) return null;
        const chartData = data.analytics.hiringTrend.map(item => ({
            name: `${item._id.month}/${item._id.year}`,
            hires: item.hires
        }));

        return (
            <div className="space-y-6 pt-2 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col items-center text-center transition-all hover:border-[#14B8A6]/20" title="Employees who resigned or left">
                        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                            <TrendingUp size={24} />
                        </div>
                        <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">{data.analytics.attritionRate.toFixed(2)}%</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Employee Exit Rate</div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col items-center text-center transition-all hover:border-[#14B8A6]/20" title="Number of employees currently working in the company">
                        <div className="w-12 h-12 bg-teal-50 dark:bg-teal-950/20 text-[#14B8A6] rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                            <Users size={24} />
                        </div>
                        <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">{data.analytics.totalActive}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Currently Working</div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col items-center text-center transition-all hover:border-[#14B8A6]/20" title="Average number of months employees stay in the company">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                            <Clock size={24} />
                        </div>
                        <div className="text-3xl font-black text-slate-800 dark:text-white leading-none">14.2</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Average Stay (Months)</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-sm" title="Number of employees hired this month">
                    <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.3em] mb-10 flex items-center gap-2">
                        <div className="w-1 h-3 bg-[#14B8A6] rounded-full"></div>
                        Monthly Hiring Activity
                    </h3>
                    <div className="h-80 w-full px-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    fontSize={10}
                                    fontWeight="900"
                                    tick={{ fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    fontSize={10}
                                    fontWeight="900"
                                    tick={{ fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '1.5rem',
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                        backgroundColor: '#fff',
                                        padding: '12px 16px'
                                    }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="hires" fill="#14B8A6" radius={[6, 6, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    const renderSLAReport = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.sla.map((item, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.departmentName}</div>
                            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Clock size={16} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-800">{item.avgTimeToHire.toFixed(1)} Days</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-4">Avg Time to Hire</div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Compliance</span>
                            <span className={`text-[10px] font-black ${item.complianceRate > 80 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                {item.complianceRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-700">


            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 inline-flex gap-1 overflow-x-auto max-w-full no-scrollbar shadow-inner">
                {[
                    { id: 'existing', label: 'Staffing Overview', icon: Users },
                    { id: 'replacement', label: 'Replacement Movements', icon: UserPlus },
                    { id: 'analytics', label: 'Hiring Trends', icon: BarChart3 },
                    { id: 'sla', label: 'Performance', icon: Clock }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? 'bg-white dark:bg-slate-900 text-[#14B8A6] shadow-sm border border-slate-200/30 dark:border-slate-800/30 scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        <tab.icon size={14} className={activeTab === tab.id ? 'text-[#14B8A6]' : ''} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="transition-all duration-300">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-10 h-10 border-4 border-slate-100 dark:border-slate-800 border-t-[#14B8A6] rounded-full animate-spin shadow-inner"></div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Analyzing...</div>
                    </div>
                ) : (
                    <div className="w-full">
                        {activeTab === 'existing' && renderExistingReport()}
                        {activeTab === 'replacement' && renderReplacementReport()}
                        {activeTab === 'analytics' && renderAnalytics()}
                        {activeTab === 'sla' && renderSLAReport()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonnelReports;
