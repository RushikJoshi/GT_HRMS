import React, { useState, useEffect } from 'react';
import { Pagination, DatePicker, Modal } from 'antd';
import { showToast, showConfirmToast } from '../../utils/uiNotifications';
import dayjs from 'dayjs';
import api from '../../utils/api';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import {
    Upload, Plus, ChevronLeft, ChevronRight,
    Coffee, Edit2, Trash2, X, AlertCircle,
    FileSpreadsheet, AlertTriangle, CheckCircle, Save,
    Calendar as CalendarIcon, Clock
} from 'lucide-react';

export default function CalendarManagement() {
    const [view, setView] = useState('calendar'); // 'calendar' or 'list'
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [holidayForm, setHolidayForm] = useState({ name: '', date: '', type: 'Public', description: '' });
    const [settings, setSettings] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const [calendarData, setCalendarData] = useState(null);
    // Date panel state
    const [selectedDate, setSelectedDate] = useState(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [dateAttendanceData, setDateAttendanceData] = useState(null);
    const [dateLoading, setDateLoading] = useState(false);
    const [dateError, setDateError] = useState(null);

    // Bulk Upload State
    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploadErrors, setUploadErrors] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadSummary, setUploadSummary] = useState(null);

    useEffect(() => {
        fetchData();
    }, [currentYear, currentMonth]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Start requests in parallel but handle calendar failure separately so other UI parts still load
            const holidaysP = api.get(`/holidays?year=${currentYear}`);
            const settingsP = api.get('/attendance/settings');

            // Primary production-grade endpoint
            const calendarP = api.get(`/hr/attendance-calendar?year=${currentYear}&month=${currentMonth + 1}`).catch(async (err) => {
                console.warn('Primary /hr/attendance-calendar failed:', err.hrms || err.message || err);
                // Fallback to legacy endpoints for compatibility
                try {
                    const fallback = await api.get(`/hr/calendar?year=${currentYear}&month=${currentMonth + 1}`);
                    return { data: { days: fallback.data.calendarDays || fallback.data.days || [], holidays: fallback.data.holidays || [], settings: fallback.data.settings || {} } };
                } catch (err2) {
                    console.error('Fallback /hr/calendar also failed:', err2.hrms || err2.message || err2);
                    throw err; // rethrow original to be handled below
                }
            });

            const [holidaysRes, settingsRes, calendarRes] = await Promise.all([holidaysP, settingsP, calendarP]);

            setHolidays(holidaysRes.data || []);
            setSettings(settingsRes.data || {});

            // Normalize calendar response shape (support both { calendarDays } and { days })
            const cdata = calendarRes.data || {};
            if (Array.isArray(cdata.calendarDays)) {
                setCalendarData(cdata);
            } else if (Array.isArray(cdata.days)) {
                setCalendarData({ calendarDays: cdata.days, holidays: cdata.holidays || [], settings: cdata.settings || {} });
            } else {
                // defensive default
                setCalendarData({ calendarDays: [], holidays: cdata.holidays || [], settings: cdata.settings || {} });
            }

        } catch (err) {
            console.error('Failed to fetch calendar data:', err);
            const friendly = err.hrms?.message || err.response?.data?.error || err.message || 'Server error. Please try again.';
            showToast('error', 'Error', friendly);
        } finally {
            setLoading(false);
        }
    };

    // Fetch attendance details for a selected date when panel opens
    useEffect(() => {
        if (!selectedDate || !isPanelOpen) return;

        const fetchDateDetails = async () => {
            try {
                setDateLoading(true);
                setDateError(null);
                const res = await api.get(`/hr/attendance-calendar/detail?date=${encodeURIComponent(selectedDate)}`);
                console.debug('GET /hr/attendance-calendar/detail response:', res.data);
                const payload = res.data || {};

                const summary = {
                    totalEmployees: payload.totalEmployees || 0,
                    present: payload.present || 0,
                    onLeave: payload.onLeave || 0,
                    onDuty: payload.onDuty || 0
                };

                const employees = (payload.employees || []).map(e => ({
                    employeeId: e.employeeId || e.employee?._id || e.employee,
                    name: e.name || (e.employee ? `${e.employee.firstName || ''} ${e.employee.lastName || ''}`.trim() : 'Unknown'),
                    profilePic: e.profilePic || e.employee?.profilePic || '/uploads/default-avatar.png',
                    department: e.department || e.employee?.department || e.employee?.departmentId || '-',
                    attendanceStatus: e.status || e.attendanceStatus || (e.leaveType ? 'On Leave' : '-'),
                    leaveDetails: e.leaveType ? { type: e.leaveType, isHalfDay: !!e.isHalfDay } : null
                }));

                setDateAttendanceData({ summary, employees, holiday: payload.holiday || null });
            } catch (err) {
                console.error('Failed to fetch date attendance:', err);
                setDateError(err.response?.data || { message: err.message });
                setDateAttendanceData(null);
            } finally {
                setDateLoading(false);
            }
        };

        fetchDateDetails();
    }, [selectedDate, isPanelOpen]);

    const handleDateClick = (dateStr) => {
        setSelectedDate(dateStr);
        setIsPanelOpen(true);
    };

    const handleAddHoliday = () => {
        setEditingHoliday(null);
        setHolidayForm({ name: '', date: '', type: 'Public', description: '' });
        setShowHolidayModal(true);
    };

    const handleEditHoliday = (holiday) => {
        setEditingHoliday(holiday);
        const dateStr = new Date(holiday.date).toISOString().split('T')[0];
        setHolidayForm({
            name: holiday.name,
            date: dateStr,
            type: holiday.type || 'Public',
            description: holiday.description || ''
        });
        setShowHolidayModal(true);
    };

    const handleSaveHoliday = async () => {
        try {
            if (!holidayForm.name || !holidayForm.date) {
                showToast('error', 'Error', 'Please fill in holiday name and date');
                return;
            }

            if (editingHoliday) {
                await api.put(`/holidays/${editingHoliday._id}`, holidayForm);
            } else {
                await api.post('/holidays', holidayForm);
            }

            setShowHolidayModal(false);
            showToast('success', 'Success', 'Holiday saved successfully');
            fetchData();
        } catch (err) {
            console.error('Failed to save holiday:', err);
            showToast('error', 'Error', err.response?.data?.error || 'Failed to save holiday');
        }
    };

    const handleDeleteHoliday = async (id) => {
        showConfirmToast({
            title: 'Delete Holiday',
            description: 'Are you sure you want to delete this holiday? This action cannot be undone.',
            okText: 'Delete',
            cancelText: 'Cancel',
            danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`/holidays/${id}`);
                    showToast('success', 'Success', 'Holiday deleted successfully');
                    fetchData();
                } catch (err) {
                    console.error('Failed to delete holiday:', err);
                    showToast('error', 'Error', err.response?.data?.error || 'Failed to delete holiday');
                }
            }
        });
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadFile(file);
            setUploadPreview(null);
            setUploadSummary(null);
        }
    };

    const handlePreviewUpload = async () => {
        if (!uploadFile) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', uploadFile);

            const res = await api.post('/holidays/bulk/preview', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setUploadPreview(res.data.preview);
            setUploadErrors(res.data.errors || []);
            setUploadSummary(res.data.summary);
        } catch (err) {
            console.error('Failed to preview upload:', err);
            showToast('error', 'Error', err.response?.data?.error || 'Failed to process file');
            setUploadFile(null);
        } finally {
            setUploading(false);
        }
    };

    const handleConfirmUpload = async () => {
        if (!uploadPreview || uploadSummary?.new === 0) return;

        try {
            setUploading(true);
            const res = await api.post('/holidays/bulk/confirm', {
                holidays: uploadPreview,
                skipDuplicates: true
            });

            showToast('success', 'Success', `Successfully uploaded ${res.data.summary.saved} holidays!`);
            setShowBulkUploadModal(false);
            setUploadFile(null);
            setUploadPreview(null);
            setUploadErrors([]);
            setUploadSummary(null);
            fetchData(); // Refresh the holiday list
        } catch (err) {
            console.error('Failed to confirm upload:', err);
            showToast('error', 'Error', err.response?.data?.error || 'Failed to save holidays');
        } finally {
            setUploading(false);
        }
    };

    const navigateMonth = (direction) => {
        if (direction === 'prev') {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
            } else {
                setCurrentMonth(currentMonth - 1);
            }
        } else {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
            } else {
                setCurrentMonth(currentMonth + 1);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400 font-bold uppercase tracking-widest">Loading Calendar...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 md:p-8 animate-in fade-in duration-500">
            {/* Header & Stats */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                            Calendar Management
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage organization working days and holidays.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowBulkUploadModal(true)}
                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-2 shadow-sm"
                        >
                            <Upload size={16} />
                            <span className="hidden sm:inline">Bulk Upload</span>
                        </button>
                        <button
                            onClick={handleAddHoliday}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-md shadow-blue-500/20"
                        >
                            <Plus size={16} />
                            Add Holiday
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                        <div className="relative z-10">
                            <div className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Total Holidays</div>
                            <div className="text-3xl font-bold">{holidays.length}</div>
                            <div className="mt-2 text-blue-100 text-xs flex items-center gap-1">
                                <CalendarIcon size={12} />
                                <span>In {currentYear}</span>
                            </div>
                        </div>
                        <CalendarIcon className="absolute right-[-20px] bottom-[-20px] text-white opacity-10" size={120} />
                    </div>

                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
                        <div className="relative z-10">
                            <div className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Next Holiday</div>
                            <div className="text-xl font-bold truncate">
                                {holidays.find(h => new Date(h.date) >= new Date())?.name || 'No upcoming holidays'}
                            </div>
                            <div className="mt-2 text-emerald-100 text-xs flex items-center gap-1">
                                <Clock size={12} />
                                <span>
                                    {holidays.find(h => new Date(h.date) >= new Date())
                                        ? formatDateDDMMYYYY(holidays.find(h => new Date(h.date) >= new Date()).date)
                                        : 'Relax!'}
                                </span>
                            </div>
                        </div>
                        <Coffee className="absolute right-[-10px] bottom-[-20px] text-white opacity-10" size={100} />
                    </div>

                    <div className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between h-full">
                            <div>
                                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">View Mode</div>
                                <div className="flex bg-slate-100 p-1 rounded-lg mt-2 w-fit">
                                    <button
                                        onClick={() => setView('calendar')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Calendar
                                    </button>
                                    <button
                                        onClick={() => setView('list')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        List
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Year</span>
                                <select
                                    value={currentYear}
                                    onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                                    className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const year = new Date().getFullYear() - 1 + i;
                                        return (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Banner removed per request */}

            {view === 'calendar' ? (
                <div className="space-y-6">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => navigateMonth('prev')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500 hover:text-slate-800"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-lg font-bold text-slate-900">
                            {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                        <button
                            onClick={() => navigateMonth('next')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500 hover:text-slate-800"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Calendar Legend */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legend</div>
                        <div className="flex flex-wrap gap-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                Holiday
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Weekly Off
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Present
                            </span>
                        </div>
                    </div>

                    {/* Calendar + Right-side Date Panel (70% / 30%) */}
                    {calendarData && (
                        <div className="flex gap-6 items-stretch">
                            {/* Left: Calendar (70%) */}
                            <div className="w-[70%]">
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 h-full">
                                    <AttendanceCalendar
                                        data={calendarData.days || calendarData.calendarDays || []}
                                        holidays={calendarData.holidays || []}
                                        settings={calendarData.settings || {}}
                                        currentMonth={currentMonth}
                                        currentYear={currentYear}
                                        onDateClick={handleDateClick}
                                        selectedDate={selectedDate}
                                    />
                                </div>
                            </div>

                            {/* Right: Fixed Date Panel (30%) */}
                            <div className="w-[30%] max-w-[420px] sticky top-20 self-stretch">
                                <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <div className="text-sm font-bold">{selectedDate ? new Date(selectedDate).toLocaleDateString() : ''}</div>
                                        <div className="text-xs text-slate-400">{selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long' }) : ''}</div>
                                    </div>

                                    <div className="p-4 flex flex-col flex-1 space-y-3">
                                        {dateLoading ? (
                                            <div className="text-sm text-slate-500">Loading...</div>
                                        ) : dateError ? (
                                            <div className="text-sm text-rose-600">{dateError.message || 'Failed to load'}</div>
                                        ) : dateAttendanceData ? (
                                            <>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                                                        <div className="text-xs text-slate-400">Total</div>
                                                        <div className="font-bold text-lg">{dateAttendanceData.summary?.totalEmployees ?? 0}</div>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                                                        <div className="text-xs text-slate-400">On Leave</div>
                                                        <div className="font-bold text-lg">{dateAttendanceData.summary?.onLeave ?? 0}</div>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                                                        <div className="text-xs text-slate-400">On Duty</div>
                                                        <div className="font-bold text-lg">{dateAttendanceData.summary?.onDuty ?? 0}</div>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                                                        <div className="text-xs text-slate-400">Present</div>
                                                        <div className="font-bold text-lg">{dateAttendanceData.summary?.present ?? 0}</div>
                                                    </div>
                                                </div>

                                                <div className="mt-3 text-sm font-semibold text-slate-700">Employees</div>
                                                <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-2">
                                                    {(dateAttendanceData.employees?.length || 0) === 0 ? (
                                                        <div className="text-center text-slate-500 py-6">No leave records found</div>
                                                    ) : (
                                                        (dateAttendanceData.employees || []).map(emp => (
                                                            <div key={emp.employeeId} className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-50">
                                                                <img src={emp.profilePic || '/uploads/default-avatar.png'} alt={emp.name} className="w-10 h-10 rounded-full object-cover" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-slate-800 truncate">{emp.name}</div>
                                                                    <div className="text-xs text-slate-400 truncate">{emp.employeeId} • {emp.department || '—'}</div>
                                                                    {emp.leaveDetails && (
                                                                        <div className="text-[11px] text-slate-500 mt-1">
                                                                            <span className="font-medium">{emp.leaveDetails.leaveType}</span>
                                                                            <span className="ml-2 text-xs">{emp.leaveDetails.status} {emp.leaveDetails.isHalfDay ? '• Half Day' : ''}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700">{emp.attendanceStatus}</div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-sm text-slate-400">Select a date to view details</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="text-sm font-semibold text-slate-700">
                            Holidays ({currentYear})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-3 font-semibold text-slate-700">Date</th>
                                    <th className="px-6 py-3 font-semibold text-slate-700">Holiday Name</th>
                                    <th className="px-6 py-3 font-semibold text-slate-700">Type</th>
                                    <th className="px-6 py-3 font-semibold text-slate-700">Description</th>
                                    <th className="px-6 py-3 font-semibold text-slate-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {holidays.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                            No holidays defined for {currentYear}
                                        </td>
                                    </tr>
                                ) : (
                                    holidays.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((holiday) => {
                                        const holidayDate = new Date(holiday.date);
                                        const holidayYear = holidayDate.getFullYear();
                                        return (
                                            <tr key={holiday._id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="font-medium text-slate-900">
                                                            {formatDateDDMMYYYY(holiday.date)}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{holiday.name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                        ${holiday.type === 'Public' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                            holiday.type === 'Optional' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                                'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                        {holiday.type || 'Public'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                                                    {holiday.description || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => handleEditHoliday(holiday)}
                                                            className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteHoliday(holiday._id)}
                                                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {holidays.length > pageSize && (
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <Pagination
                                current={currentPage}
                                pageSize={pageSize}
                                total={holidays.length}
                                onChange={(page) => setCurrentPage(page)}
                                showSizeChanger={false}
                                hideOnSinglePage
                                size="small"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Holiday Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHolidayModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
                            </h3>
                            <button
                                onClick={() => setShowHolidayModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Holiday Name *
                                </label>
                                <input
                                    type="text"
                                    value={holidayForm.name}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                                    placeholder="e.g., Diwali, Christmas"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Date *
                                </label>
                                <DatePicker
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition h-[46px]"
                                    format="DD-MM-YYYY"
                                    placeholder="DD-MM-YYYY"
                                    value={holidayForm.date ? dayjs(holidayForm.date) : null}
                                    onChange={(date) => setHolidayForm({ ...holidayForm, date: date ? date.format('YYYY-MM-DD') : '' })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Type
                                </label>
                                <select
                                    value={holidayForm.type}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition"
                                >
                                    <option value="Public">Public Holiday</option>
                                    <option value="Optional">Optional Holiday</option>
                                    <option value="Company">Company Holiday</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={holidayForm.description}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition resize-none"
                                    rows="3"
                                    placeholder="Optional description"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowHolidayModal(false)}
                                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveHoliday}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition flex items-center justify-center gap-2"
                            >
                                <Save size={16} />
                                {editingHoliday ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => {
                        setShowBulkUploadModal(false);
                        setUploadFile(null);
                        setUploadPreview(null);
                        setUploadErrors([]);
                        setUploadSummary(null);
                    }}></div>
                    <div className="relative w-full w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                    <FileSpreadsheet className="text-emerald-500" size={24} />
                                    Bulk Holiday Upload
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-2">
                                    Upload Excel file (.xlsx, .xls) with columns: Name, Date, Type (optional), Description (optional)
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowBulkUploadModal(false);
                                    setUploadFile(null);
                                    setUploadPreview(null);
                                    setUploadErrors([]);
                                    setUploadSummary(null);
                                }}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {!uploadPreview ? (
                            <div className="space-y-6">
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center hover:border-emerald-500 transition-colors">
                                    <input
                                        type="file"
                                        id="bulk-upload-file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <label htmlFor="bulk-upload-file" className="cursor-pointer">
                                        <Upload size={48} className="mx-auto text-slate-400 mb-4" />
                                        <div className="text-lg font-black text-slate-600 dark:text-slate-300 mb-2">
                                            Click to upload or drag and drop
                                        </div>
                                        <div className="text-sm font-bold text-slate-400">
                                            Excel files (.xlsx, .xls) up to 5MB
                                        </div>
                                        {uploadFile && (
                                            <div className="mt-4 text-sm font-bold text-emerald-600">
                                                Selected: {uploadFile.name}
                                            </div>
                                        )}
                                    </label>
                                </div>

                                {uploadFile && (
                                    <button
                                        onClick={handlePreviewUpload}
                                        disabled={uploading}
                                        className="w-full px-6 py-4 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <FileSpreadsheet size={20} />
                                                Preview Upload
                                            </>
                                        )}
                                    </button>
                                )}

                                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-2xl p-4">
                                    <div className="text-sm font-black text-blue-800 dark:text-blue-200 mb-2">File Format:</div>
                                    <div className="text-xs font-bold text-blue-700 dark:text-blue-300 space-y-1">
                                        <div>Row 1: Header (will be skipped)</div>
                                        <div>Columns: Name | Date | Type (optional) | Description (optional)</div>
                                        <div>Example: "Diwali" | "01-11-2024" | "Festival" | "Hindu festival"</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Summary */}
                                {uploadSummary && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
                                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">New</div>
                                            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{uploadSummary.new}</div>
                                        </div>
                                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4">
                                            <div className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Duplicates</div>
                                            <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{uploadSummary.duplicates}</div>
                                        </div>
                                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl p-4">
                                            <div className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Errors</div>
                                            <div className="text-2xl font-black text-rose-700 dark:text-rose-300">{uploadSummary.errors}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Preview Table */}
                                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                {uploadPreview.map((holiday, idx) => (
                                                    <tr key={idx} className={`${holiday.isDuplicate ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            {holiday.isDuplicate ? (
                                                                <div className="flex items-center gap-2 text-amber-600">
                                                                    <AlertTriangle size={14} />
                                                                    <span className="text-[10px] font-black">Duplicate</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-emerald-600">
                                                                    <CheckCircle size={14} />
                                                                    <span className="text-[10px] font-black">New</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">{holiday.name}</td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                            {new Date(holiday.date).toLocaleDateString('en-US', {
                                                                year: 'numeric', month: 'short', day: 'numeric'
                                                            })}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded text-xs font-black uppercase">
                                                                {holiday.type || 'Public'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                            {holiday.description || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Errors */}
                                {uploadErrors && uploadErrors.length > 0 && (
                                    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-2xl p-4">
                                        <div className="text-sm font-black text-rose-800 dark:text-rose-200 mb-2">Errors:</div>
                                        <div className="space-y-1">
                                            {uploadErrors.map((err, idx) => (
                                                <div key={idx} className="text-xs font-bold text-rose-700 dark:text-rose-300">
                                                    Row {err.row}: {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setUploadPreview(null);
                                            setUploadFile(null);
                                            setUploadSummary(null);
                                        }}
                                        className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmUpload}
                                        disabled={uploading || !uploadPreview || uploadSummary?.new === 0}
                                        className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                Confirm & Save ({uploadSummary?.new || 0} holidays)
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

