import React, { useState, useEffect, useContext } from 'react';
import { Pagination } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { UIContext } from '../../context/UIContext';
import {
  FileText, Edit2, X, Calendar as CalendarIcon, Clock, CheckCircle,
  AlertCircle, RefreshCw, LogIn, LogOut, Briefcase, ChevronRight, Info,
  TrendingUp, Activity, Bell, Layers, User
} from 'lucide-react';
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
  const [hasLeavePolicy, setHasLeavePolicy] = useState(true);
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

      const profileHasPolicy = Boolean(profileRes.data?.leavePolicy);
      const computedHasPolicy = profileHasPolicy || (balanceRes.data?.hasLeavePolicy ?? (balanceData.length > 0));
      setHasLeavePolicy(computedHasPolicy);

      // Auto-attempt self-assignment if no policy found
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
      setTodaySummary(summaryRes?.data);

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const presentDays = attendanceArray.filter(a => {
        const d = new Date(a.date);
        const status = (a.status || '').toLowerCase();
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear &&
          ['present', 'half_day'].includes(status);
      }).length;

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

  const [violationModal, setViolationModal] = useState({ show: false, violations: [] });
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceAction, setFaceAction] = useState('IN');

  const handleClockInOut = async () => {
    const action = isCheckedIn && !isCheckedOut ? 'OUT' : 'IN';
    setFaceAction(action);
    setShowFaceModal(true);
  };

  const onFaceAttendanceSuccess = async (resData) => {
    setShowFaceModal(false);
    await fetchDashboardData();
    try {
      const msg = resData?.message || 'Attendance recorded successfully';
      showToast('success', 'Success', msg);
      const violations = resData?.data?.status?.policyViolations || resData?.policy?.violations || [];
      if (violations.length > 0) setViolationModal({ show: true, violations });
    } catch (e) {
      console.warn('onFaceAttendanceSuccess handling failed', e);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#14B8A6] border-t-transparent animate-spin"></div>
        <div className="text-[#111827] font-bold text-sm uppercase tracking-widest">Loading Dashboard...</div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-white pb-12 transition-colors duration-300">

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
          <div className="w-full px-4 lg:px-6 space-y-6"> {/* Updated space-y-6 */}

            {/* Greeting Section - Moved Outside to Align Columns */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-8 rounded-full bg-[#14B8A6]"></div>
                <span className="text-[10px] uppercase font-bold text-[#6B7280] tracking-widest">Employee Portal</span>
              </div>
              <h1 className="text-2xl font-bold text-[#111827]">
                Welcome back, <span className="text-[#14B8A6]">{profile?.firstName}</span>
              </h1>
            </div>

            {/* Layout Grid: 3 Columns Aligned at Top */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

              {/* COLUMN 1: Attendance Focus */}
              <div className="space-y-6">
                {/* Primary Attendance Stat */}
                <div className="bg-white rounded-[20px] p-4 shadow-md border border-[#E5E7EB] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#14B8A6]"></div>
                  <div className="flex justify-between items-start z-10 relative mb-2">
                    <div className="p-2 bg-[#CCFBF1] rounded-full text-[#14B8A6]">
                      <Clock size={20} />
                    </div>
                    <div className="flex items-center gap-1 bg-[#F3F4F6] px-2 py-1 rounded-full text-[10px] font-bold text-[#14B8A6]">
                      <TrendingUp size={10} /> +2.4%
                    </div>
                  </div>
                  <div className="relative z-10">
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-widest font-bold mb-1">Attendance (MTD)</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[#111827] tracking-tight">{stats.presentDays}</span>
                      <span className="text-xs text-[#9CA3AF] font-bold">Days</span>
                    </div>
                  </div>
                </div>

                {/* Live Clock Card */}
                <div className="bg-white rounded-[20px] p-4 shadow-md border border-[#E5E7EB] flex flex-col items-center text-center relative overflow-hidden group hover:shadow-lg transition-all min-h-[380px] justify-center">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F3F4F6]/50 pointer-events-none"></div>
                  <div className="relative z-10 w-full flex flex-col items-center">
                    <h3 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse"></div> Live Tracker
                    </h3>
                    <div className="scale-90 transform origin-top">
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
                        location={profile?.meta?.location || "HQ"}
                        settings={attendanceSettings}
                        error={clockError}
                        isFinalCheckOut={isFinalCheckOut}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: Activity & Leaves */}
              <div className="space-y-6"> {/* Removed padding top */}
                {/* Secondary Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Leaves */}
                  <div className="bg-white rounded-[20px] p-3 shadow-sm border border-[#E5E7EB] hover:shadow-md transition-all duration-300 flex flex-col justify-between h-24 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] text-[#6B7280] uppercase tracking-widest font-bold">Leaves (YTD)</span>
                      <div className="p-1.5 bg-[#F3F4F6] rounded-lg text-[#6B7280] group-hover:bg-[#14B8A6] group-hover:text-white transition-colors">
                        <CalendarIcon size={14} />
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-[#111827]">{stats.leavesTaken}</span>
                  </div>
                  {/* Pending */}
                  <div className="bg-white rounded-[20px] p-3 shadow-sm border border-[#E5E7EB] hover:shadow-md transition-all duration-300 flex flex-col justify-between h-24 group">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] text-[#6B7280] uppercase tracking-widest font-bold">Pending</span>
                      <div className="p-1.5 bg-[#F3F4F6] rounded-lg text-[#6B7280] group-hover:bg-[#F59E0B] group-hover:text-white transition-colors">
                        <AlertCircle size={14} />
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-[#111827]">{stats.pendingRequests}</span>
                  </div>
                </div>

                {/* Activity Streams - Taller */}
                <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-md overflow-hidden flex flex-col h-[500px] hover:shadow-lg transition-all">
                  <div className="p-4 border-b border-[#F3F4F6] flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#E0F2FE] text-[#0EA5E9]">
                        <Activity size={16} />
                      </div>
                      <h3 className="text-xs font-bold text-[#111827] uppercase tracking-widest">Activity Logs</h3>
                    </div>
                    <span className="px-2 py-0.5 bg-[#F3F4F6] rounded-full text-[9px] font-bold text-[#6B7280] uppercase">Realtime</span>
                  </div>

                  <div className="overflow-y-auto custom-scrollbar flex-1 p-3">
                    {(() => {
                      const allPunches = [];
                      attendance.forEach((att) => {
                        if (att.logs && att.logs.length > 0) {
                          att.logs.forEach(log => {
                            allPunches.push({ ...log, date: att.date, attId: att._id, isLate: att.isLate && log.time === att.checkIn, isEarly: att.isEarlyOut && log.time === att.checkOut });
                          });
                        } else {
                          if (att.checkIn) allPunches.push({ type: 'IN', time: att.checkIn, date: att.date, attId: att._id, isLate: att.isLate });
                          if (att.checkOut) allPunches.push({ type: 'OUT', time: att.checkOut, date: att.date, attId: att._id, isEarly: att.isEarlyOut });
                        }
                      });
                      const displayPunches = allPunches.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15);

                      return displayPunches.map((punch, i) => {
                        return (
                          <div key={`${punch.attId}-${punch.time}`} className="flex items-center justify-between p-3 mb-2 rounded-xl hover:bg-[#F9FAFB] transition-colors group cursor-default border border-transparent hover:border-[#F3F4F6]">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] shadow-sm text-[#111827]">
                                <span className="text-[8px] font-bold text-[#9CA3AF] uppercase">{new Date(punch.date).toLocaleDateString([], { month: 'short' })}</span>
                                <span className="text-sm font-bold leading-none">{new Date(punch.date).getDate()}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#111827] flex items-center gap-2">
                                  {punch.type === 'IN' ? 'Check In' : 'Check Out'}
                                  <span className={`text-[8px] px-1.5 rounded-full font-bold uppercase ${punch.type === 'IN' ? 'bg-[#CCFBF1] text-[#14B8A6]' : 'bg-[#FEE2E2] text-[#EF4444]'}`}>{punch.type}</span>
                                </span>
                                <span className="text-[9px] font-medium text-[#6B7280] mt-0.5 flex items-center gap-1">
                                  <Clock size={8} /> {new Date(punch.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    {attendance.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-[#9CA3AF]">
                        <Clock size={24} className="mb-2 opacity-50" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">No Activity</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* COLUMN 3: Right Sidebar Stack */}
              <div className="space-y-6"> {/* Removed padding top */}
                {/* Protocol Update Notification */}
                <div className="bg-white rounded-[20px] p-3 shadow-md border-l-4 border-[#14B8A6] flex items-start gap-3 hover:shadow-lg transition-all duration-300 group">
                  <div className="p-2 rounded-full bg-[#CCFBF1] text-[#14B8A6] shrink-0">
                    <Bell size={16} />
                  </div>
                  <div className="flex flex-col w-full">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-[10px] font-bold text-[#111827] uppercase tracking-widest">Update</h4>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#F3F4F6] text-[7px] font-bold text-[#6B7280] uppercase">Info</span>
                    </div>
                    {stats.nextHoliday ? (
                      <>
                        <p className="text-sm font-bold text-[#111827] leading-tight truncate">{stats.nextHoliday.name}</p>
                        <p className="text-[10px] font-medium text-[#6B7280] mt-0.5">{formatDateDDMMYYYY(stats.nextHoliday.date)}</p>
                      </>
                    ) : (
                      <p className="text-xs text-[#9CA3AF] italic">No updates.</p>
                    )}
                  </div>
                </div>

                {/* Overtime Metric */}
                <div className="bg-white rounded-[20px] p-0 shadow-md border border-[#E5E7EB] overflow-hidden hover:shadow-lg transition-all">
                  <WorkingHoursCard
                    baseHours={todaySummary?.workingHours || 0}
                    lastPunchIn={todayRecord?.checkIn ? (isCheckedIn && !isCheckedOut ? todayRecord.logs?.[todayRecord.logs.length - 1]?.time : null) : null}
                    isActive={isCheckedIn && !isCheckedOut}
                  />
                </div>

                {/* System Metrics */}
                <div className="bg-white rounded-[20px] p-4 shadow-md border border-[#E5E7EB] hover:shadow-lg transition-all">
                  <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">Metrics</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total', value: todaySummary?.totalPunches || 0, icon: RefreshCw, color: 'text-[#6366F1]' },
                      { label: 'In', value: todaySummary?.totalIn || 0, icon: LogIn, color: 'text-[#14B8A6]' },
                      { label: 'Out', value: todaySummary?.totalOut || 0, icon: LogOut, color: 'text-[#EF4444]' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center justify-center p-2 rounded-xl bg-white hover:bg-slate-50 transition-colors group/item">
                        <item.icon size={12} className={`${item.color} mb-1 group-hover/item:scale-110 transition-transform`} />
                        <span className="text-sm font-bold text-[#111827] leading-none">{item.value}</span>
                        <span className="text-[7px] font-bold text-[#9CA3AF] uppercase mt-0.5">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reporting Hierarchy */}
                <div className="bg-white rounded-[20px] p-4 shadow-md border border-[#E5E7EB] hover:shadow-lg transition-all">
                  <h4 className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-4 text-center">Hierarchy</h4>
                  <div className="flex justify-center scale-90 origin-top">
                    <ReportingTree />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* OTHER TABS - Wrapped in consistent container logic */}
      {activeTab !== 'dashboard' && (
        <div className="w-full px-4 lg:px-6 animate-in fade-in duration-500">

          {activeTab === 'leaves' && (
            <div className="space-y-8">
              {/* Balance Cards */}
              {!hasLeavePolicy ? (
                <div className="p-12 bg-amber-50 rounded-[24px] text-center border border-amber-100">
                  <AlertCircle size={48} className="text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-amber-900">Policy Pending Assignment</h3>
                  <p className="text-amber-700 my-2">Please wait while the system assigns your leave policy.</p>
                  <button
                    onClick={async () => {
                      try {
                        setPolicyRequesting(true);
                        await api.post('/hrms/employee/profile/ensure-policy');
                        fetchDashboardData();
                      } finally {
                        setPolicyRequesting(false);
                      }
                    }}
                    disabled={policyRequesting}
                    className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-amber-600 transition-colors"
                  >
                    {policyRequesting ? 'Refreshing...' : 'Refresh Status'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {balances.map((b, i) => (
                    <div key={i} className="bg-white p-6 rounded-[20px] shadow-sm border border-[#E5E7EB] hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">{b.leaveType}</span>
                        <span className="text-[10px] font-bold bg-[#CCFBF1] text-[#14B8A6] px-2 py-0.5 rounded-md">Active</span>
                      </div>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-4xl font-bold text-[#111827]">{b.available}</span>
                        <span className="text-xs font-bold text-[#9CA3AF]">/ {b.total}</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="bg-[#14B8A6] h-full transition-all duration-1000" style={{ width: `${b.total > 0 ? (b.used / b.total) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                <div className="xl:col-span-4">
                  <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden p-6 sticky top-6">
                    <ApplyLeaveForm
                      balances={balances}
                      existingLeaves={leaves}
                      editData={editLeave}
                      onSuccess={() => { setEditLeave(null); fetchDashboardData(); }}
                      onCancelEdit={() => setEditLeave(null)}
                      leavePolicy={profile?.leavePolicy || null}
                      hasLeavePolicy={hasLeavePolicy}
                    />
                  </div>
                </div>
                <div className="xl:col-span-8">
                  <div className="bg-white rounded-[24px] shadow-sm border border-[#E5E7EB] overflow-hidden p-6">
                    <h3 className="text-sm font-bold text-[#111827] uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Layers size={16} className="text-[#6B7280]" /> Transaction Ledger
                    </h3>

                    <div className="flex flex-col gap-3">
                      {leaves.length > 0 ? (
                        leaves.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((leave) => (
                          <div
                            key={leave._id}
                            className="bg-white p-4 rounded-[16px] border border-[#E5E7EB] hover:shadow-md hover:border-[#14B8A6]/30 hover:bg-[#F0FDFA]/30 transition-all duration-300 group flex flex-col md:flex-row items-center gap-4"
                          >
                            {/* Date Box */}
                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white border border-[#E5E7EB] text-[#6B7280] group-hover:bg-white group-hover:text-[#14B8A6] group-hover:border-[#14B8A6]/30 transition-colors shrink-0">
                              <span className="text-[9px] font-bold uppercase tracking-widest">{formatDateDDMMYYYY(leave.startDate).split('-')[1]}</span>
                              <span className="text-xl font-bold leading-none text-[#111827] group-hover:text-[#14B8A6]">{formatDateDDMMYYYY(leave.startDate).split('-')[0]}</span>
                            </div>

                            {/* Main Info */}
                            <div className="flex flex-col flex-1 text-center md:text-left">
                              <span className="text-sm font-bold text-[#111827] mb-0.5">{leave.leaveType}</span>
                              <div className="flex items-center justify-center md:justify-start gap-2 text-[10px] text-[#6B7280] font-medium">
                                <span className="bg-[#F3F4F6] px-1.5 py-0.5 rounded-md">
                                  {formatDateDDMMYYYY(leave.startDate)} - {formatDateDDMMYYYY(leave.endDate)}
                                </span>
                                <span>•</span>
                                <span className="font-bold text-[#111827]">{leave.daysCount} Days</span>
                              </div>
                            </div>

                            {/* Status & Actions */}
                            <div className="flex items-center gap-4">
                              <span className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${leave.status === 'Approved' ? 'bg-[#CCFBF1] text-[#14B8A6] border-[#14B8A6]/20' :
                                leave.status === 'Rejected' ? 'bg-[#FEE2E2] text-[#EF4444] border-[#EF4444]/20' :
                                  'bg-[#FEF3C7] text-[#D97706] border-[#D97706]/20'
                                }`}>
                                {leave.status}
                              </span>

                              {leave.status === 'Pending' ? (
                                <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditLeave(leave); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className="p-2 text-[#6366F1] bg-white border border-[#E0E7FF] hover:bg-[#E0E7FF] rounded-xl shadow-sm transition-all"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleCancelLeave(leave._id)}
                                    className="p-2 text-[#EF4444] bg-white border border-[#FEE2E2] hover:bg-[#FEE2E2] rounded-xl shadow-sm transition-all"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-8"></div> // Spacer for alignment
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-[#9CA3AF] bg-white rounded-[20px] border border-dashed border-[#E5E7EB]">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-3 bg-white rounded-full shadow-sm">
                              <Layers size={24} className="opacity-20 text-[#111827]" />
                            </div>
                            <span className="text-[10px] uppercase tracking-widest font-bold">No Leave History Found</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {leaves.length > pageSize && (
                      <div className="mt-6 flex justify-end">
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
            </div>
          )}

          {activeTab === 'profile' && <EmployeeProfileView profile={profile} balances={balances} />}
          {activeTab === 'regularization' && <RegularizationRequest />}
          {activeTab === 'face-attendance' && <FaceAttendance />}
          {activeTab === 'team-leaves' && (
            <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[#E5E7EB]">
              <h3 className="text-lg font-bold text-[#111827] uppercase tracking-widest mb-6">Team Leave Requests</h3>
              <LeaveApprovals isManagerView={true} endpoint="/employee/leaves/team-requests" actionEndpoint="/employee/leaves/requests" />
            </div>
          )}
          {activeTab === 'team-regularization' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[#E5E7EB]">
                <h3 className="text-lg font-bold text-[#111827] uppercase tracking-widest mb-6">Team Attendance Correction</h3>
                <RegularizationApprovals isManagerView={true} category="Attendance" endpoint="/employee/regularization/team-requests" actionEndpoint="/employee/regularization/requests" />
              </div>
              <div className="bg-white p-6 rounded-[20px] shadow-sm border border-[#E5E7EB]">
                <h3 className="text-lg font-bold text-[#111827] uppercase tracking-widest mb-6">Team Leave Adjustments</h3>
                <RegularizationApprovals isManagerView={true} category="Leave" endpoint="/employee/regularization/team-requests" actionEndpoint="/employee/regularization/requests" />
              </div>
            </div>
          )}
          {activeTab === 'attendance' && <MyAttendanceView />}
          {activeTab === 'team-attendance' && <TeamAttendanceView />}
          {activeTab === 'internal-jobs' && <InternalJobs />}
          {activeTab === 'my-applications' && <MyApplications />}

        </div>
      )}

      {/* Global Modals */}
      <GlobalModal isOpen={showFaceModal} onClose={() => setShowFaceModal(false)} maxWidth="max-w-6xl">
        <FaceAttendance onSuccess={onFaceAttendanceSuccess} onClose={() => setShowFaceModal(false)} actionType={faceAction} />
      </GlobalModal>

      {violationModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
          <div className="relative bg-white w-full max-w-md rounded-[20px] p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-[#FEE2E2] rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-[#EF4444]" />
              </div>
              <h3 className="text-xl font-bold text-[#111827] mb-2">Policy Violation</h3>
            </div>
            <div className="space-y-3 my-6">
              {violationModal.violations.map((v, i) => (
                <div key={i} className="p-3 bg-[#F9FAFB] rounded-xl text-sm text-[#4B5563] border-l-4 border-[#EF4444]">{v}</div>
              ))}
            </div>
            <button onClick={() => setViolationModal({ show: false, violations: [] })} className="w-full py-3 bg-[#EF4444] text-white font-bold rounded-xl hover:bg-[#DC2626] transition-colors">Acknowledge</button>
          </div>
        </div>
      )}

    </div>
  );
}
