import React, { useEffect, useState } from 'react';
import { Pagination } from 'antd';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Link } from 'react-router-dom';
import {
  Eye, Users, Building2, UserCheck, Clock,
  AlertTriangle, Layers, Briefcase, FileClock,
  Settings, UserPlus, Shield, Activity, Calendar,
  CheckCircle, XCircle, ChevronRight
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';

export default function HRDashboard() {
  const { _user, _logout } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [counts, setCounts] = useState({
    employees: 0,
    departments: 0,
    managers: 0,
    pendingLeaves: 0,
    activeHRs: 0,
    topLevel: 0
  });
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
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

        setCounts({
          employees: employees.length,
          departments: formattedDepartments.length,
          managers: employees.filter(emp => String(emp?.role || '').toLowerCase().includes('manager')).length,
          pendingLeaves: leavesData.filter(l => String(l?.status || '').toLowerCase() === 'pending').length,
          activeHRs: employees.filter(emp => String(emp?.role || '').toLowerCase().includes('hr')).length,
          topLevel: hierarchyStats.roots || employees.filter(emp => !emp?.manager).length,
          vacant: reportStats.totalVacant || 0,
          replacements: reportStats.replacementInProgress || 0,
          slaBreaches: reportStats.slaBreachCount || 0,
          attrition: reportStats.attritionRate || 0
        });
      } catch (err) {
        console.error('Failed to load HR dashboard data', err);
        setError('Failed to load dashboard data. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (_loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="text-red-500 mb-4 bg-red-50 p-4 rounded-full">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Company Data Not Found</h2>
        <div className="text-slate-600 mb-6 max-w-md">
          We sent a request to fetch your company details but received no response. This could be due to:
          <ul className="list-disc text-left ml-6 mt-2 space-y-1">
            <li>Expired session/token</li>
            <li>Backend server issues (recently restarted?)</li>
            <li>Invalid Tenant ID</li>
          </ul>
        </div>
        <button
          onClick={_logout}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-lg"
        >
          Log Out & Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-emerald-600 p-8 rounded-xl border border-emerald-500 shadow-sm relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 text-emerald-100 font-medium text-sm mb-1">
            <Building2 size={16} className="text-emerald-200" />
            <span className="uppercase tracking-widest">Company Overview</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">{tenant?.name || '—'}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-emerald-100 font-medium opacity-80">({tenant?.code})</span>
            <span className="flex items-center gap-2 px-3 py-1 bg-white text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm">
              <Activity size={12} className="animate-pulse" /> SYSTEM ONLINE
            </span>
          </div>
        </div>

        {/* Decorative BG */}
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-emerald-500 to-transparent opacity-30 pointer-events-none"></div>
      </div>

      {/* Attendance Overview - NEW */}

      <h2 className="text-lg md:text-xl font-bold text-slate-800 mt-8 flex items-center gap-2">
        <Activity className="text-indigo-500" />
        Today's Attendance Overview
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Card 1: Punched In */}
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 relative overflow-hidden p-8 rounded-xl flex flex-col justify-between h-48 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <UserCheck size={26} />
            </div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
              Live
            </span>
          </div>
          <div className="relative z-10 space-y-1">
            <h3 className="text-5xl font-bold text-white tracking-tight drop-shadow-sm">{attendanceStats?.totalPunchedIn || 0}</h3>
            <p className="text-sm font-semibold text-white/90 uppercase tracking-widest leading-relaxed">Punched In</p>
          </div>
        </div>

        {/* Card 2: Multiple Punches */}
        <div className="bg-gradient-to-br from-blue-400 to-cyan-500 relative overflow-hidden p-8 rounded-xl flex flex-col justify-between h-48 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Layers size={26} />
            </div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
              Flags
            </span>
          </div>
          <div className="relative z-10 space-y-1">
            <h3 className="text-5xl font-bold text-white tracking-tight drop-shadow-sm">{attendanceStats?.multiplePunches || 0}</h3>
            <p className="text-sm font-semibold text-white/90 uppercase tracking-widest leading-relaxed">Multiple Punches</p>
          </div>
        </div>

        {/* Card 3: Missing Out */}
        <div className="bg-gradient-to-br from-rose-500 to-orange-500 relative overflow-hidden p-8 rounded-xl flex flex-col justify-between h-48 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <AlertTriangle size={26} />
            </div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
              Alert
            </span>
          </div>
          <div className="relative z-10 space-y-1">
            <h3 className="text-5xl font-bold text-white tracking-tight drop-shadow-sm">{attendanceStats?.missingPunchOut || 0}</h3>
            <p className="text-sm font-semibold text-white/90 uppercase tracking-widest leading-relaxed">Missing Out</p>
          </div>
        </div>

        {/* Card 4: Avg Hours */}
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 relative overflow-hidden p-8 rounded-xl flex flex-col justify-between h-48 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Clock size={26} />
            </div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
              Avg
            </span>
          </div>
          <div className="relative z-10 space-y-1">
            <h3 className="text-5xl font-bold text-white tracking-tight drop-shadow-sm">{attendanceStats?.avgWorkingHours || 0}</h3>
            <p className="text-sm font-semibold text-white/90 uppercase tracking-widest leading-relaxed">Work Hours</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <Link to="/hr/org" className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-lg flex items-center justify-center shadow-inner border border-white/20 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/20 px-2 py-1 rounded-full border border-white/10">Total</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-black text-white">{counts.employees}</div>
            <div className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mt-1">Total Employees</div>
          </div>
        </Link>

        <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-lg flex items-center justify-center shadow-inner border border-white/20 group-hover:scale-110 transition-transform">
              <Building2 size={24} />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/20 px-2 py-1 rounded-full border border-white/10">Org</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-black text-white">{counts.departments}</div>
            <div className="text-[10px] font-bold text-pink-100 uppercase tracking-widest mt-1">Departments</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-sky-600 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-lg flex items-center justify-center shadow-inner border border-white/20 group-hover:scale-110 transition-transform">
              <Briefcase size={24} />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/20 px-2 py-1 rounded-full border border-white/10">Lead</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-black text-white">{counts.managers}</div>
            <div className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest mt-1">Managers</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm text-white rounded-lg flex items-center justify-center shadow-inner border border-white/20 group-hover:scale-110 transition-transform">
              <FileClock size={24} />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/20 px-2 py-1 rounded-full border border-white/10">Action</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-black text-white">{counts.pendingLeaves}</div>
            <div className="text-[10px] font-bold text-amber-100 uppercase tracking-widest mt-1">Pending Leaves</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/hr/reports" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{counts.vacant}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vacant Positions</div>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: '40%' }}></div>
          </div>
        </Link>

        <Link to="/hr/reports" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <UserPlus size={20} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{counts.replacements}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Replacements</div>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: '60%' }}></div>
          </div>
        </Link>

        <Link to="/hr/reports" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{counts.slaBreaches}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SLA Breaches</div>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500" style={{ width: '20%' }}></div>
          </div>
        </Link>

        <Link to="/hr/reports" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800">{counts.attrition}%</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Attrition Rate</div>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: '15%' }}></div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">

        {/* Employees by Department */}
        <div className="lg:col-span-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Building2 className="text-emerald-500" size={18} />
            Department Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {departments.map(dept => (
              <div key={dept._id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-50 rounded-bl-full -mr-6 -mt-6 transition-all group-hover:scale-150"></div>
                <div className="p-3 bg-slate-50 text-slate-400 rounded-full group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors relative z-10">
                  <Building2 size={20} />
                </div>
                <div className="relative z-10">
                  <div className="text-2xl font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{dept.employeeCount || 0}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[120px]" title={dept.name}>{dept.name}</div>
                </div>
              </div>
            ))}
            {departments.length === 0 && <div className="text-slate-400 text-xs font-bold uppercase tracking-widest col-span-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No departments found</div>}
          </div>
        </div>

        {/* Recent Leave Requests Wrapper */}
        <div className="lg:col-span-3 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-indigo-600 rounded-full"></div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Recent Leave Requests</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Manage pending approvals and time off</p>
              </div>
            </div>
            <Link to="/hr/leave-requests" className="text-indigo-600 hover:text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:translate-x-1 transition-all">
              View All <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {(leaves.length === 0) ? (
              <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <FileClock size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No pending requests</p>
              </div>
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
                <div key={l._id} className="group flex flex-col md:flex-row items-center justify-between p-4 bg-slate-50/50 rounded-lg hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-sm ${String(l.leaveType || '').toLowerCase().includes('sick') ? 'bg-rose-400' :
                      String(l.leaveType || '').toLowerCase().includes('casual') ? 'bg-blue-400' : 'bg-indigo-400'
                      }`}>
                      {empName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-extraBold text-slate-800 uppercase tracking-tight mb-1">{empName}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${String(l.leaveType || '').toLowerCase().includes('sick') ? 'bg-rose-100 text-rose-600' :
                          String(l.leaveType || '').toLowerCase().includes('casual') ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
                          }`}>
                          {l.leaveType}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar size={10} />
                          {l.startDate ? new Date(l.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                          {l.endDate && ` - ${new Date(l.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3 md:mt-0 w-full md:w-auto justify-end">
                    {isPending ? (
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors" title="Approve">
                          <CheckCircle size={18} />
                        </button>
                        <button className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors" title="Reject">
                          <XCircle size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusLower === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        statusLower === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                        {statusStr}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {leaves.length > pageSize && (
              <div className="pt-4 flex justify-center border-t border-slate-100 mt-4">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={leaves.length}
                  onChange={(page) => setCurrentPage(page)}
                  showSizeChanger={false}
                  size="small"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
