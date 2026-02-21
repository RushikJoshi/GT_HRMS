import React, { useEffect, useState } from 'react';
import { Pagination } from 'antd';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Link } from 'react-router-dom';
import {
  Users, Building2, UserCheck, Clock,
  AlertTriangle, Layers, Briefcase, FileClock,
  Activity, Calendar,
  CheckCircle, XCircle, ChevronRight, TrendingUp, Search
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function HRDashboard() {
  const { user, _logout } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [counts, setCounts] = useState({
    employees: 0,
    departments: 0,
    managers: 0,
    pendingLeaves: 0,
    totalLeaves: 0,
    activeHRs: 0,
    topLevel: 0,
    onLeaveToday: 0
  });
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeIndex, setActiveIndex] = useState(-1);
  const pageSize = 5;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tRes, eRes, dRes, lRes, attRes, repRes] = await Promise.all([
          api.get('/tenants/me').catch(() => ({ data: null })),
          api.get('/hr/employees').catch(() => ({ data: [] })),
          api.get('/hr/departments').catch(() => ({ data: [] })),
          api.get('/hr/leaves/requests').catch(() => ({ data: { data: [] } })),
          api.get('/attendance/stats').catch(() => ({ data: null })),
          api.get('/reports/dashboard-summary').catch(() => ({ data: { data: {} } }))
        ]);

        const employees = Array.isArray(eRes.data) ? eRes.data : (eRes.data?.data || []);
        const formattedDepartments = Array.isArray(dRes.data) ? dRes.data : [];
        const leavesData = lRes.data?.data || [];
        const reportStats = repRes.data?.data || {};

        setTenant(tRes.data);
        setDepartments(formattedDepartments);
        setLeaves(leavesData);
        setAttendanceStats(attRes?.data);

        // Get hierarchy stats
        const hierarchyRes = await api.get('/hr/employees/hierarchy').catch(() => ({ data: { stats: {} } }));
        const hierarchyStats = hierarchyRes.data?.stats || {};

        // Calculate On Leave Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const onLeaveTodayCount = leavesData.filter(l => {
          if (String(l.status || '').toLowerCase() !== 'approved') return false;
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          return today >= start && today <= end;
        }).length;

        setCounts({
          employees: employees.length,
          departments: formattedDepartments.length,
          managers: employees.filter(emp => String(emp?.role || '').toLowerCase().includes('manager')).length,
          pendingLeaves: leavesData.filter(l => String(l?.status || '').toLowerCase() === 'pending').length,
          totalLeaves: leavesData.length,
          activeHRs: employees.filter(emp => String(emp?.role || '').toLowerCase().includes('hr')).length,
          topLevel: hierarchyStats.roots || employees.filter(emp => !emp?.manager).length,
          vacant: reportStats.totalVacant || 0,
          replacements: reportStats.replacementInProgress || 0,
          slaBreaches: reportStats.slaBreachCount || 0,
          attrition: reportStats.attritionRate || 0,
          onLeaveToday: onLeaveTodayCount
        });

        // Calculate Designation Distribution
        const designations = {};
        employees.forEach(emp => {
          const d = emp.designation || 'General';
          designations[d] = (designations[d] || 0) + 1;
        });
        const dist = Object.entries(designations).map(([name, value], i) => ({
          name,
          value,
          color: ['#14B8A6', '#8B5CF6', '#F43F5E', '#0EA5E9', '#F59E0B', '#10B981', '#6366F1', '#EC4899'][i % 8]
        }));
        setRoleDistribution(dist);

        // Calculate Birthdays this month
        const currentMonth = new Date().getMonth();
        const bdays = employees.filter(emp => {
          if (!emp.dob) return false;
          const dobDate = new Date(emp.dob);
          return dobDate.getMonth() === currentMonth;
        }).sort((a, b) => {
          const dayA = new Date(a.dob).getDate();
          const dayB = new Date(b.dob).getDate();
          return dayA - dayB;
        });

        setBirthdays(bdays);
      } catch (err) {
        console.error('Failed to load HR dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (_loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-[#14B8A6] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-700">
      {/* Simplified Hero Section - More Compact */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 xl:p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-[#14B8A6] rounded-full"></div>
          <h1 className="text-xl xl:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">
            Welcome, <span className="text-[#14B8A6]">{user?.firstName || 'Admin'}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
            System Live
          </div>
        </div>
      </div>

      {/* Main Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Present', value: attendanceStats?.totalPunchedIn || 0, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: 'Live' },
          { label: 'Multi Punches', value: attendanceStats?.multiplePunches || 0, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: 'Alert' },
          { label: 'Total Absent', value: (counts.employees || 0) - (attendanceStats?.totalPunchedIn || 0), icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', trend: 'Critical' },
          { label: 'On Leave Today', value: counts.onLeaveToday || 0, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 'Daily' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/20 shadow-sm flex items-center justify-between group transition-all hover:border-[#14B8A6]/30">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{stat.value}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
              <stat.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Organizational Insights - Optimized Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        {/* Department Distribution Chart - Span 5 (Left) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm h-[260px] flex flex-col">
            <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
              <div className="w-1 h-3 bg-[#14B8A6] rounded-full"></div>
              Employee Distribution
            </h3>
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
              <div className="w-1/2 h-full relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      innerRadius={45}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(-1)}
                    >
                      {roleDistribution.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={entry.color}
                          className="transition-all duration-300 outline-none cursor-pointer"
                          style={{ opacity: activeIndex === -1 || activeIndex === i ? 1 : 0.3 }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700 shadow-xl">
                              <p className="text-[8px] font-black uppercase tracking-tight text-slate-500 dark:text-slate-400">{payload[0].name}</p>
                              <p className="text-[10px] font-black text-slate-800 dark:text-white">{payload[0].value} Staff</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{counts.employees}</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Total</span>
                </div>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[160px] custom-scrollbar pr-1">
                {roleDistribution.map((entry, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-1 px-2 rounded-lg transition-all ${activeIndex === i ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(-1)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-[9px] font-bold truncate tracking-tight text-slate-500 dark:text-slate-400">
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-slate-800 dark:text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Birthdays Section - Span 7 (Right) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm p-4 h-[260px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1 h-3 bg-[#14B8A6] rounded-full"></div>
                Upcoming Birthdays
              </h3>
              <div className="bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                This Month
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              {birthdays.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <Calendar size={24} />
                  <p className="text-[9px] font-black uppercase tracking-widest mt-2">No Birthdays</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {birthdays.map((emp, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-slate-955/20 border border-transparent hover:border-[#14B8A6]/20 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm overflow-hidden flex items-center justify-center">
                          {emp.profilePic ? (
                            <img src={emp.profilePic} className="w-full h-full object-cover rounded-lg" alt="" />
                          ) : (
                            <span className="text-[10px] font-black text-slate-400">
                              {(emp.firstName || '?')[0]}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate leading-none mb-1">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                            {emp.designation || 'Staff'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-black text-slate-800 dark:text-white leading-none mb-0.5">
                          {new Date(emp.dob).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                        </p>
                        <span className="text-[7px] font-black text-[#14B8A6] uppercase tracking-widest italic">Wait 🎂</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leave Protocol - Compact Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden mb-6">
        <div className="p-4 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white leading-none mb-1">Request Pipeline</h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Active Leave Queue</p>
          </div>
          <Link to="/hr/leave-approvals" className="h-6 px-3 bg-slate-950 text-white rounded-lg flex items-center text-[8px] font-black uppercase tracking-widest hover:bg-[#14B8A6] transition-colors">
            Manage Queue
          </Link>
        </div>

        <div className="px-2 pb-3">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left border-separate border-spacing-y-0.5">
              <thead>
                <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-3 py-2">Personnel</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-center">Period</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center bg-slate-50/30 rounded-xl">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Queue Empty</span>
                    </td>
                  </tr>
                ) : leaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(l => {
                  const empName = l.employee
                    ? (typeof l.employee === 'object' && l.employee !== null
                      ? `${l.employee.firstName || ''} ${l.employee.lastName || ''}`.trim() || 'Unknown'
                      : String(l.employee))
                    : 'Unknown';
                  const isPending = String(l.status || '').toLowerCase() === 'pending';
                  const statusStr = String(l.status || '');
                  const statusLower = statusStr.toLowerCase();

                  return (
                    <tr key={l._id} className="group transition-all">
                      <td className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-955/20 border-y border-l border-slate-100/50 dark:border-slate-800/20 rounded-l-xl group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-[8px] font-black uppercase">
                            {empName.charAt(0)}
                          </div>
                          <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]">{empName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-955/20 border-y border-slate-100/50 dark:border-slate-800/20 group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors">
                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${statusLower.includes('sick') ? 'bg-rose-50 text-rose-500' : 'bg-teal-50 text-teal-600'}`}>
                          {l.leaveType}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-955/20 border-y border-slate-100/50 dark:border-slate-800/20 text-center group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                          {new Date(l.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          <span className="mx-1 opacity-30">-</span>
                          {new Date(l.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-955/20 border-y border-slate-100/50 dark:border-slate-800/20 text-center group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors">
                        <span className={`text-[7px] font-black uppercase tracking-widest ${statusLower === 'approved' ? 'text-emerald-500' : statusLower === 'rejected' ? 'text-rose-500' : 'text-amber-500'}`}>
                          {statusStr}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-955/20 border-y border-r border-slate-100/50 dark:border-slate-800/20 rounded-r-xl group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPending ? (
                            <>
                              <button className="p-1 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-md transition-all">
                                <CheckCircle size={12} />
                              </button>
                              <button className="p-1 text-rose-500 hover:bg-rose-500 hover:text-white rounded-md transition-all">
                                <XCircle size={12} />
                              </button>
                            </>
                          ) : (
                            <ChevronRight size={12} className="text-slate-300" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {leaves.length > pageSize && (
            <div className="mt-3 flex justify-center">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={leaves.length}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
                size="small"
                className="scale-90"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
