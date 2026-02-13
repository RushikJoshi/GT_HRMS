import React, { useState, useEffect, useContext } from 'react';
import { Pagination } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';
import { FileText, Edit2, X, Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, RefreshCw, LogIn, LogOut, Briefcase, ChevronRight, Info } from 'lucide-react';
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
import GlobalModal from '../../components/GlobalModal';

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
        setFinalCheckOut(!!todayEntry.checkOut);

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
        setFinalCheckOut(false);
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  // State for policy violations modal
  const [violationModal, setViolationModal] = useState({ show: false, violations: [] });
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceAction, setFaceAction] = useState('IN');

  // Open face verification modal instead of directly punching
  const handleClockInOut = async () => {
    // Determine action based on current state
    const action = isCheckedIn && !isCheckedOut ? 'OUT' : 'IN';
    setFaceAction(action);
    setShowFaceModal(true);
  };

  // Callback when FaceAttendance reports success
  const onFaceAttendanceSuccess = async (resData) => {
    // close modal
    setShowFaceModal(false);
    // Refresh dashboard
    await fetchDashboardData();

    // Show success toast
    try {
      const msg = resData?.message || 'Attendance recorded successfully';
      showToast('success', 'Success', msg);

      // Check for policy violations
      const violations = resData?.data?.status?.policyViolations || resData?.policy?.violations || [];
      if (violations.length > 0) setViolationModal({ show: true, violations });
    } catch (e) {
      console.warn('onFaceAttendanceSuccess handling failed', e);
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
                lastPunchIn={(() => {
                  if (!todayRecord?.logs) return null;
                  const lastIn = [...todayRecord.logs].reverse().find(l => l.type === 'IN');
                  return lastIn?.time;
                })()}
                baseWorkedSeconds={(todaySummary?.workingHours || 0) * 3600}
                onAction={handleClockInOut}
                isLoading={clocking}
                location={profile?.meta?.location || "Headquarters"}
                settings={attendanceSettings}
                error={clockError}
                isFinalCheckOut={isFinalCheckOut}
              />

              {/* Face Attendance Modal (overlay) */}
              {/* {showFaceModal && (
                <div className="fixed inset-0 z-[99999] flex items-center max-w-6xl justify-center ">
                  <div className="absolute inset-0 bg-black/60" onClick={() => setShowFaceModal(false)} />
                  <div className="relative w-full max-w-6xl max-h-[90vh] overflow-auto z-70 justify-start p-6 ml-25 md:ml-0 lg:ml-0">
                    <div className="bg-transparent p-0">
                      <FaceAttendance
                        onSuccess={onFaceAttendanceSuccess}
                        onClose={() => setShowFaceModal(false)}
                        actionType={faceAction}
                      />
                    </div>
                  </div>
                </div>
              )} */}

              <GlobalModal
                isOpen={showFaceModal}
                onClose={() => setShowFaceModal(false)}
                maxWidth="max-w-6xl"
              >
                <FaceAttendance
                  onSuccess={onFaceAttendanceSuccess}
                  onClose={() => setShowFaceModal(false)}
                  actionType={faceAction}
                />
              </GlobalModal>

              {/* Policy Framework Console (Moved for balance) */}
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

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
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

            </div>
            <div className="xl:col-span-7 space-y-6">

              {/* Activity Timeline Dashboard */}
              <div className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-end mb-14 relative z-10">
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

                <div className="space-y-4 max-h-[400px] md:max-h-[480px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar relative z-10">
                  {/* Process logs to show individual punch events for specific transparency */}
                  {(() => {
                    const allPunches = [];
                    attendance.forEach((att) => {
                      if (att.logs && att.logs.length > 0) {
                        att.logs.forEach(log => {
                          allPunches.push({
                            ...log,
                            date: att.date,
                            attId: att._id,
                            isLate: att.isLate && log.time === att.checkIn,
                            isEarly: att.isEarlyOut && log.time === att.checkOut
                          });
                        });
                      } else {
                        // Fallback logic for basic entries
                        if (att.checkIn) allPunches.push({ type: 'IN', time: att.checkIn, date: att.date, attId: att._id, isLate: att.isLate });
                        if (att.checkOut) allPunches.push({ type: 'OUT', time: att.checkOut, date: att.date, attId: att._id, isEarly: att.isEarlyOut });
                      }
                    });

                    // Sort newest first
                    const displayPunches = allPunches.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15);

                    return displayPunches.map((punch, i) => {
                      const isFirstIn = punch.type === 'IN' && !allPunches.some(e => e.attId === punch.attId && e.type === 'IN' && new Date(e.time) < new Date(punch.time));
                      const isLastOut = punch.type === 'OUT' && !allPunches.some(e => e.attId === punch.attId && e.type === 'OUT' && new Date(e.time) > new Date(punch.time));

                      let punchLabel = "Terminal Activity";
                      if (punch.type === 'IN') {
                        punchLabel = isFirstIn ? "Sequence Start" : "Shift Resumed";
                      } else {
                        punchLabel = isLastOut ? "Shift Ended" : "Break Taken";
                      }

                      return (
                        <div key={`${punch.attId}-${punch.time}`} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 hover:border-indigo-500/30 transition-all group/row animate-in fade-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${i * 40}ms` }}>
                          <div className="flex items-center gap-4">
                            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm transition-colors ${punch.type === 'IN' ? 'group-hover/row:border-emerald-200' : 'group-hover/row:border-rose-200'
                              }`}>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none">{new Date(punch.date).toLocaleDateString([], { month: 'short' })}</span>
                              <span className="text-lg font-black text-slate-800 dark:text-white leading-none mt-1">{new Date(punch.date).getDate()}</span>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">{punchLabel}</span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${punch.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                  }`}>
                                  {punch.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 opacity-70">
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                  <Clock size={10} /> {new Date(punch.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
                                  {punch.location || 'Terminal Log'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1 items-end">
                              {punch.isLate && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-900/30 border border-rose-200">
                                  <AlertCircle size={8} className="text-rose-600 dark:text-rose-400" />
                                  <span className="text-[7px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">LATE</span>
                                </div>
                              )}
                              {punch.isEarly && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/30 border border-orange-200">
                                  <Clock size={8} className="text-orange-600 dark:text-orange-400" />
                                  <span className="text-[7px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">EARLY</span>
                                </div>
                              )}
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-sm ${punch.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                              {punch.type === 'IN' ? <LogIn size={16} /> : <LogOut size={16} />}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
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

              {/* Combined Row (Overtime + System Metrics) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overtime box */}
                <WorkingHoursCard
                  baseHours={todaySummary?.workingHours || 0}
                  lastPunchIn={todayRecord?.checkIn ? (isCheckedIn && !isCheckedOut ? todayRecord.logs?.[todayRecord.logs.length - 1]?.time : null) : null}
                  isActive={isCheckedIn && !isCheckedOut}
                />

                {/* System Metrics – Punch Performance */}
                <div className="bg-white dark:bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col justify-between group hover:border-indigo-500/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[15px] font-black text-slate-400 uppercase tracking-widest">System Metrics</span>
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
            </div>

          </div>

          <div className="w-full">
            <ReportingTree />
          </div>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

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
                                <td className="py-4 pl-4">
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
                                <td className="py-4 pr-4 text-right">
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
      {/* Policy Violation Modal */}
      {violationModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"></div>
          <div className="relative bg-white dark:bg-slate-800 border border-orange-500/50 w-full max-w-md rounded-3xl p-6 shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center">Attendance Notice</h2>
            </div>

            <div className="space-y-3 mb-8">
              {violationModal.violations.map((violation, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 shrink-0"></div>
                  <p className="text-slate-600 dark:text-slate-200 text-sm leading-relaxed">{violation}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setViolationModal({ show: false, violations: [] })}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.02]"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </div >

  );
}
