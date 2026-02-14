import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pagination } from 'antd';
import api from '../../utils/api';
import {
    Search, Filter, Download,
    Settings, ShieldAlert, RefreshCw,
    User, Clock, MapPin,
    MoreVertical, Edit2, Lock, X, Eye, ChevronLeft, ChevronRight, Upload,
    CheckCircle, XCircle, AlertTriangle, AlertCircle, LayoutDashboard, History, List, LogIn, LogOut, Package
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import AttendanceSettings from './AttendanceSettings';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import AttendanceHistory from './AttendanceHistory';
import AttendanceExcelUploadModal from '../../components/HR/AttendanceExcelUploadModal';

// --- Sub-components (Defined here for hoisting safety) ---

function StatItem({ label, value, icon, bgColor, tag }) {
    return (
        <div className={`relative overflow-hidden ${bgColor} p-7 rounded-[28px] shadow-lg group hover:scale-[1.02] hover:shadow-xl transition-all duration-300`}>
            {/* Glossy Overlay */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
                {/* Top Row: Icon and Tag */}
                <div className="flex justify-between items-start mb-8">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-sm transition-transform group-hover:rotate-6">
                        {icon && React.isValidElement(icon)
                            ? React.cloneElement(icon, { size: 22, strokeWidth: 2.5, className: "text-white" })
                            : null}
                    </div>
                    {tag && (
                        <span className="text-[10px] font-black text-white/90 bg-black/10 px-3 py-1.5 rounded-full uppercase tracking-[0.15em] border border-white/10 backdrop-blur-sm">
                            {tag}
                        </span>
                    )}
                </div>

                {/* Content Row: Value and Label */}
                <div className="mt-auto">
                    <h4 className="text-5xl font-black text-white tracking-tighter leading-none mb-2">
                        {value}
                    </h4>
                    <p className="text-[11px] font-black text-white/70 uppercase tracking-[0.2em]">
                        {label}
                    </p>
                </div>
            </div>

            {/* Background Shape */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
        </div>
    );
}

function StatusChip({ status }) {
    if (!status) return null;
    const config = {
        present: 'text-emerald-700 bg-emerald-50 border-emerald-100 ring-emerald-500/30',
        absent: 'text-rose-700 bg-rose-50 border-rose-100 ring-rose-500/30',
        leave: 'text-blue-700 bg-blue-50 border-blue-100 ring-blue-500/30',
        half_day: 'text-amber-700 bg-amber-50 border-amber-100 ring-amber-500/30',
        missed_punch: 'text-orange-700 bg-orange-50 border-orange-100 ring-orange-500/30',
        holiday: 'text-purple-700 bg-purple-50 border-purple-100 ring-purple-500/30',
        weekly_off: 'text-slate-600 bg-slate-100 border-slate-100 ring-slate-500/30',
    };
    const style = config[status.toLowerCase()] || 'bg-slate-50 text-slate-500 border-slate-100';

    return (
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ring-1 ring-inset ${style} shadow-sm transition-all duration-300 hover:scale-105`}>
            {typeof status === 'string' ? status.replace('_', ' ') : status}
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

// --- Main Component ---

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
                <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[24px] sm:rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-2">
                    <div className="relative z-10">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Attendance Dashboard</h1>
                        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] sm:text-[11px] mt-1">Real-time organizational presence & logs</p>
                    </div>
                    <div className="flex items-center gap-3 self-start md:self-auto relative z-10">
                        {view === 'dashboard' && (
                            <>
                                <DatePicker
                                    className="w-[160px] h-11 px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-2xl text-sm font-black focus:border-blue-500 hover:border-blue-400 shadow-sm transition-all"
                                    format="DD-MM-YYYY"
                                    placeholder="Select Date"
                                    allowClear={false}
                                    value={date ? dayjs(date) : null}
                                    onChange={(d) => setDate(d ? d.format('YYYY-MM-DD') : '')}
                                />
                                <button
                                    onClick={fetchStats}
                                    disabled={loading}
                                    className="w-11 h-11 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 transition shadow-sm"
                                    title="Sync Logs"
                                >
                                    <div className={`${loading ? 'animate-spin' : ''}`}>
                                        <RefreshCw size={18} strokeWidth={2.5} />
                                    </div>
                                </button>
                                <button
                                    onClick={() => setUploadingPopup(true)}
                                    className="flex items-center gap-2 h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                                >
                                    <Upload size={16} strokeWidth={3} />
                                    <span className="hidden sm:inline">Bulk Import</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Background Soft Ornament */}
                    <div className="absolute top-0 right-0 w-64 h-full bg-blue-50/50 dark:bg-blue-900/10 blur-3xl rounded-full pointer-events-none -mr-32 -mt-10"></div>
                </div>

                <div className="flex bg-slate-100/80 p-1.5 rounded-xl w-fit border border-slate-200/50 backdrop-blur-sm">
                    <TabButton active={view === 'dashboard'} onClick={() => setView('dashboard')} label="Live Dashboard" icon={<LayoutDashboard size={14} />} />
                    <TabButton active={view === 'attendanceHistory'} onClick={() => setView('attendanceHistory')} label="History" icon={<History size={14} />} />
                    <TabButton active={view === 'settings'} onClick={() => setView('settings')} label="Settings" icon={<Settings size={14} />} />
                </div>

                {view === 'dashboard' ? (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <StatItem
                                label="Active Count"
                                value={Array.isArray(attendance) ? attendance.length : 0}
                                icon={<User />}
                                bgColor="bg-[#4d69ff]"
                                tag="TOTAL"
                            />
                            <StatItem
                                label="Present"
                                value={Array.isArray(attendance) ? attendance.filter(a => a.status === 'present').length : 0}
                                icon={<CheckCircle />}
                                bgColor="bg-[#00c6a7]"
                                tag="LIVE"
                            />
                            <StatItem
                                label="Absent"
                                value={Array.isArray(attendance) ? attendance.filter(a => a.status === 'absent').length : 0}
                                icon={<XCircle />}
                                bgColor="bg-[#f95d3a]"
                                tag="ALERT"
                            />
                            <StatItem
                                label="Late Comers"
                                value={Array.isArray(attendance) ? attendance.filter(a => a.isLate).length : 0}
                                icon={<Clock />}
                                bgColor="bg-[#ff8f00]"
                                tag="FLAGS"
                            />
                        </div>

                        {/* Table Container */}
                        <div className="bg-white dark:bg-slate-900 rounded-[32px] border-2 border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                                <table className="min-w-[900px] w-full text-left text-sm border-separate border-spacing-0">
                                    <thead className="bg-slate-50/50 dark:bg-slate-950/50">
                                        <tr>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[25%] border-b border-slate-100 dark:border-slate-800 rounded-tl-[32px]">Employee Identity</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%] border-b border-slate-100 dark:border-slate-800">Presence Status</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[20%] border-b border-slate-100 dark:border-slate-800">Check-In Duration</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[10%] text-center border-b border-slate-100 dark:border-slate-800">Hours</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%] border-b border-slate-100 dark:border-slate-800">Administrative Note</th>
                                            <th className="px-10 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[15%] text-right border-b border-slate-100 dark:border-slate-800 rounded-tr-[32px]">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-900">
                                        {attendance.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300">
                                                            <Package size={32} />
                                                        </div>
                                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No attendance records found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : attendance.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                                            <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-10 py-5 whitespace-nowrap border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs font-black border border-white dark:border-slate-600 shadow-sm transition-transform group-hover:scale-110">
                                                            {item.employee?.firstName?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-900 dark:text-white tracking-tight">{item.employee?.firstName} {item.employee?.lastName}</div>
                                                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.employee?.employeeId}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                    <StatusChip status={item.status} />
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                    <div className="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-wider">
                                                        <div className="flex items-center gap-3 text-emerald-600">
                                                            <span className="opacity-50 w-6">IN</span>
                                                            <span className="bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800 font-mono text-[11px]">
                                                                {item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-rose-600">
                                                            <span className="opacity-50 w-6">OUT</span>
                                                            <span className="bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-lg border border-rose-100 dark:border-rose-800 font-mono text-[11px]">
                                                                {item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-center border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                    <span className="font-mono text-slate-900 dark:text-white font-black text-sm">{item.workingHours?.toFixed(1) || '0.0'}</span> <span className="text-[10px] font-black text-slate-400 uppercase">hrs</span>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                    {item.isManualOverride ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-full border border-amber-100 dark:border-amber-800" title="Manually Modified">
                                                            <ShieldAlert size={12} strokeWidth={3} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Modified</span>
                                                        </div>
                                                    ) : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                                </td>
                                                <td className="px-10 py-5 whitespace-nowrap text-right border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setViewingEmployee(item.employee)}
                                                            className="h-10 w-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:scale-110 active:scale-95"
                                                            title="View Register"
                                                        >
                                                            <Eye size={16} strokeWidth={2.5} />
                                                        </button>
                                                        <button
                                                            onClick={() => setBreakModal({ logs: item.logs, employee: item.employee })}
                                                            className="h-10 w-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:scale-110 active:scale-95"
                                                            title="View Activity Logs"
                                                        >
                                                            <List size={16} strokeWidth={2.5} />
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
                                                            className="h-10 w-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:scale-110 active:scale-95"
                                                            title="Edit Attendance"
                                                        >
                                                            <Edit2 size={16} strokeWidth={2.5} />
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
                                    total={Array.isArray(attendance) ? attendance.length : 0}
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




