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
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {data.existing.map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.department}</span>
                            <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.utilization > 90 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {item.utilization.toFixed(1)}% Utilized
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-slate-800">{item.active}</span>
                            <span className="text-xs font-bold text-slate-400 mb-1">/ {item.budgeted} Headcount</span>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${Math.min(100, item.utilization)}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                            <div className="bg-slate-50 p-2 rounded-lg">
                                <div className="text-xs font-black text-slate-700">{item.vacant}</div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Vacant</div>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg">
                                <div className="text-xs font-black text-slate-700">{item.notice + item.resigned}</div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Exiting</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Department</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Budgeted</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Active</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vacant</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">On Notice</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Resigned</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Utilization %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.existing.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{row.department}</td>
                                <td className="px-6 py-4 text-xs font-black text-slate-800">{row.budgeted}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-600">{row.active}</td>
                                <td className="px-6 py-4 text-xs font-bold text-rose-500">{row.vacant}</td>
                                <td className="px-6 py-4 text-xs font-bold text-amber-500">{row.notice}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{row.resigned}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${row.utilization > 95 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {row.utilization.toFixed(1)}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderReplacementReport = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Position & Dept</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Previous Employee</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Resign Date</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg SLA</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Performance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.replacements.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-xs font-black text-slate-800">{row.position}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{row.department}</div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-600">{row.oldEmployeeName}</td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-500">{row.resignationDate ? new Date(row.resignationDate).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${row.replacementStatus === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                        row.replacementStatus === 'hiring' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}>
                                        {row.replacementStatus}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-black text-slate-700">{row.slaDays} Days</td>
                                <td className="px-6 py-4 text-right">
                                    {row.isSlaBreached ? (
                                        <div className="flex items-center justify-end gap-1 text-rose-500 font-bold text-[10px] uppercase tracking-widest">
                                            <AlertCircle size={12} /> SLA Breached
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-end gap-1 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                                            <CheckCircle2 size={12} /> On Track
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAnalytics = () => {
        if (!data.analytics) return null;
        const chartData = data.analytics.hiringTrend.map(item => ({
            name: `${item._id.month}/${item._id.year}`,
            hires: item.hires
        }));

        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <TrendingUp size={32} />
                        </div>
                        <div className="text-4xl font-black text-slate-800">{data.analytics.attritionRate.toFixed(2)}%</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Attrition Rate (Last Month)</div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <Users size={32} />
                        </div>
                        <div className="text-4xl font-black text-slate-800">{data.analytics.totalActive}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Current Active Workforce</div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                            <Clock size={32} />
                        </div>
                        <div className="text-4xl font-black text-slate-800">14.2</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Avg Tenure (Months)</div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8">Monthly Hiring Trend</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" fontSize={10} fontWeight="bold" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis fontSize={10} fontWeight="bold" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="hires" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
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
        <div className="p-6 md:p-8 space-y-8 min-h-screen bg-slate-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Personnel Intelligence</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time workforce & replacement analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all">
                        <Filter size={14} /> Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                        <Download size={14} /> Export Report
                    </button>
                </div>
            </div>

            <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm inline-flex gap-1 overflow-x-auto max-w-full">
                <button
                    onClick={() => setActiveTab('existing')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'existing' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <Users size={16} /> Existing Workforce
                </button>
                <button
                    onClick={() => setActiveTab('replacement')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'replacement' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <UserPlus size={16} /> Replacements
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'analytics' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <BarChart3 size={16} /> Headcount Trends
                </button>
                <button
                    onClick={() => setActiveTab('sla')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'sla' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                >
                    <Clock size={16} /> SLA Performance
                </button>
            </div>

            <div className="transition-all duration-300">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Crunching Data...</div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'existing' && renderExistingReport()}
                        {activeTab === 'replacement' && renderReplacementReport()}
                        {activeTab === 'analytics' && renderAnalytics()}
                        {activeTab === 'sla' && renderSLAReport()}
                    </>
                )}
            </div>
        </div>
    );
};

export default PersonnelReports;
