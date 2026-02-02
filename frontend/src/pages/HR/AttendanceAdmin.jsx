import React, { useState, useEffect } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';
import {
    Search, Filter, Download,
    Settings, ShieldAlert,
    User, Clock, MapPin,
    MoreVertical, Edit2, Lock, X, Eye, ChevronLeft, ChevronRight, Upload,
    CheckCircle, XCircle, AlertTriangle, AlertCircle, LayoutDashboard, History
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import AttendanceSettings from './AttendanceSettings';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import AttendanceHistory from './AttendanceHistory';
import * as XLSX from 'xlsx';

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
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadedData, setUploadedData] = useState(null);
    const [showUploadPreview, setShowUploadPreview] = useState(false);
    const [confirmUpload, setConfirmUpload] = useState(false);
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

    // const handleFileUpload = async (e) => {
    //     const file = e.target.files[0];
    //     if (!file) return;

    //     const formData = new FormData();
    //     formData.append('file', file);

    //     try {
    //         setUploading(true);
    //         const res = await api.post('/attendance/upload-excel', formData, {
    //             headers: { 'Content-Type': 'multipart/form-data' }
    //         });
    //         alert(res.data.message);
    //         fetchStats();
    //     } catch (err) {
    //         console.error('Upload failed:', err);
    //         alert(err.response?.data?.error || 'Failed to upload attendance');
    //     } finally {
    //         setUploading(false);
    //         if (fileInputRef.current) fileInputRef.current.value = '';
    //     }
    // };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                let jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (!jsonData || jsonData.length === 0) {
                    alert('Excel file is empty');
                    return;
                }

                // Normalize and convert data
                jsonData = jsonData.map((row, index) => {
                    const convertTime = (decimalValue) => {
                        // If it's a string time format like "HH:MM:SS"
                        if (typeof decimalValue === 'string') {
                            return decimalValue;
                        }
                        // If it's a date object
                        if (decimalValue instanceof Date) {
                            return decimalValue.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                second: '2-digit',
                                hour12: true 
                            });
                        }
                        // If it's a decimal number (Excel time format)
                        if (typeof decimalValue === 'number' && decimalValue < 1) {
                            const hours = Math.floor(decimalValue * 24);
                            const minutes = Math.floor((decimalValue * 24 - hours) * 60);
                            const seconds = Math.floor(((decimalValue * 24 - hours) * 60 - minutes) * 60);
                            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                        }
                        return decimalValue;
                    };

                    const convertDate = (dateValue) => {
                        if (!dateValue) return null;
                        if (typeof dateValue === 'string') return dateValue;
                        if (dateValue instanceof Date) {
                            return dateValue.toISOString().split('T')[0];
                        }
                        return dateValue;
                    };

                    // Process all columns while preserving original names
                    const processedRow = {};
                    for (const [key, value] of Object.entries(row)) {
                        if (key.toLowerCase().includes('check in') || key.toLowerCase().includes('checkin')) {
                            processedRow['CHECK IN'] = convertTime(value);
                        } else if (key.toLowerCase().includes('check out') || key.toLowerCase().includes('checkout')) {
                            processedRow['CHECK OUT'] = convertTime(value);
                        } else if (key.toLowerCase().includes('date')) {
                            processedRow['DATE'] = convertDate(value);
                        } else {
                            processedRow[key] = value;
                        }
                    }

                    return processedRow;
                });

                console.log('Processed records:', jsonData.length);
                console.log('Sample record:', jsonData[0]);

                setUploadedData({
                    fileName: file.name,
                    rowCount: jsonData.length,
                    previewData: jsonData.slice(0, 10),
                    fullData: jsonData
                });
                setShowUploadPreview(true);
            } catch (error) {
                console.error('Error reading file:', error);
                alert('Failed to read Excel file. Please check the file format: ' + error.message);
            }
        };

        reader.onerror = () => {
            alert('Failed to read the file');
        };

        reader.readAsArrayBuffer(file);
    };

    return (
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
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
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
                                                        onClick={() => {
                                                            setEditingAttendance(item);
                                                            setEditForm({
                                                                status: item.status || 'present',
                                                                checkIn: item.checkIn ? new Date(item.checkIn).toISOString().slice(0, 16) : '',
                                                                checkOut: item.checkOut ? new Date(item.checkOut).toISOString().slice(0, 16) : '',
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

            {/* Employee Register Modal (Reuse the same logic) */}
            {viewingEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingEmployee(null)}></div>
                    <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-slate-950 rounded-[40px] shadow-2xl border border-white/20 p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-300 font-black text-xl shadow-lg">
                                    {viewingEmployee.firstName[0]}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                        {viewingEmployee.firstName} {viewingEmployee.lastName}'s Register
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewingEmployee.employeeId}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingEmployee(null)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 shadow-lg transition">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl w-fit border border-slate-100 dark:border-slate-800 shadow-sm">
                                <button onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"><ChevronLeft size={20} /></button>
                                <span className="text-sm font-black uppercase tracking-widest min-w-[120px] text-center">
                                    {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"><ChevronRight size={20} /></button>
                            </div>

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
            )}

            {/* Edit Attendance Modal */}
            {editingAttendance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingAttendance(null)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                    Edit Attendance
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">
                                    {editingAttendance.employee?.firstName} {editingAttendance.employee?.lastName} - {formatDateDDMMYYYY(editingAttendance.date)}
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingAttendance(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Status *
                                </label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                                >
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="leave">Leave</option>
                                    <option value="missed_punch">Missed Punch</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Check In Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editForm.checkIn}
                                    onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Check Out Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editForm.checkOut}
                                    onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Reason for Override *
                                </label>
                                <textarea
                                    value={editForm.reason}
                                    onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition resize-none"
                                    rows="3"
                                    placeholder="Enter reason for manual override..."
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setEditingAttendance(null)}
                                disabled={saving}
                                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving || !editForm.reason.trim()}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Preview Modal */}
            {showUploadPreview && uploadedData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowUploadPreview(false)}></div>
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                    Upload Preview
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-1">
                                    File: {uploadedData.fileName} • Total Records: {uploadedData.rowCount}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowUploadPreview(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {uploadedData.previewData.length > 0 ? (
                            <div className="overflow-x-auto mb-6">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            {Object.keys(uploadedData.previewData[0]).map((header, idx) => (
                                                <th key={idx} className="px-4 py-3 text-left text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {uploadedData.previewData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                {Object.values(row).map((value, colIdx) => (
                                                    <td key={colIdx} className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        {String(value)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-slate-500 dark:text-slate-400 font-bold">No data to display</p>
                            </div>
                        )}

                        {uploadedData.rowCount > 10 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6">
                                <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                    Showing first 10 of {uploadedData.rowCount} records
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowUploadPreview(false)}
                                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        setUploading(true);
                                        console.log('Uploading', uploadedData.fullData.length, 'records');
                                        const res = await api.post('/attendance/bulk-upload', {
                                            records: uploadedData.fullData
                                        });
                                        
                                        // Build detailed message
                                        let message = `✅ ${res.data.uploadedCount} records uploaded successfully`;
                                        if (res.data.failedCount > 0) {
                                            message += `\n⚠️ ${res.data.failedCount} records failed`;
                                            if (res.data.errors && res.data.errors.length > 0) {
                                                message += `\n\nErrors:\n${res.data.errors.slice(0, 5).join('\n')}`;
                                                if (res.data.errors.length > 5) {
                                                    message += `\n... and ${res.data.errors.length - 5} more errors`;
                                                }
                                            }
                                        }
                                        
                                        alert(message);
                                        setShowUploadPreview(false);
                                        setUploadedData(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                        fetchStats();
                                    } catch (err) {
                                        console.error('Upload failed:', err);
                                        const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to upload attendance';
                                        alert(`❌ Upload Failed\n\n${errorMessage}`);
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                disabled={uploading}
                                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Uploading...
                                    </>
                                ) : (
                                    `Confirm Upload (${uploadedData.rowCount} records)`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
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
