import React, { useState, useEffect, useContext } from 'react';
import { Pagination } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';
import { FileText, Edit2, X, Calendar as CalendarIcon, Users, Clock, CheckCircle, AlertCircle, RefreshCw, LogIn, LogOut, Briefcase, ChevronRight, Info } from 'lucide-react';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../utils/dateUtils';

import RegularizationRequest from '../Leaves/RegularizationRequest';
import ApplyLeaveForm from '../../components/ApplyLeaveForm';
import AttendanceClock from '../../components/AttendanceClock';
import LeaveApprovals from '../HR/LeaveApprovals';
import RegularizationApprovals from '../HR/RegularizationApprovals';
import EmployeeProfileView from '../../components/EmployeeProfileView';
import MyAttendanceView from '../../components/MyAttendanceView';
import TeamAttendanceView from '../../components/TeamAttendanceView';
import ReportingTree from '../../components/ReportingTree';

import InternalJobs from './InternalJobs';
import MyApplications from './MyApplications';
import FaceAttendance from './FaceAttendance';
import WorkingHoursCard from '../../components/WorkingHoursCard';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { activeTab, setActiveTab } = useOutletContext();
  const [loading, setLoading] = useState(true);

  // Data States
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [hasLeavePolicy, setHasLeavePolicy] = useState(true); // Default true to avoid flash
  const [policyRequesting, setPolicyRequesting] = useState(false);
  const [stats, setStats] = useState({
    presentDays: 0,
    leavesTaken: 0,
    pendingRequests: 0,
    nextHoliday: null
  });

  // Attendance States
  const [clocking, setClocking] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [isFinalCheckOut, setFinalCheckOut] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [attendanceSettings, setAttendanceSettings] = useState(null);
  const [editLeave, setEditLeave] = useState(null);
  const [clockError, setClockError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const handleCancelLeave = async (id) => {
    showConfirmToast({
      title: 'Cancel Leave Request',
      description: 'Are you sure you want to cancel this leave request?',
      okText: 'Yes, Cancel',
      cancelText: 'No',
      danger: true,
      onConfirm: async () => {
        try {
          await api.post(`/employee/leaves/cancel/${id}`);
          showToast('success', 'Success', 'Leave request cancelled successfully');
          fetchDashboardData();
        } catch (err) {
          showToast('error', 'Error', err.response?.data?.error || 'Failed to cancel leave');
        }
      }
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const t = new Date().getTime(); // Anti-cache
      const [profileRes, attRes, leaveRes, balanceRes, holidayRes, settingsRes, summaryRes] = await Promise.all([
        api.get(`/employee/profile?t=${t}`).catch(err => ({ data: null, error: err })),
        api.get(`/attendance/my?t=${t}`).catch(err => ({ data: [], error: err })),
        api.get(`/employee/leaves/history?t=${t}`).catch(err => ({ data: [], error: err })),
        api.get(`/employee/leaves/balances?t=${t}`).catch(err => ({ data: [], error: err })),
        api.get(`/holidays?t=${t}`).catch(() => ({ data: [] })),
        api.get(`/attendance/settings?t=${t}`).catch(() => ({ data: null })),
        api.get(`/attendance/today-summary?t=${t}`).catch(() => ({ data: null }))
      ]);

      setProfile(profileRes.data);
      const attendanceArray = Array.isArray(attRes.data) ? attRes.data : [];
      setAttendance(attendanceArray);
      const leavesArray = Array.isArray(leaveRes.data) ? leaveRes.data : [];
      setLeaves(leavesArray);
      const balanceData = balanceRes.data?.balances || (Array.isArray(balanceRes.data) ? balanceRes.data : []);
      setBalances(balanceData);
      // Prefer authoritative value from profile.leavePolicy, fallback to balances response
      const profileHasPolicy = Boolean(profileRes.data?.leavePolicy);
      const computedHasPolicy = profileHasPolicy || (balanceRes.data?.hasLeavePolicy ?? (balanceData.length > 0));
      setHasLeavePolicy(computedHasPolicy);

      // Auto-attempt self-assignment if no policy found (helps when admin created policies but sync didn't reach this employee)
      if (!computedHasPolicy) {
        try {
          const autoRes = await api.post('/hrms/employee/profile/ensure-policy');
          if (autoRes?.data?.assigned || autoRes?.data?.hasLeavePolicy) {
            setHasLeavePolicy(true);
            if (autoRes.data.balances) setBalances(autoRes.data.balances);
            if (autoRes.data.profile) setProfile(autoRes.data.profile);
            showToast('success', 'Policy Assigned', autoRes.data?.message || (autoRes.data?.leavePolicy ? `Assigned policy ${autoRes.data.leavePolicy.name}` : 'Policy assigned'));
          }
        } catch (e) {
          console.warn('[AUTO_ENSURE_POLICY] Auto-assign failed:', e?.response?.data || e.message || e);
        }
      }
      setAttendanceSettings(settingsRes?.data);
      setTodaySummary(summaryRes?.data); // New Stats Data

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const presentDays = attendanceArray.filter(a => {
        const d = new Date(a.date);
        const status = (a.status || '').toLowerCase();
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear &&
          ['present', 'half_day'].includes(status);
      }).length;

      // Calculate YTD leaves taken from approved leave requests of the current year
      const leavesTaken = leavesArray
        .filter(l => l.status === 'Approved')
        .filter(l => {
          const startYear = new Date(l.startDate).getFullYear();
          const endYear = new Date(l.endDate).getFullYear();
          const currentYear = new Date().getFullYear();
          return startYear === currentYear || endYear === currentYear;
        })
        .reduce((sum, l) => sum + (l.daysCount || 0), 0);
      const pendingRequests = leavesArray.filter(l => l.status === 'Pending').length;

      // Find next holiday (string based comparison to avoid timezone issues)
      const todayStr = new Date().toISOString().split('T')[0];
      const upcomingHolidays = (holidayRes.data || [])
        .map(h => ({ ...h, dateObj: new Date(h.date) }))
        .filter(h => {
          const hStr = h.dateObj.toISOString().split('T')[0];
          return hStr >= todayStr;
        })
        .sort((a, b) => a.dateObj - b.dateObj);

      const nextHoliday = upcomingHolidays[0] || null;

      setStats({
        presentDays,
        leavesTaken,
        pendingRequests,
        nextHoliday
      });

      const todayLocalStr = formatDateDDMMYYYY(new Date());
      const todayEntry = attRes.data.find(a =>
        formatDateDDMMYYYY(a.date) === todayLocalStr
      );

      setTodayRecord(todayEntry);
      if (todayEntry) {
        setIsCheckedIn(!!todayEntry.checkIn);

        // Logical check for checked out
        // In multiple punch mode, "checked out" is true only if the LAST punch was an OUT
        if (settingsRes?.data?.punchMode === 'multiple') {
          const lastLog = todayEntry.logs?.[todayEntry.logs.length - 1];
          setIsCheckedOut(lastLog?.type === 'OUT');
        } else {
          setIsCheckedOut(!!todayEntry.checkOut);
        }
      } else {
        setIsCheckedIn(false);
        setIsCheckedOut(false);
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockInOut = async () => {
    try {
      setClocking(true);
      setClockError(null);

      // Helper to get location
      const getLocation = () => {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
          } else {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                });
              },
              (error) => {
                console.warn("Location access denied or failed", error);
                // Don't block, just resolve null (Remote)
                resolve(null);
              },
              { timeout: 8000 }
            );
          }
        });
      };

      const locationData = await getLocation();
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const payload = locationData
        ? { ...locationData, location: 'Office/Remote', device: 'Web', dateStr }
        : { location: 'Remote', device: 'Web', dateStr };

      // Use unified punch endpoint
      // Use unified punch endpoint
      const res = await api.post('/attendance/punch', payload);
      showToast('success', 'Success', res.data?.message || 'Attendance Updated');

      await fetchDashboardData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Failed to punch in/out. Please try again.";
      setClockError(errorMsg);
      showToast('error', 'Error', errorMsg);
    } finally {
      setClocking(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Establishing Secure Session...</div>;

  const StatCard = ({ title, value, color, icon: Icon, trend }) => (
    <div className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group overflow-hidden relative">
      <div className={`absolute -right-6 -top-6 w-24 h-24 bg-current opacity-[0.03] rounded-full scale-150 group-hover:scale-[2] transition-transform duration-700 ${color}`}></div>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={`p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-600 transition-all duration-500`}>
          {Icon && <Icon size={22} className={`${color} group-hover:text-white transition-colors duration-500`} />}
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            {trend}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</div>
        <div className="flex items-baseline gap-1">
          <div className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter transition-transform group-hover:scale-105 origin-left duration-500">{value}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Units</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-8 pb-12">

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">

          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="h-2 w-10 bg-indigo-600 rounded-full"></div>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Operational Overview</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-2">
                Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">{profile?.firstName || 'User'}</span>
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Personal dashboard and attendance overview.</p>
            </div>

            <div className="flex items-center gap-4 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all hover:shadow-md">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute inset-0"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Terminal Active</span>
                <span className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none mt-1">
                  Shift: {todayRecord?.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Standby'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Cards - Dense and Premium */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Attendance (MTD)"
              value={stats.presentDays}
              color="text-indigo-600"
              icon={Clock}
              trend="+2.4% Sync"
            />
            <StatCard
              title="Leaves (YTD)"
              value={stats.leavesTaken}
              color="text-emerald-600"
              icon={CalendarIcon}
            />
            <StatCard
              title="Pending Req"
              value={stats.pendingRequests}
              color="text-amber-500"
              icon={AlertCircle}
            />
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20 text-white flex flex-col justify-between overflow-hidden relative group hover:shadow-indigo-500/30 transition-all duration-500">
              <div className="absolute top-[-20px] right-[-20px] opacity-10 transform rotate-12 group-hover:rotate-45 transition-transform duration-700">
                <CalendarIcon size={140} />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Protocol Update</div>
                  <div className="px-2 py-0.5 rounded-full bg-white/20 text-[8px] font-black uppercase tracking-widest">Holiday</div>
                </div>
                {stats.nextHoliday ? (
                  <div className="mt-auto">
                    <div className="text-2xl font-black leading-tight tracking-tight mb-3">{stats.nextHoliday.name}</div>
                    <div className="flex items-center gap-2 text-[10px] font-black bg-white/10 w-fit px-3 py-2 rounded-xl backdrop-blur-md border border-white/10 uppercase tracking-widest">
                      <Clock size={12} className="text-white/70" />
                      {formatDateDDMMYYYY(stats.nextHoliday.date)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto py-4">
                    <div className="text-sm font-bold opacity-60 uppercase tracking-widest italic">No Upcoming Alerts</div>
                  </div>
                )}
              </div>
            </div>
          </div>


          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Column: Clock (Interactive Zone) */}
            <div className="xl:col-span-5 space-y-6">


              <AttendanceClock
                isCheckedIn={isCheckedIn}
                isCheckedOut={isCheckedOut}
                checkInTime={todayRecord?.checkIn}
                onAction={handleClockInOut}
                isLoading={clocking}
                location={profile?.meta?.location || "Headquarters"}
                settings={attendanceSettings}
                error={clockError}
              />


              {/* Recent Activity Log */}
              <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    Recent Activity
                  </h3>
                  <button onClick={() => setActiveTab('attendance')} className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest border-b-2 border-transparent hover:border-indigo-500 transition-all">View All History</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {attendance.slice(0, 3).map(att => (
                    <div key={att._id} className="aspect-square flex flex-col items-center justify-center text-center p-0.5 rounded-md bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 hover:border-indigo-500/20 transition-all group relative overflow-hidden max-w-[72px] w-full mx-auto">
                      <div className="absolute top-0.5 right-0.5">
                        {att.isLate && <span className="text-[4px] font-black text-amber-500 bg-amber-500/10 px-0.5 py-0.25 rounded uppercase tracking-widest">LATE</span>}
                      </div>

                      <div className="flex flex-col items-center mb-0">
                        <span className="text-[5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0">
                          {new Date(att.date).toLocaleDateString([], { month: 'short' })}
                        </span>
                        <span className="text-sm font-black text-slate-800 dark:text-white leading-none">
                          {new Date(att.date).getDate()}
                        </span>
                      </div>

                      <div className="flex flex-col items-center gap-0 mb-0.5">
                        <span className="text-[5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                          {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                        <span className="text-[7px] font-black text-slate-700 dark:text-slate-200 tracking-tight leading-none">
                          {att.workingHours || 0}h Total
                        </span>
                      </div>

                      <span className={`px-1 py-0.25 rounded text-[5px] font-black uppercase tracking-widest border w-[90%] ${att.status?.toLowerCase() === 'present'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
                        : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50'
                        }`}>
                        {att.status || 'present'}
                      </span>
                    </div>
                  ))}
                  {attendance.length === 0 && (
                    <div className="col-span-full text-center py-6 flex flex-col items-center gap-1.5">
                      <Clock size={20} className="text-slate-200 dark:text-slate-800" />
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">No activity</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
            <div className="xl:col-span-7 space-y-6">
              {/* High Density Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Working Hours Card */}
                <WorkingHoursCard
                  baseHours={todaySummary?.workingHours || 0}
                  lastPunchIn={todayRecord?.checkIn ? (isCheckedIn && !isCheckedOut ? todayRecord.logs?.[todayRecord.logs.length - 1]?.time : null) : null}
                  isActive={isCheckedIn && !isCheckedOut}
                />

                {/* Geo-Fencing System Context */}
                <div className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-between group hover:border-indigo-500/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Metrics</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white mt-1">Punch Performance</span>
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Briefcase size={16} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total', value: todaySummary?.totalPunches || 0, icon: RefreshCw, color: 'text-indigo-400' },
                      { label: 'In', value: todaySummary?.totalIn || 0, icon: LogIn, color: 'text-emerald-500' },
                      { label: 'Out', value: todaySummary?.totalOut || 0, icon: LogOut, color: 'text-rose-500' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center p-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                        <item.icon size={12} className={`${item.color} mb-1`} />
                        <span className="text-lg font-black text-slate-800 dark:text-white leading-none">{item.value}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Policy Framework Console */}
              <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-2xl overflow-hidden relative group">
                <div className="absolute top-[-60px] right-[-60px] opacity-[0.05] group-hover:rotate-12 transition-transform duration-1000">
                  <Clock size={320} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400 mb-1">
                        Policy Framework
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-8 bg-indigo-500 rounded-full"></div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Standard Protocol</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-indigo-500 text-white px-4 py-1.5 rounded-full font-black tracking-[0.1em] shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-400">v2.4 ACTIVE</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { label: 'Shift Window', value: attendanceSettings ? `${attendanceSettings.shiftStartTime} - ${attendanceSettings.shiftEndTime}` : '-- : --', color: 'text-indigo-400' },
                      { label: 'Architecture', value: attendanceSettings ? `${attendanceSettings.punchMode} PUNCH` : '--', color: 'text-blue-400' },
                      { label: 'Grace Period', value: attendanceSettings ? `${attendanceSettings.lateMarkThresholdMinutes} MIN` : '--', color: 'text-emerald-400' },
                      { label: 'Full Day Unit', value: attendanceSettings ? `${attendanceSettings.fullDayThresholdHours} HRS` : '--', color: 'text-amber-400' },
                    ].map((config, i) => (
                      <div key={i} className="space-y-1.5 group/item">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover/item:text-slate-400 transition-colors">{config.label}</p>
                        <p className={`text-sm font-black tracking-tight ${config.color}`}>{config.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                        <Briefcase size={16} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Geo-Fencing System</span>
                        <span className="text-[10px] font-bold text-slate-400">Biometric Validation Active</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-5 py-2 rounded-2xl border transition-all duration-500 ${attendanceSettings?.locationRestrictionMode === 'none'
                      ? 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:border-slate-600'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_30px_rgba(52,211,153,0.1)] hover:shadow-emerald-500/20'}`}>
                      {attendanceSettings?.locationRestrictionMode === 'none' ? 'Bypassed' : `Security: ${attendanceSettings?.locationRestrictionMode}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Timeline Dashboard */}
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-end mb-8 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Activity Streams</h3>
                      <div className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-[8px] font-black text-slate-500">REALTIME</div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your recent activity logs</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="group-link flex items-center gap-2 text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-all"
                  >
                    System History
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="space-y-4 relative z-10">
                  {attendance.slice(0, 5).map((att, i) => (
                    <div key={att._id} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group/row animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="flex items-center gap-5">
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm group-hover/row:border-indigo-200 dark:group-hover/row:border-indigo-800 transition-colors">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">{new Date(att.date).toLocaleDateString([], { month: 'short' })}</span>
                          <span className="text-xl font-black text-slate-800 dark:text-white leading-none mt-1">{new Date(att.date).getDate()}</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">Terminal Interaction</span>
                            <span className="text-[8px] font-black text-slate-400 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded uppercase tracking-widest">Log #{i + 1}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 opacity-60">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              <LogIn size={12} /> {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}
                            </div>
                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              <LogOut size={12} /> {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">{att.workingHours || 0}h Total</span>
                          <div className="flex gap-1 mt-1">
                            {att.isLate && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Late Entry"></div>}
                            {att.isEarlyOut && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Early Exit"></div>}
                          </div>
                        </div>
                        <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${att.status?.toLowerCase() === 'present'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.05)]'
                          }`}>
                          {att.status || 'Verified'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {attendance.length === 0 && (
                    <div className="text-center py-20 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/30 flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-2">
                        <Clock size={32} className="text-slate-200 dark:text-slate-800" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No Temporal Data Detected</p>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 flex">
              <ReportingTree />
            </div>
            <div className="lg:col-span-7 bg-white dark:bg-slate-800/40 backdrop-blur-md p-10 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-center items-center text-center group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-800 shadow-2xl flex items-center justify-center mb-8 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                  <Users className="text-indigo-600" size={36} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-0.5 w-6 bg-indigo-500"></div>
                  <h4 className="text-xs font-black text-indigo-500 uppercase tracking-[0.3em]">Corporate Ecosystem</h4>
                </div>
                <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-4">Team Synergy Network</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">Stay connected with your company directory and team members.</p>
                <div className="mt-10 flex items-baseline gap-4">
                  <button className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-95">Open Directory</button>
                  <button className="px-8 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Node Map</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

          {/* Header & Quick Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="h-2 w-10 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Temporal Assets</span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-2 uppercase">Time Off Console</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Managing your leave ecosystem and balance quotas.</p>
            </div>
          </div>

          {!hasLeavePolicy ? (
            <div className="p-12 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-[2.5rem] text-center shadow-sm">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="text-amber-600 dark:text-amber-500" size={32} />
              </div>
              <h4 className="text-xl font-black text-amber-900 dark:text-amber-300 uppercase tracking-widest">Policy Restriction</h4>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-500 mt-2 uppercase tracking-tight">No leave policy assigned yet. Please contact your HR administrator.</p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  className={`px-8 py-3 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all ${policyRequesting ? 'opacity-60 cursor-wait' : 'hover:bg-amber-700 hover:shadow-lg hover:shadow-amber-500/20'}`}
                  disabled={policyRequesting}
                  onClick={async () => {
                    try {
                      setPolicyRequesting(true);
                      const res = await api.post('/hrms/employee/profile/ensure-policy');
                      if (res.data?.assigned || res.data?.leavePolicy) {
                        setHasLeavePolicy(true);
                        if (res.data?.balances) setBalances(res.data.balances);
                      }
                      showToast('success', 'Policy Assigned', res.data?.message || 'Policy assignment attempted');
                      fetchDashboardData();
                    } finally {
                      setPolicyRequesting(false);
                    }
                  }}
                >
                  {policyRequesting ? 'Requesting...' : 'Request Policy Assignment'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Balance Quotas Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {balances.map((b, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.leaveType}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-[9px] font-black text-emerald-500 uppercase">System Active</span>
                        </div>
                      </div>
                      <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg text-slate-500 uppercase">Quota: {b.total}</span>
                    </div>

                    <div className="flex items-baseline gap-1 relative z-10">
                      <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{b.available}</span>
                      <span className="text-sm font-bold text-slate-400 uppercase">Available</span>
                    </div>

                    <div className="mt-6 space-y-3 relative z-10">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span>Consumption Metrics</span>
                        <span>{b.total > 0 ? Math.round((b.used / b.total) * 100) : 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${b.total > 0 ? (b.used / b.total) * 100 : 0}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <div className="flex gap-4">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Utilized</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{b.used}d</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase">Pending</span>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{b.pending}d</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Primary Action Zone: Application Terminal */}
                <div className="xl:col-span-4 animate-in fade-in slide-in-from-left-6 duration-1000">
                  <ApplyLeaveForm
                    balances={balances}
                    existingLeaves={leaves}
                    editData={editLeave}
                    onSuccess={() => {
                      setEditLeave(null);
                      fetchDashboardData();
                    }}
                    onCancelEdit={() => setEditLeave(null)}
                    leavePolicy={profile?.leavePolicy || null}
                    hasLeavePolicy={hasLeavePolicy}
                  />
                </div>

                {/* Secondary Zone: Transaction Ledgers */}
                <div className="xl:col-span-8 space-y-6">
                  <div className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.25em]">Request Timeline</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical Transaction Ledger</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Updates</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead>
                          <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">
                            <th className="pb-2 pl-4">Type</th>
                            <th className="pb-2">Schedule</th>
                            <th className="pb-2 text-center">Units</th>
                            <th className="pb-2 text-center">Status</th>
                            <th className="pb-2 text-right pr-4">Control</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaves.length > 0 ? (
                            leaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((leave, i) => (
                              <tr key={leave._id} className="group/row bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-indigo-500/20 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                <td className="py-4 pl-4 rounded-l-2xl">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{leave.leaveType}</span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Application #{leave._id.slice(-4).toUpperCase()}</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{formatDateDDMMYYYY(leave.startDate)}</span>
                                    <span className="text-[9px] font-medium text-slate-400">to {formatDateDDMMYYYY(leave.endDate)}</span>
                                  </div>
                                </td>
                                <td className="py-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{leave.daysCount}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Days</span>
                                  </div>
                                </td>
                                <td className="py-4 text-center">
                                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-current opacity-70 ${leave.status === 'Approved' ? 'text-emerald-500 bg-emerald-500/5' :
                                    leave.status === 'Rejected' ? 'text-rose-500 bg-rose-500/5' :
                                      'text-amber-500 bg-amber-500/5'
                                    }`}>
                                    {leave.status}
                                  </span>
                                </td>
                                <td className="py-4 pr-4 text-right rounded-r-2xl">
                                  {leave.status === 'Pending' ? (
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setEditLeave(leave);
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all active:scale-90"
                                        title="Edit Request"
                                      >
                                        <Edit2 size={18} />
                                      </button>
                                      <button
                                        onClick={() => handleCancelLeave(leave._id)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all active:scale-90"
                                        title="Withdraw Request"
                                      >
                                        <X size={18} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest italic pr-2">Locked</div>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="py-24 text-center">
                                <div className="flex flex-col items-center gap-6">
                                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                                    <CalendarIcon size={32} className="text-slate-300 dark:text-slate-700" />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No Transaction History Found</p>
                                    <p className="text-[9px] font-bold text-slate-500/60 uppercase">Your leave request timeline is currently empty</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {leaves.length > pageSize && (
                      <div className="mt-8 flex justify-end">
                        <Pagination
                          current={currentPage}
                          pageSize={pageSize}
                          total={leaves.length}
                          onChange={(page) => setCurrentPage(page)}
                          showSizeChanger={false}
                          className="custom-pagination"
                        />
                      </div>
                    )}
                  </div>

                  {/* Leave Policy Intelligence */}
                  <div className="bg-indigo-600/5 dark:bg-indigo-600/10 border border-indigo-200/50 dark:border-indigo-500/20 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                    <div className="absolute top-[-20px] left-[-20px] opacity-[0.05] group-hover:scale-125 transition-transform duration-1000">
                      <Info size={120} />
                    </div>
                    <div className="relative z-10 w-full">
                      <div className="flex items-center gap-3 mb-4">
                        <Info className="text-indigo-600" size={24} />
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest">Policy Intelligence</h4>
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                        All leave requests are processed via the <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Biometric Policy Mesh</span>.
                        Approvals are prioritized based on seniority and system load.
                        Sandwich rules apply to weekend crossovers.
                      </p>
                      <div className="mt-8 flex flex-wrap gap-3">
                        {['Sandwich Rules', 'Holiday Bypass', 'Half-Day Support'].map((tag, i) => (
                          <span key={i} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MY PROFILE TAB */}
      {
        activeTab === 'profile' && (
          <EmployeeProfileView profile={profile} balances={balances} />
        )
      }

      {/* REGULARIZATION TAB */}
      {
        activeTab === 'regularization' && (
          <RegularizationRequest />
        )
      }

      {/* FaceAttendance Tab */}
      {
        activeTab === 'face-attendance' && (
          <FaceAttendance />
        )
      }

      {/* TEAM LEAVES TAB */}
      {
        activeTab === 'team-leaves' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <LeaveApprovals isManagerView={true} endpoint="/employee/leaves/team-requests" actionEndpoint="/employee/leaves/requests" />
          </div>
        )
      }

      {/* TEAM REGULARIZATION TAB */}
      {
        activeTab === 'team-regularization' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-6">Team Attendance Correction</h3>
              <RegularizationApprovals
                isManagerView={true}
                category="Attendance"
                endpoint="/employee/regularization/team-requests"
                actionEndpoint="/employee/regularization/requests"
              />
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-6">Team Leave Adjustment</h3>
              <RegularizationApprovals
                isManagerView={true}
                category="Leave"
                endpoint="/employee/regularization/team-requests"
                actionEndpoint="/employee/regularization/requests"
              />
            </div>
          </div>
        )
      }

      {/* MY ATTENDANCE TAB */}
      {
        activeTab === 'attendance' && (
          <MyAttendanceView />
        )
      }

      {/* TEAM ATTENDANCE TAB */}
      {
        activeTab === 'team-attendance' && (
          <TeamAttendanceView />
        )
      }

      {/* INTERNAL JOBS TAB */}
      {
        activeTab === 'internal-jobs' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <InternalJobs />
          </div>
        )
      }

      {/* MY APPLICATIONS TAB */}
      {
        activeTab === 'my-applications' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <MyApplications />
          </div>
        )
      }
    </div >

  );
}
