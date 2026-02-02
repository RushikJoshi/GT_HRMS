import React, { useState, useEffect, useContext } from 'react';
import { Pagination } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';
import { FileText, Edit2, X, Calendar as CalendarIcon, Users, Clock, CheckCircle, AlertCircle, RefreshCw, LogIn, LogOut, Briefcase } from 'lucide-react';
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
    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group overflow-hidden relative">
      <div className="absolute -right-4 -top-4 w-20 h-20 bg-current opacity-[0.03] rounded-full scale-150 group-hover:scale-[1.7] transition-transform duration-500"></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
          {Icon && <Icon size={20} className={color} />}
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
            {trend}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-1">{title}</div>
        <div className={`text-3xl font-black text-slate-800 dark:text-white tracking-tight`}>{value}</div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 pb-10">

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Bonjour, {profile?.firstName || 'User'}!</h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Here's what's happening with your workspace today.</p>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Shift Started: {todayRecord?.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet'}</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Attendance (MTD)"
              value={stats.presentDays}
              color="text-indigo-600"
              icon={Clock}
              trend="+2.4%"
            />
            <StatCard
              title="Leaves (YTD)"
              value={stats.leavesTaken}
              color="text-emerald-600"
              icon={CalendarIcon}
            />
            <StatCard
              title="Pending Approval"
              value={stats.pendingRequests}
              color="text-amber-600"
              icon={AlertCircle}
            />
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-xl shadow-indigo-500/20 text-white flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute top-[-20px] right-[-20px] opacity-10 transform rotate-12 group-hover:rotate-45 transition-transform duration-700">
                <CalendarIcon size={120} />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-3">Upcoming Holiday</div>
                {stats.nextHoliday ? (
                  <>
                    <div className="text-xl font-black leading-tight tracking-tight">{stats.nextHoliday.name}</div>
                    <div className="flex items-center gap-2 mt-2 opacity-80 text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-lg backdrop-blur-sm">
                      <Clock size={12} />
                      {formatDateDDMMYYYY(stats.nextHoliday.date)}
                    </div>
                  </>
                ) : (
                  <div className="text-xs font-bold">No upcoming holidays</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column: Clock + Stats */}
            <div className="lg:col-span-2 space-y-6">
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

              {/* Today's Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Punches', value: todaySummary?.totalPunches || 0, icon: RefreshCw, color: 'text-slate-400' },
                  { label: 'Punches In', value: todaySummary?.totalIn || 0, icon: LogIn, color: 'text-emerald-500' },
                  { label: 'Punches Out', value: todaySummary?.totalOut || 0, icon: LogOut, color: 'text-blue-500' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col items-center justify-center text-center group hover:border-indigo-500/30 transition-colors h-full">
                    <item.icon size={16} className={`${item.color} mb-3 opacity-60 group-hover:opacity-100 transition-opacity`} />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{item.value}</p>
                  </div>
                ))}

                {/* Dynamic Working Hours Card */}
                <WorkingHoursCard
                  baseHours={todaySummary?.workingHours || 0}
                  lastPunchIn={todayRecord?.checkIn ? (isCheckedIn && !isCheckedOut ? todayRecord.logs?.[todayRecord.logs.length - 1]?.time : null) : null}
                  isActive={isCheckedIn && !isCheckedOut}
                />
              </div>
            </div>

            {/* Policy Summary & Recent Log */}
            <div className="lg:col-span-3 space-y-6">
              {/* Applied Policy Summary */}
              <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-2xl overflow-hidden relative group">
                <div className="absolute top-[-40px] right-[-40px] opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <Clock size={240} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_indigo]"></div>
                      Policy Framework
                    </h3>
                    <span className="text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-400 font-bold tracking-widest">v2.1 Active</span>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    {[
                      { label: 'Shift Windows', value: attendanceSettings ? `${attendanceSettings.shiftStartTime} - ${attendanceSettings.shiftEndTime}` : '-- : --', color: 'text-indigo-400' },
                      { label: 'Punch Architecture', value: attendanceSettings ? `${attendanceSettings.punchMode} PUNCH` : '--', color: 'text-blue-400' },
                      { label: 'Late Grace Period', value: attendanceSettings ? `${attendanceSettings.lateMarkThresholdMinutes} MINUTES` : '--', color: 'text-emerald-400' },
                      { label: 'Min. Full Day', value: attendanceSettings ? `${attendanceSettings.fullDayThresholdHours} HOURS` : '--', color: 'text-amber-400' },
                    ].map((config, i) => (
                      <div key={i} className="group/item">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover/item:text-slate-400 transition-colors">{config.label}</p>
                        <p className={`text-sm font-black tracking-tight ${config.color}`}>{config.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        <Briefcase size={14} className="text-slate-400" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Geo-Fencing System</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border transition-all ${attendanceSettings?.locationRestrictionMode === 'none'
                      ? 'bg-slate-800/50 text-slate-500 border-slate-700/50'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]'}`}>
                      {attendanceSettings?.locationRestrictionMode === 'none' ? 'Bypassed' : `Restricted: ${attendanceSettings?.locationRestrictionMode}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Attendance Log */}
              <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    Recent Activity
                    <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-900 text-[8px] flex items-center justify-center font-black">5</span>
                  </h3>
                  <button onClick={() => setActiveTab('attendance')} className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest border-b-2 border-transparent hover:border-indigo-500 transition-all">View All History</button>
                </div>

                <div className="space-y-3">
                  {attendance.slice(0, 5).map(att => (
                    <div key={att._id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 hover:border-indigo-500/30 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">{new Date(att.date).toLocaleDateString([], { month: 'short' })}</span>
                          <span className="text-lg font-black text-slate-800 dark:text-white leading-none mt-0.5">{new Date(att.date).getDate()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} · {att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            {att.isLate && <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded tracking-widest">LATE</span>}
                            {att.isEarlyOut && <span className="text-[8px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded tracking-widest">EARLY</span>}
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 tracking-tight">{att.workingHours || 0}h Total</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${att.status?.toLowerCase() === 'present'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
                          : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50'
                          }`}>
                          {att.status || 'present'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {attendance.length === 0 && (
                    <div className="text-center py-12 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
                      <Clock size={40} className="text-slate-200 dark:text-slate-800" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No recent data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ReportingTree />
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-8 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col justify-center items-center text-center group">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-900 shadow-xl flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-500">
                <Users className="text-indigo-500" size={32} />
              </div>
              <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Team Synergy Network</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2">Connecting people and simplifying operations through our centralized HR intelligence platform.</p>
              <button className="mt-6 px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-sm">Explore Directory</button>
            </div>
          </div>
        </div>
      )}

      {/* MY LEAVES TAB */}
      {activeTab === 'leaves' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Leave Balance Cards */}
          {balances.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {balances.map(b => {
                const leaveKey = b.leaveType.toLowerCase();
                const isPaid = leaveKey.includes('paid') || leaveKey.includes('privilege');
                const isSick = leaveKey.includes('sick') || leaveKey.includes('medical');
                const isCasual = leaveKey.includes('casual');

                let gradient = 'from-indigo-500 to-blue-600';
                let iconColor = 'text-indigo-500';
                if (isPaid) { gradient = 'from-emerald-500 to-teal-600'; iconColor = 'text-emerald-500'; }
                if (isSick) { gradient = 'from-rose-500 to-pink-600'; iconColor = 'text-rose-500'; }
                if (isCasual) { gradient = 'from-amber-400 to-orange-500'; iconColor = 'text-amber-500'; }

                return (
                  <div key={b._id} className="relative group">
                    <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-indigo-500/5 group-hover:-translate-y-1"></div>
                    <div className="relative p-5">
                      <div className="flex justify-between items-center mb-4">
                        <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 ${iconColor}`}>
                          <CalendarIcon size={14} />
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white bg-gradient-to-r ${gradient}`}>Available</div>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{b.available || 0}</span>
                        <span className="text-xs font-bold text-slate-400">/ {b.total || 0} Total</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{b.leaveType}</p>

                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Utilized</p>
                          <p className="text-xs font-black text-slate-700 dark:text-slate-300">{b.used || 0} Days</p>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Processing</p>
                          <p className="text-xs font-black text-slate-700 dark:text-slate-300">{b.pending || 0} Days</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!hasLeavePolicy && (
            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/50 rounded-2xl text-center shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="text-amber-600 dark:text-amber-500" size={20} />
              </div>
              <h4 className="text-sm font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest">Policy Restriction</h4>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-500 mt-1 uppercase tracking-tight">No leave policy assigned yet. Please contact your HR administrator.</p>

              <div className="mt-4 flex items-center justify-center gap-3">
                <button className={`px-4 py-2 bg-amber-600 text-white rounded-lg font-bold ${policyRequesting ? 'opacity-60 cursor-wait' : 'hover:bg-amber-700'}`} disabled={policyRequesting} onClick={async () => {
                  try {
                    setPolicyRequesting(true);
                    const res = await api.post('/hrms/employee/profile/ensure-policy');

                    // Immediately reflect assignment in UI if API confirms
                    if (res.data?.assigned || res.data?.leavePolicy) {
                      setHasLeavePolicy(true);
                      if (res.data?.balances) setBalances(res.data.balances);
                    }

                    // Prefer response message if present
                    const msg = res.data?.message || (res.data?.leavePolicy ? `Assigned policy: ${res.data.leavePolicy.name}` : 'Policy assignment attempted');
                    showToast('success', 'Policy Assigned', msg);

                    // Still refresh authoritative data from server
                  } finally {
                    setPolicyRequesting(false);
                  }
                }}>{policyRequesting ? 'Requesting...' : 'Request Policy Assignment'}</button>

                <button className="px-4 py-2 border border-amber-600 text-amber-700 rounded-lg font-bold bg-white/50" onClick={() => { navigator.clipboard ? navigator.clipboard.writeText('Please contact HR to assign your leave policy') : null; showToast('info', 'Contact HR', 'Message copied to clipboard.'); }}>Contact HR</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Apply Form */}
            <div className="lg:col-span-2 sticky top-24">
              <ApplyLeaveForm
                balances={balances}
                existingLeaves={leaves}
                editData={editLeave}
                hasLeavePolicy={hasLeavePolicy}
                leavePolicy={profile?.leavePolicy || null}
              />
            </div>

            {/* Leave History */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-3">
                  <FileText size={16} className="text-indigo-500" />
                  Request Timeline
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Updates</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50">
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Units</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <CalendarIcon size={40} className="text-slate-100 dark:text-slate-800" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No transaction history found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      leaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(l => (
                        <tr key={l._id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-700 dark:text-slate-200">{l.leaveType}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 line-clamp-1">{l.reason || 'No reason provided'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-tight">{formatDateDDMMYYYY(l.startDate)} - {formatDateDDMMYYYY(l.endDate)}</span>
                              {l.isHalfDay && (
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded w-fit">
                                  {l.halfDaySession} Session
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300">
                              {l.daysCount}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' :
                              l.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50' :
                                l.status === 'Cancelled' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700' :
                                  'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50'
                              }`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {l.status === 'Pending' ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditLeave(l);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/40"
                                  title="Edit Request"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleCancelLeave(l._id)}
                                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-800/40"
                                  title="Cancel Request"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div className="pr-2">
                                {l.status === 'Approved' ? (
                                  <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200">Approved</span>
                                ) : l.status === 'Rejected' ? (
                                  <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-200">Rejected</span>
                                ) : l.status === 'Cancelled' ? (
                                  <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">Cancelled</span>
                                ) : (
                                  <div className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest italic pr-2">Locked</div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {leaves.length > pageSize && (
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
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
          </div>
        </div>
      )}

      {/* MY PROFILE TAB */}
      {activeTab === 'profile' && (
        <EmployeeProfileView profile={profile} balances={balances} />
      )}

      {/* REGULARIZATION TAB */}
      {activeTab === 'regularization' && (
        <RegularizationRequest />
      )}

      {/* FaceAttendance Tab */}
      {activeTab === 'face-attendance' && (
        <FaceAttendance />
      )}

      {/* TEAM LEAVES TAB */}
      {activeTab === 'team-leaves' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <LeaveApprovals isManagerView={true} endpoint="/employee/leaves/team-requests" actionEndpoint="/employee/leaves/requests" />
        </div>
      )}

      {/* TEAM REGULARIZATION TAB */}
      {activeTab === 'team-regularization' && (
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
      )}

      {/* MY ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <MyAttendanceView />
      )}

      {/* TEAM ATTENDANCE TAB */}
      {activeTab === 'team-attendance' && (
        <TeamAttendanceView />
      )}

      {/* INTERNAL JOBS TAB */}
      {activeTab === 'internal-jobs' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <InternalJobs />
        </div>
      )}

      {/* MY APPLICATIONS TAB */}
      {activeTab === 'my-applications' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <MyApplications />
        </div>
      )}

    </div>
  );
}
