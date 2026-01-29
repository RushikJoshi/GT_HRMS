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
        const [tRes, eRes, dRes, lRes, attRes] = await Promise.all([
          api.get('/tenants/me').catch(() => ({ data: null })),
          api.get('/hr/employees').catch(() => ({ data: [] })),
          api.get('/hr/departments').catch(() => ({ data: [] })),
          api.get('/hr/leaves/requests').catch(() => ({ data: { data: [] } })),
          api.get('/attendance/stats').catch(() => ({ data: null }))
        ]);

        const employees = Array.isArray(eRes.data) ? eRes.data : (eRes.data?.data || []);
        const formattedDepartments = Array.isArray(dRes.data) ? dRes.data : [];
        const leavesData = lRes.data?.data || [];

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
          managers: employees.filter(emp => (emp.role || '').toLowerCase().includes('manager')).length,
          pendingLeaves: leavesData.filter(l => (l.status || '').toLowerCase() === 'pending').length,
          activeHRs: employees.filter(emp => (emp.role || '').toLowerCase().includes('hr')).length,
          topLevel: hierarchyStats.roots || employees.filter(emp => !emp.manager).length,
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
        <p className="text-slate-600 mb-6 max-w-md">
          We sent a request to fetch your company details but received no response. This could be due to:
          <ul className="list-disc text-left ml-6 mt-2 space-y-1">
            <li>Expired session/token</li>
            <li>Backend server issues (recently restarted?)</li>
            <li>Invalid Tenant ID</li>
          </ul>
        </p>
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

      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 p-6 md:p-8 rounded-2xl shadow-xl text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500 opacity-20 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2 opacity-90">
            <Building2 size={18} />
            <span className="text-sm font-bold uppercase tracking-widest">Company Overview</span>
          </div>
          <div className="flex items-end gap-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{tenant?.name || '—'}</h1>
            <span className="text-lg md:text-xl font-medium opacity-70 mb-1">({tenant?.code})</span>
          </div>
        </div>
      </div>

      {/* Attendance Overview - NEW */}

      <h2 className="text-lg md:text-xl font-bold text-slate-800 mt-8 flex items-center gap-2">
        <Activity className="text-indigo-500" />
        Today's Attendance Overview
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-100/50 text-emerald-600 rounded-lg">
                <UserCheck size={24} />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">Live</span>
            </div>
            <div className="text-3xl font-black text-slate-800">{attendanceStats?.totalPunchedIn || 0}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Punched In</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-100/50 text-blue-600 rounded-lg">
                <Layers size={24} />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-800">{attendanceStats?.multiplePunches || 0}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Multiple Punches</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-rose-100/50 text-rose-600 rounded-lg">
                <AlertTriangle size={24} />
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full uppercase tracking-wider">Alert</span>
            </div>
            <div className="text-3xl font-black text-slate-800">{attendanceStats?.missingPunchOut || 0}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Missing Out</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-indigo-100/50 text-indigo-600 rounded-lg">
                <Clock size={24} />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-800">{attendanceStats?.avgWorkingHours || 0}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Avg Hours</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
        <Link to="/hr/org" className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">Total Employees</div>
            <Users className="text-blue-500 group-hover:scale-110 transition-transform" size={20} />
          </div>
          <div className="text-4xl font-black text-blue-900">{counts.employees}</div>
        </Link>

        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 transition group">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Departments</div>
            <Building2 className="text-emerald-500 group-hover:scale-110 transition-transform" size={20} />
          </div>
          <div className="text-4xl font-black text-emerald-900">{counts.departments}</div>
        </div>

        <div className="bg-cyan-50/50 p-6 rounded-2xl border border-cyan-100 hover:border-cyan-300 hover:bg-cyan-50 transition group">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Managers</div>
            <Briefcase className="text-cyan-500 group-hover:scale-110 transition-transform" size={20} />
          </div>
          <div className="text-4xl font-black text-cyan-900">{counts.managers}</div>
        </div>

        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 hover:border-amber-300 hover:bg-amber-50 transition group">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-widest">Pending Leaves</div>
            <FileClock className="text-amber-500 group-hover:scale-110 transition-transform" size={20} />
          </div>
          <div className="text-4xl font-black text-amber-900">{counts.pendingLeaves}</div>
        </div>
      </div>

      {/* Employees by Department */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 mt-6">Employees by Department</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {departments.map(dept => (
            <div key={dept._id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all flex items-center justify-between group cursor-pointer relative overflow-hidden">
              <div className="absolute right-0 top-0 w-16 h-16 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10 w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-slate-50 text-slate-500 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <Building2 size={16} />
                  </div>
                  <div className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{dept.employeeCount || 0}</div>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate" title={dept.name}>{dept.name}</div>
              </div>
            </div>
          ))}
          {departments.length === 0 && <div className="text-slate-400 text-sm col-span-full">No departments found.</div>}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-6">
        <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
          <Settings size={20} className="text-slate-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/hr/org"
            className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm group"
          >
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Shield size={24} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">Org Structure</div>
              <div className="text-xs text-slate-500 font-medium">Visualize hierarchy</div>
            </div>
          </Link>
          <Link
            to="/hr/users"
            className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm group"
          >
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Settings size={24} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">Manage Users</div>
              <div className="text-xs text-slate-500 font-medium">System access control</div>
            </div>
          </Link>
          <Link
            to="/hr/employees"
            className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm group"
          >
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <UserPlus size={24} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">Employee List</div>
              <div className="text-xs text-slate-500 font-medium">View all staff</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-6 px-1">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Calendar className="text-indigo-500" size={24} />
              Recent Leave Requests
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage pending approvals and employee time off.</p>
          </div>
          <Link to="/hr/leave-requests" className="group flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full transition-all hover:pr-6">
            View All
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="space-y-4">
          {(leaves.length === 0) ? (
            <div className="py-16 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white rounded-full shadow-sm">
                  <FileClock size={32} className="text-slate-300" />
                </div>
              </div>
              <h4 className="text-slate-900 font-bold text-lg">All Caught Up!</h4>
              <p className="text-slate-500 text-sm mt-1">No pending leave requests at the moment.</p>
            </div>
          ) : leaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(l => {
            const empName = typeof l.employee === 'object'
              ? `${l.employee.firstName || ''} ${l.employee.lastName || ''}`.trim() || 'Unknown'
              : l.employee || 'Unknown';
            const empInitial = empName.charAt(0).toUpperCase();
            const isPending = l.status === 'pending';

            return (
              <div key={l._id} className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all duration-300 relative overflow-hidden">
                {/* Status Color Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${l.leaveType?.toLowerCase().includes('sick') ? 'bg-rose-500' :
                    l.leaveType?.toLowerCase().includes('casual') ? 'bg-blue-500' : 'bg-indigo-500'
                  }`}></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-4">

                  {/* Employee Info */}
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-black text-slate-600 shadow-inner">
                      {empInitial}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base group-hover:text-indigo-700 transition-colors">{empName}</h4>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Development Team</p>
                    </div>
                  </div>

                  {/* Leave Details */}
                  <div className="flex flex-wrap items-center gap-6 flex-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Leave Type</span>
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${l.leaveType?.toLowerCase().includes('sick') ? 'bg-rose-50 text-rose-700' :
                          l.leaveType?.toLowerCase().includes('casual') ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${l.leaveType?.toLowerCase().includes('sick') ? 'bg-rose-500' :
                            l.leaveType?.toLowerCase().includes('casual') ? 'bg-blue-500' : 'bg-slate-500'
                          }`}></div>
                        {l.leaveType}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</span>
                      <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                        <Calendar size={16} className="text-indigo-400" />
                        {l.from ? (
                          <span>
                            {new Date(l.from).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            <span className="mx-2 text-slate-300">➜</span>
                            {new Date(l.to).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        ) : <span className="italic text-slate-400">Date info missing</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {isPending ? (
                      <>
                        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100 hover:border-emerald-500">
                          <CheckCircle size={18} />
                          <span className="text-xs">Approve</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100 hover:border-rose-500">
                          <XCircle size={18} />
                          <span className="text-xs">Reject</span>
                        </button>
                      </>
                    ) : (
                      <div className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          l.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-500'
                        }`}>
                        {l.status === 'Approved' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        {l.status}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}

          {leaves.length > pageSize && (
            <div className="pt-6 flex justify-center">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={leaves.length}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
