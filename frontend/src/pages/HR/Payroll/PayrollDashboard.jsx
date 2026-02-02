import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { IndianRupee, Users, TrendingUp, Calendar, ArrowRight, Play, FileText, PieChart, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function PayrollDashboard() {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        try {
            setLoading(true);
            const res = await api.get('/payroll/dashboard');
            if (res.data.success) {
                setDashboard(res.data.data);
            }
        } catch (err) {
            console.error("Failed to load dashboard data", err);
        } finally {
            setLoading(false);
        }
    }

    const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
        <div className={`${color} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-start justify-between relative overflow-hidden group`}>
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: 'radial-gradient(circle at top right, white 0%, transparent 70%)' }}></div>
            <div className="flex-1 relative z-10">
                <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-2 opacity-90">{title}</p>
                <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
                {subtitle && <p className="text-white/70 text-xs mt-2 leading-relaxed">{subtitle}</p>}
            </div>
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0 relative z-10">
                <Icon className="h-6 w-6 text-white" strokeWidth={1.5} />
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                    <p className="font-semibold text-slate-900 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: ₹{entry.value.toLocaleString()}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full bg-gradient-to-br from-blue-50 via-white to-slate-50 min-h-screen">
            <div className="w-full px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900">Payroll Analytics</h1>
                        <p className="text-slate-500 text-sm mt-2">Real-time insights and business metrics</p>
                    </div>
                    <Link to="/hr/payroll/process" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 flex items-center gap-2 transition-all duration-300 font-semibold text-sm">
                        <Play className="h-4 w-4" /> Run Payroll
                    </Link>
                </div>

                {loading ? (
                    <div className="p-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="text-slate-500 mt-4 text-sm">Loading analytics...</p>
                    </div>
                ) : dashboard ? (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <StatCard
                                title="Last Payroll Cost"
                                value={`₹${dashboard.summary.lastPayrollCost.toLocaleString()}`}
                                subtitle="Net Pay Disbursed"
                                icon={IndianRupee}
                                color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                            />
                            <StatCard
                                title="Employees Paid"
                                value={dashboard.summary.employeesPaid}
                                subtitle="Last processed cycle"
                                icon={Users}
                                color="bg-gradient-to-br from-blue-500 to-blue-600"
                            />
                            <StatCard
                                title="YTD Cost"
                                value={`₹${dashboard.summary.ytdCost.toLocaleString()}`}
                                subtitle={`Total for ${new Date().getFullYear()}`}
                                icon={TrendingUp}
                                color="bg-gradient-to-br from-purple-500 to-purple-600"
                            />
                        </div>

                        {/* Charts Section */}
                        {dashboard.charts.monthly.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Gross vs Net Bar Chart */}
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-emerald-100 rounded-lg">
                                            <BarChart3 className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900 text-sm">Gross vs Net Pay</h3>
                                    </div>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={dashboard.charts.monthly}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '11px' }} />
                                            <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            <Bar dataKey="gross" fill="#10b981" name="Gross Pay" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="net" fill="#3b82f6" name="Net Pay" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Payroll Trend Line Chart */}
                                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <LineChartIcon className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900 text-sm">Payroll Trend (Last 6 Months)</h3>
                                    </div>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart data={dashboard.charts.monthly}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '11px' }} />
                                            <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={2} name="Net Pay" dot={{ fill: '#8b5cf6', r: 4 }} />
                                            <Line type="monotone" dataKey="gross" stroke="#10b981" strokeWidth={2} name="Gross Pay" dot={{ fill: '#10b981', r: 4 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Earnings vs Deductions Pie Chart */}
                        {dashboard.charts.earningsVsDeductions.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <PieChart className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 text-sm">Earnings vs Deductions (YTD)</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <RechartsPieChart>
                                        <Pie
                                            data={dashboard.charts.earningsVsDeductions}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={90}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {dashboard.charts.earningsVsDeductions.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#000' }} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Recent Runs Table */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                                    <div className="p-2 bg-cyan-100 rounded-lg">
                                        <Calendar className="h-4 w-4 text-cyan-600" />
                                    </div>
                                    Recent Payroll Runs
                                </h3>
                                <Link to="/hr/payroll/process" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                                    View All <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Period</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Employees</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Net Pay</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {dashboard.recentRuns.length === 0 ? (
                                            <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 text-sm">No payroll runs found yet.</td></tr>
                                        ) : (
                                            dashboard.recentRuns.map(run => (
                                                <tr key={run._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                        {run.period}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                                                        {new Date(run.runDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full 
                                                            ${run.status === 'PAID' ? 'bg-green-100 text-green-800 border border-green-300' :
                                                                run.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                                                    run.status === 'CALCULATED' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                                                                        'bg-blue-100 text-blue-800 border border-blue-300'}`}>
                                                            {run.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                                        {run.employeesPaid}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-mono font-bold">
                                                        ₹{run.totalNetPay.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <FileText className="h-4 w-4 text-yellow-600" />
                                </div>
                                Quick Actions
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Link to="/hr/payroll/salary-components" className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group bg-slate-50">
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Manage Components</span>
                                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                </Link>
                                <Link to="/hr/payroll/salary-templates/new" className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all group bg-slate-50">
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-purple-700">Design Salary Template</span>
                                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                                </Link>
                                <Link to="/hr/payroll/payslips" className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group bg-slate-50">
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">Download Payslips</span>
                                    <FileText className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                </Link>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="p-16 text-center">
                        <div className="inline-block mb-4 p-4 bg-slate-100 rounded-xl">
                            <FileText className="h-12 w-12 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">No data available. Run your first payroll to see analytics.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
