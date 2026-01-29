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
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-start justify-between hover:shadow-md transition-shadow">
            <div className="flex-1">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-xl font-bold text-slate-900">{value}</h3>
                {subtitle && <p className="text-slate-400 text-xs mt-1">{subtitle}</p>}
            </div>
            <div className={`p-2.5 rounded-lg ${color} flex-shrink-0`}>
                <Icon className="h-5 w-5 text-white" />
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
        <div className="w-full bg-slate-50">
            <div className="w-full px-4 py-4 space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Payroll Analytics</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Real-time insights and business metrics</p>
                    </div>
                    <Link to="/hr/payroll/process" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-colors text-sm">
                        <Play className="h-4 w-4" /> Run Payroll
                    </Link>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        <p className="text-slate-400 mt-3 text-sm">Loading analytics...</p>
                    </div>
                ) : dashboard ? (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard
                                title="Last Payroll Cost"
                                value={`₹${dashboard.summary.lastPayrollCost.toLocaleString()}`}
                                subtitle="Net Pay Disbursed"
                                icon={IndianRupee}
                                color="bg-emerald-500"
                            />
                            <StatCard
                                title="Employees Paid"
                                value={dashboard.summary.employeesPaid}
                                subtitle="Last processed cycle"
                                icon={Users}
                                color="bg-blue-500"
                            />
                            <StatCard
                                title="YTD Cost"
                                value={`₹${dashboard.summary.ytdCost.toLocaleString()}`}
                                subtitle={`Total for ${new Date().getFullYear()}`}
                                icon={TrendingUp}
                                color="bg-purple-500"
                            />
                        </div>

                        {/* Charts Section */}
                        {dashboard.charts.monthly.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Gross vs Net Bar Chart */}
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <BarChart3 className="h-4 w-4 text-slate-500" />
                                        <h3 className="font-semibold text-slate-800 text-sm">Gross vs Net Pay</h3>
                                    </div>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={dashboard.charts.monthly}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '11px' }} />
                                            <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            <Bar dataKey="gross" fill="#10b981" name="Gross Pay" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="net" fill="#3b82f6" name="Net Pay" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Payroll Trend Line Chart */}
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <LineChartIcon className="h-4 w-4 text-slate-500" />
                                        <h3 className="font-semibold text-slate-800 text-sm">Payroll Trend (Last 6 Months)</h3>
                                    </div>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart data={dashboard.charts.monthly}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '11px' }} />
                                            <YAxis stroke="#64748b" style={{ fontSize: '11px' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                                            <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={2} name="Net Pay" dot={{ fill: '#8b5cf6', r: 3 }} />
                                            <Line type="monotone" dataKey="gross" stroke="#10b981" strokeWidth={2} name="Gross Pay" dot={{ fill: '#10b981', r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Earnings vs Deductions Pie Chart */}
                        {dashboard.charts.earningsVsDeductions.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <PieChart className="h-4 w-4 text-slate-500" />
                                    <h3 className="font-semibold text-slate-800 text-sm">Earnings vs Deductions (YTD)</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={250}>
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
                                        <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Recent Runs Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-gray-50">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-slate-500" /> Recent Payroll Runs
                                </h3>
                                <Link to="/hr/payroll/process" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                    View All <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-white">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employees</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Net Pay</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {dashboard.recentRuns.length === 0 ? (
                                            <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-500 text-sm">No payroll runs found yet.</td></tr>
                                        ) : (
                                            dashboard.recentRuns.map(run => (
                                                <tr key={run._id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                                                        {run.period}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                                                        {new Date(run.runDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full 
                                                            ${run.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                                                run.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                                                    run.status === 'CALCULATED' ? 'bg-purple-100 text-purple-800' :
                                                                        'bg-blue-100 text-blue-800'}`}>
                                                            {run.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                                                        {run.employeesPaid}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right font-mono font-semibold">
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
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 text-slate-500" /> Quick Actions
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <Link to="/hr/payroll/salary-components" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition group">
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Manage Components</span>
                                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-700" />
                                </Link>
                                <Link to="/hr/payroll/salary-templates/new" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition group">
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Design Salary Template</span>
                                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-700" />
                                </Link>
                                <Link to="/hr/payroll/payslips" className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition group">
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">Download Payslips</span>
                                    <FileText className="h-4 w-4 text-slate-400 group-hover:text-blue-700" />
                                </Link>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="p-8 text-center text-slate-400">
                        <p className="text-sm">No data available. Run your first payroll to see analytics.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
