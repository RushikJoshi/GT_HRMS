import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pagination } from 'antd';
import api from '../../utils/api';
import {
    Search, Filter, Download,
    Settings, ShieldAlert,
    User, Clock, MapPin,
    MoreVertical, Edit2, Lock, X, Eye, ChevronLeft, ChevronRight, Upload,
    CheckCircle, XCircle, AlertTriangle, AlertCircle, LayoutDashboard, History, List, LogIn, LogOut
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import AttendanceSettings from './AttendanceSettings';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import AttendanceHistory from './AttendanceHistory';
import AttendanceExcelUploadModal from '../../components/HR/AttendanceExcelUploadModal';

export default function AttendanceAdmin() {
    const [view, setView] = useState('dashboard'); // dashboard, settings
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Register View for specific employee
    const [viewingEmployee, setViewingEmployee] = useState(null);
    const [employeeAttendance, setEmployeeAttendance] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [holidays, setHolidays] = useState([]);
    const [settings, setSettings] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Edit Attendance Modal
    const [editingAttendance, setEditingAttendance] = useState(null);
    const [editForm, setEditForm] = useState({
        status: 'present',
        checkIn: '',
        checkOut: '',
        reason: ''
    });
    const [uploadingPopup, setUploadingPopup] = useState(false);
    const [saving, setSaving] = useState(false);
    const [breakModal, setBreakModal] = useState(null); // { logs: [], employee: {} }
    const fileInputRef = React.useRef(null);

    useEffect(() => {
        if (view === 'dashboard') {
            fetchStats();
        }
    }, [view, date]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/attendance/all?date=${date}`);
            setAttendance(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewingEmployee) fetchEmployeeRegister();
    }, [viewingEmployee, currentMonth, currentYear]);

    const fetchEmployeeRegister = async () => {
        try {
            const [attRes, holidayRes, settingsRes] = await Promise.all([
                api.get(`/attendance/my?employeeId=${viewingEmployee._id}&month=${currentMonth + 1}&year=${currentYear}`),
                api.get('/holidays'),
                api.get('/attendance/settings')
            ]);
            setEmployeeAttendance(attRes.data);
            setHolidays(holidayRes.data || []);
            setSettings(settingsRes.data || {});
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveEdit = async () => {
        if (!editForm.reason.trim()) {
            alert('Please provide a reason for the override');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                employeeId: editingAttendance.employee._id || editingAttendance.employee,
                date: editingAttendance.date,
                status: editForm.status,
                reason: editForm.reason
            };

            if (editForm.checkIn) {
                payload.checkIn = new Date(editForm.checkIn).toISOString();
            }
            if (editForm.checkOut) {
                payload.checkOut = new Date(editForm.checkOut).toISOString();
            }

            await api.post('/attendance/override', payload);
            setEditingAttendance(null);
            fetchStats(); // Refresh the attendance list
            alert('Attendance updated successfully');
        } catch (err) {
            console.error('Failed to save attendance edit:', err);
            alert(err.response?.data?.error || 'Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };


    return (
        <>
            <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 animate-in fade-in duration-500">
                {/* Header / Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Attendance Dashboard</h1>
                        <p className="text-slate-500 text-sm mt-1">Monitor daily attendance, check-ins, and irregularities.</p>
                    </div>
                    <div className="flex items-center gap-3 self-start md:self-auto">
                        {view === 'dashboard' && (
                            <>
                                <DatePicker
                                    className="w-[160px] px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:border-blue-500 hover:border-blue-400 shadow-sm"
                                    format="DD-MM-YYYY"
                                    placeholder="Select Date"
                                    allowClear={false}
                                    value={date ? dayjs(date) : null}
                                    onChange={(d) => setDate(d ? d.format('YYYY-MM-DD') : '')}
                                />
                                <button
                                    onClick={fetchStats}
                                    disabled={loading}
                                    className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition shadow-sm"
                                    title="Sync Logs"
                                >
                                    <div className={`${loading ? 'animate-spin' : ''}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setUploadingPopup(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition shadow-sm"
                                >
                                    <Upload size={16} />
                                    <span className="hidden sm:inline">Upload Excel</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex bg-slate-100/80 p-1.5 rounded-xl w-fit border border-slate-200/50 backdrop-blur-sm">
                    <TabButton active={view === 'dashboard'} onClick={() => setView('dashboard')} label="Live Dashboard" icon={<LayoutDashboard size={14} />} />
                    <TabButton active={view === 'attendanceHistory'} onClick={() => setView('attendanceHistory')} label="History" icon={<History size={14} />} />
                    <TabButton active={view === 'settings'} onClick={() => setView('settings')} label="Settings" icon={<Settings size={14} />} />
                </div>

                {view === 'dashboard' ? (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatItem
                                label="Active Count"
                                value={attendance.length}
                                icon={<User size={22} className="text-blue-600" />}
                                gradient="from-blue-50 to-white"
                                border="border-blue-100"
                                textColor="text-blue-900"
                            />
                            <StatItem
                                label="Present"
                                value={attendance.filter(a => a.status === 'present').length}
                                icon={<CheckCircle size={22} className="text-emerald-600" />}
                                gradient="from-emerald-50 to-white"
                                border="border-emerald-100"
                                textColor="text-emerald-900"
                            />
                            <StatItem
                                label="Absent"
                                value={attendance.filter(a => a.status === 'absent').length}
                                icon={<XCircle size={22} className="text-rose-600" />}
                                gradient="from-rose-50 to-white"
                                border="border-rose-100"
                                textColor="text-rose-900"
                            />
                            <StatItem
                                label="Late Comers"
                                value={attendance.filter(a => a.isLate).length}
                                icon={<Clock size={22} className="text-amber-600" />}
                                gradient="from-amber-50 to-white"
                                border="border-amber-100"
                                textColor="text-amber-900"
                            />
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm divide-y divide-slate-100">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check In / Out</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Note</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {attendance.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                                    No attendance records found for this date.
                                                </td>
                                            </tr>
                                        ) : attendance.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                                            <tr key={item._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                                                            {item.employee?.firstName?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900">{item.employee?.firstName} {item.employee?.lastName}</div>
                                                            <div className="text-xs text-slate-500 font-mono">{item.employee?.employeeId}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <StatusChip status={item.status} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 text-xs">
                                                        <div className="flex items-center gap-2 text-emerald-700">
                                                            <span className="font-medium w-8">IN</span>
                                                            <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 font-mono border border-emerald-100">
                                                                {item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-rose-700">
                                                            <span className="font-medium w-8">OUT</span>
                                                            <span className="bg-rose-50 px-1.5 py-0.5 rounded text-rose-700 font-mono border border-rose-100">
                                                                {item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-slate-700 font-medium">{item.workingHours?.toFixed(1) || '0.0'}</span> <span className="text-xs text-slate-400">hrs</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {item.isManualOverride ? (
                                                        <div className="flex items-center gap-1.5 text-amber-600" title="Manually Modified">
                                                            <ShieldAlert size={14} />
                                                            <span className="text-xs font-medium">Modified</span>
                                                        </div>
                                                    ) : <span className="text-slate-300">-</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => setViewingEmployee(item.employee)}
                                                            className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition"
                                                            title="View Register"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setBreakModal({ logs: item.logs, employee: item.employee })}
                                                            className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded transition"
                                                            title="View Activity Logs"
                                                        >
                                                            <List size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingAttendance(item);
                                                                setEditForm({
                                                                    status: item.status || 'present',
                                                                    checkIn: item.checkIn ? dayjs(item.checkIn).format('YYYY-MM-DDTHH:mm') : '',
                                                                    checkOut: item.checkOut ? dayjs(item.checkOut).format('YYYY-MM-DDTHH:mm') : '',
                                                                    reason: item.overrideReason || ''
                                                                });
                                                            }}
                                                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition"
                                                            title="Edit Attendance"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                                <Pagination
                                    current={currentPage}
                                    pageSize={pageSize}
                                    total={attendance.length}
                                    onChange={(page) => setCurrentPage(page)}
                                    showSizeChanger={false}
                                    size="small"
                                />
                            </div>
                        </div>
                    </div>
                ) : view === 'settings' ? (
                    <AttendanceSettings />
                ) : (
                    <AttendanceHistory />
                )}

                {/* Employee Register Modal - Portalled */}
                {viewingEmployee && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                            onClick={() => setViewingEmployee(null)}
                        ></div>
                        <div className="relative w-full max-w-6xl bg-slate-50 dark:bg-slate-950 rounded-[32px] shadow-2xl border border-white/20 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">

                            {/* Fixed Header */}
                            <div className="flex-none flex justify-between items-center p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 dark:text-slate-300 font-black text-xl shadow-sm border border-indigo-100 dark:border-slate-700">
                                        {viewingEmployee.firstName[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                            {viewingEmployee.firstName} {viewingEmployee.lastName}'s Register
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            {viewingEmployee.employeeId}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewingEmployee(null)}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-100 dark:border-slate-700 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-slate-950">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl w-fit border border-slate-100 dark:border-slate-800 shadow-sm mx-auto sm:mx-0">
                                        <button onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition text-slate-500"><ChevronLeft size={20} /></button>
                                        <span className="text-sm font-black uppercase tracking-widest min-w-[140px] text-center text-slate-700 dark:text-slate-200">
                                            {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition text-slate-500"><ChevronRight size={20} /></button>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                                        <AttendanceCalendar
                                            data={employeeAttendance}
                                            holidays={holidays}
                                            settings={settings}
                                            currentMonth={currentMonth}
                                            currentYear={currentYear}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Edit Attendance Modal - Portalled & Refined */}
                {editingAttendance && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                            onClick={() => setEditingAttendance(null)}
                        ></div>
                        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-white/20 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">

                            {/* Header */}
                            <div className="flex-none flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm border border-indigo-100 dark:border-indigo-800/50">
                                        <Edit2 size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                                            Edit Attendance
                                        </h3>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {editingAttendance.employee?.firstName} {editingAttendance.employee?.lastName} — {formatDateDDMMYYYY(editingAttendance.date)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingAttendance(null)}
                                    className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Scrollable Form Body */}
                            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">
                                            Status
                                        </label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition appearance-none"
                                        >
                                            <option value="present">Present</option>
                                            <option value="absent">Absent</option>
                                            <option value="half_day">Half Day</option>
                                            <option value="leave">Leave</option>
                                            <option value="missed_punch">Missed Punch</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">
                                                Check In Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={editForm.checkIn}
                                                onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">
                                                Check Out Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={editForm.checkOut}
                                                onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-xs font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">
                                            Reason for Override <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            value={editForm.reason}
                                            onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-sm font-medium text-slate-700 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition resize-none"
                                            rows="3"
                                            placeholder="Enter reason for manual override..."
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex-none p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setEditingAttendance(null)}
                                        disabled={saving}
                                        className="flex-1 px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={saving || !editForm.reason.trim()}
                                        className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
                {/* Breakdown / Logs Modal - Portalled to body to fix stacking/overflow issues */}
                {breakModal && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                            onClick={() => setBreakModal(null)}
                        ></div>
                        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-white/20 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">

                            {/* 1. Main Header (Fixed) */}
                            <div className="flex-none flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm border border-indigo-100 dark:border-indigo-800/50">
                                        {breakModal.employee?.firstName?.[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
                                            {breakModal.employee?.firstName} {breakModal.employee?.lastName}
                                        </h3>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            Activity Log
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setBreakModal(null)}
                                    className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* 2. Stats Sub-header (Fixed) */}
                            <div className="flex-none p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 z-10">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sessions</span>
                                        <div className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <List size={16} className="text-indigo-500" />
                                            {(() => {
                                                const logs = breakModal.logs || [];
                                                const ins = logs.filter(l => l.type === 'IN').length;
                                                return `${ins}`;
                                            })()}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col shadow-sm">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">First Punch</span>
                                        <div className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                            <Clock size={16} className="text-emerald-500" />
                                            {(() => {
                                                const logs = breakModal.logs || [];
                                                if (logs.length === 0) return '--:--';
                                                const sorted = [...logs].sort((a, b) => new Date(a.time) - new Date(b.time));
                                                return new Date(sorted[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Scrollable Body (Flexible) */}
                            <div className="flex-1 overflow-y-auto p-5 min-h-0 bg-white dark:bg-slate-900 custom-scrollbar">
                                {breakModal.logs && breakModal.logs.length > 0 ? (
                                    <div className="relative pl-3 pb-2">
                                        {/* Vertical Guide Line */}
                                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800"></div>

                                        {(() => {
                                            const sortedLogs = [...breakModal.logs].sort((a, b) => new Date(a.time) - new Date(b.time));
                                            const sessions = [];
                                            let currentIn = null;

                                            sortedLogs.forEach(log => {
                                                if (log.type === 'IN') {
                                                    currentIn = log;
                                                } else if (log.type === 'OUT' && currentIn) {
                                                    sessions.push({ in: currentIn, out: log });
                                                    currentIn = null;
                                                }
                                            });
                                            if (currentIn) {
                                                sessions.push({ in: currentIn, out: null });
                                            }

                                            return sessions.map((session, idx) => {
                                                const inTime = new Date(session.in.time);
                                                const outTime = session.out ? new Date(session.out.time) : null;
                                                let durationStr = 'Active';

                                                if (outTime) {
                                                    const diffMs = outTime - inTime;
                                                    const hrs = Math.floor(diffMs / 3600000);
                                                    const mins = Math.floor((diffMs % 3600000) / 60000);
                                                    durationStr = `${hrs}h ${mins}m`;
                                                }

                                                return (
                                                    <div key={idx} className="relative pl-10 mb-6 last:mb-0 group/card">
                                                        {/* Status Dot */}
                                                        <div className={`absolute left-[13px] top-6 w-3.5 h-3.5 rounded-full border-[3px] border-white dark:border-slate-900 z-10 shadow-sm transition-all ${outTime ? 'bg-indigo-500' : 'bg-emerald-500 animate-pulse'
                                                            }`}></div>

                                                        {/* Session Card */}
                                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all duration-200">
                                                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50 dark:border-slate-800/50">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    Session {idx + 1}
                                                                </span>
                                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${outTime
                                                                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'
                                                                    }`}>
                                                                    {durationStr}
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Started</span>
                                                                    <div className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight">
                                                                        {inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                                                        {session.in.location || 'Office'}
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col text-right">
                                                                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mb-1">Ended</span>
                                                                    <div className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight">
                                                                        {outTime ? outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                                                        {outTime ? (session.out?.location || 'Office') : 'Running...'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-400 gap-4">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                                            <History size={24} className="opacity-40" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">No activity recorded</span>
                                    </div>
                                )}
                            </div>

                            {/* 4. Footer with explicit Close button */}
                            <div className="flex-none p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => setBreakModal(null)}
                                    className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
                                >
                                    Close Activity Log
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            <AttendanceExcelUploadModal
                isOpen={uploadingPopup}
                onClose={() => setUploadingPopup(false)}
                onSuccess={() => {
                    setUploadingPopup(false);
                    fetchStats();
                }}
            />
        </>
    );
}

function StatItem({ label, value, icon, gradient, border, textColor = "text-slate-800" }) {
    return (
        <div className={`relative p-5 rounded-2xl border ${border} bg-gradient-to-br ${gradient} shadow-sm group hover:shadow-md transition-all duration-300 overflow-hidden`}>
            {/* Background Decoration */}
            <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                {React.cloneElement(icon, { size: 80 })}
            </div>

            <div className="relative flex justify-between items-start">
                <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</div>
                    <div className={`text-3xl font-bold ${textColor} tracking-tight`}>{value}</div>
                </div>
                <div className={`p-2.5 rounded-xl bg-white/80 backdrop-blur-sm border ${border} shadow-sm`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function StatusChip({ status }) {
    const config = {
        present: 'text-emerald-700 bg-emerald-50 border-emerald-200 ring-emerald-200/50',
        absent: 'text-rose-700 bg-rose-50 border-rose-200 ring-rose-200/50',
        leave: 'text-blue-700 bg-blue-50 border-blue-200 ring-blue-200/50',
        half_day: 'text-amber-700 bg-amber-50 border-amber-200 ring-amber-200/50',
        missed_punch: 'text-orange-700 bg-orange-50 border-orange-200 ring-orange-200/50',
        holiday: 'text-purple-700 bg-purple-50 border-purple-200 ring-purple-200/50',
        weekly_off: 'text-slate-600 bg-slate-100 border-slate-200 ring-slate-200/50',
    };
    const style = config[status.toLowerCase()] || 'bg-slate-50 text-slate-500 border-slate-200';

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ring-1 ring-inset ${style} capitalize shadow-sm`}>
            {status.replace('_', ' ')}
        </span>
    );
}

function TabButton({ active, label, onClick, icon }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300
                ${active
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
            `}
        >
            {icon && <span className={active ? 'text-indigo-500' : 'text-slate-400'}>{icon}</span>}
            {label}
        </button>
    );
}

// Add state for break modal
// Note: This function component is re-rendered with new closure when props change.
// However, useState is per-instance.
// It seems the user wants the content inserted into AttendanceAdmin.
// We need to inject the state and the button. Since `multi_replace_file_content` is better for multiple chunks, I will use single replace carefully to include the modal at end of main div and state at top.

// WAIT, I must add state first.
// The replace_file_content tool works on contiguous blocks.
// I will use `replace_file_content` to replace the whole `AttendanceAdmin` function body or stick to `multi_replace_file_content` if possible?
// The tool definition says "Do NOT use this tool if you are only editing a single contiguous block".
// Here I need to:
// 1. Add state `breakModal` at the top.
// 2. Add button in the table.
// 3. Add Modal JSX at the end.
// These are non-contiguous. I should use `multi_replace_file_content`.

// But I will check if I can do it in one go if I replace the whole return block + state?
// No, the table logic is in the middle.
// I'll use `multi_replace_file_content`.
