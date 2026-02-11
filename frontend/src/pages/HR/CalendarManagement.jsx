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
import { useSearchParams } from 'react-router-dom';

// --- Helpers & Compact Components ---

const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
};

const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

const EmployeeAvatar = ({ employee, size = "w-10 h-10", initialsSize = "text-[10px]", className = "" }) => {
    const [imgError, setImgError] = useState(false);
    const imageUrl = getImageUrl(employee?.profilePic);
    const hasImage = imageUrl && employee.profilePic !== '/uploads/default-avatar.png';

    if (!hasImage || imgError) {
        const initials = getInitials(employee?.name);
        return (
            <div className={`${size} rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm shrink-0 ${className}`}>
                <span className={`${initialsSize} font-black text-blue-600 uppercase tracking-tighter`}>{initials}</span>
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt={employee?.name}
            onError={() => setImgError(true)}
            className={`${size} rounded-full object-cover border-2 border-slate-100 shadow-sm shrink-0 ${className}`}
        />
    );
};

export default function CalendarManagement() {
    const [searchParams] = useSearchParams();

    // Custom scrollbar styles
    const scrollbarStyle = `
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
        }
    `;
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
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [dateAttendanceData, setDateAttendanceData] = useState(null);
    const [dateLoading, setDateLoading] = useState(false);
    const [dateError, setDateError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('total');
    const [showEmployeeList, setShowEmployeeList] = useState(false);

    // Detail Modal State
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Bulk Upload State (Restored)
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
            const res = await api.get(`/attendance/calendar?year=${currentYear}&month=${currentMonth + 1}`);
            const data = res.data || {};

            setCalendarData(data);
            setHolidays(data.holidays || []);
            setSettings(data.settings || {});

        } catch (err) {
            console.error('Failed to fetch calendar data:', err);
            showToast('error', 'Error', 'Failed to load calendar data');
        } finally {
            setLoading(false);
        }
    };

    // Fetch attendance details for a selected date
    useEffect(() => {
        if (!selectedDate || !isPanelOpen) return;

        const fetchDateDetails = async () => {
            try {
                setDateLoading(true);
                setDateError(null);
                const res = await api.get(`/attendance/by-date?date=${selectedDate}&filterType=${statusFilter}`);
                setDateAttendanceData(res.data);
            } catch (err) {
                console.error('Failed to fetch date attendance:', err);
                setDateError(err.response?.data || { message: err.message });
            } finally {
                setDateLoading(false);
            }
        };

        fetchDateDetails();
    }, [selectedDate, isPanelOpen, statusFilter]);

    const handleEmployeeClick = async (employee) => {
        try {
            setDetailLoading(true);
            setShowDetailModal(true);
            const res = await api.get(`/attendance/employee/${employee._id}/${selectedDate}`);
            setSelectedEmployeeDetail(res.data);
        } catch (err) {
            console.error('Failed to fetch employee details:', err);
            showToast('error', 'Error', 'Failed to load employee details');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDateClick = (dateStr) => {
        const dateStrIso = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        setSelectedDate(dateStrIso);
        setStatusFilter('total');
        setShowEmployeeList(false); // Hide list on date change as per rule
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
                <style>{scrollbarStyle}</style>
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

                    {/* Monthly Summary Grid */}
                    {calendarData?.summary && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="bg-white border-l-4 border-emerald-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Present</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{calendarData.summary.totalPresent}</span>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Days</span>
                                </div>
                            </div>
                            <div className="bg-white border-l-4 border-rose-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Absent</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{calendarData.summary.totalAbsent}</span>
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Days</span>
                                </div>
                            </div>
                            <div className="bg-white border-l-4 border-indigo-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Leave</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{calendarData.summary.totalLeave}</span>
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Days</span>
                                </div>
                            </div>
                            <div className="bg-white border-l-4 border-amber-500 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Holidays</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{calendarData.summary.totalHolidays}</span>
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Fixed</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Calendar + Right-side Date Panel (70% / 30%) with Non-Scroll Architecture */}
                    {calendarData && (
                        <div className="flex gap-6 items-start">
                            {/* Left: Calendar (70%) - Expansion Zone */}
                            <div className="w-[70%]">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-visible">
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

                            {/* Right: Sticky Date Panel (30%) */}
                            <div className="w-[30%] max-w-[420px] sticky top-6 h-[calc(100vh-140px)] min-h-[500px]">
                                <div className="h-full bg-slate-50 rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                                    {/* Panel Header - Sticky Part (flex-shrink-0) */}
                                    <div className="flex-shrink-0 bg-white border-b border-slate-200 p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-black text-slate-800 tracking-tight">
                                                    {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                    {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long' }) : ''}
                                                </div>
                                            </div>
                                            <div className="bg-blue-50 px-2 py-1 rounded-lg text-blue-600 border border-blue-100">
                                                <CalendarIcon size={14} />
                                            </div>
                                        </div>

                                        {/* Summary Cards Grid (Part of Sticky Top) */}
                                        {dateAttendanceData && (
                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                <div
                                                    onClick={() => { setStatusFilter('total'); setShowEmployeeList(true); }}
                                                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${showEmployeeList && statusFilter === 'total' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'}`}
                                                >
                                                    <div className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${showEmployeeList && statusFilter === 'total' ? 'text-blue-100' : 'text-slate-400'}`}>Total</div>
                                                    <div className="font-black text-lg leading-none">{dateAttendanceData.summary?.totalEmployees ?? 0}</div>
                                                </div>
                                                <div
                                                    onClick={() => {
                                                        if (!dateAttendanceData.summary?.isFutureDate) {
                                                            setStatusFilter('present');
                                                            setShowEmployeeList(true);
                                                        }
                                                    }}
                                                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 ${dateAttendanceData.summary?.isFutureDate ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer'} ${showEmployeeList && statusFilter === 'present' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200'}`}
                                                >
                                                    <div className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${showEmployeeList && statusFilter === 'present' ? 'text-emerald-100' : 'text-slate-400'}`}>Present</div>
                                                    <div className="font-black text-lg leading-none">{dateAttendanceData.summary?.present ?? 0}</div>
                                                </div>
                                                <div
                                                    onClick={() => {
                                                        if (!dateAttendanceData.summary?.isFutureDate) {
                                                            setStatusFilter('absent');
                                                            setShowEmployeeList(true);
                                                        }
                                                    }}
                                                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 ${dateAttendanceData.summary?.isFutureDate ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer'} ${showEmployeeList && statusFilter === 'absent' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-rose-200'}`}
                                                >
                                                    <div className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${showEmployeeList && statusFilter === 'absent' ? 'text-rose-100' : 'text-slate-400'}`}>Absent</div>
                                                    <div className="font-black text-lg leading-none">{dateAttendanceData.summary?.absent ?? 0}</div>
                                                </div>
                                                <div
                                                    onClick={() => { setStatusFilter('leave'); setShowEmployeeList(true); }}
                                                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${showEmployeeList && statusFilter === 'leave' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}
                                                >
                                                    <div className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${showEmployeeList && statusFilter === 'leave' ? 'text-indigo-100' : 'text-slate-400'}`}>Leave</div>
                                                    <div className="font-black text-lg leading-none">{dateAttendanceData.summary?.onLeave ?? 0}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Employee List - Scrollable Part (flex-1 overflow-y-auto) */}
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                        {dateLoading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        ) : dateError ? (
                                            <div className="flex items-center justify-center h-full text-center p-6">
                                                <div>
                                                    <AlertTriangle className="mx-auto text-rose-500 mb-2" size={32} />
                                                    <div className="text-sm font-bold text-slate-800">{dateError.message || 'Failed to load data'}</div>
                                                    <button onClick={() => fetchData()} className="mt-4 text-xs font-bold text-blue-600 uppercase hover:underline">Retry</button>
                                                </div>
                                            </div>
                                        ) : dateAttendanceData && showEmployeeList ? (
                                            <>
                                                <div className="flex items-center justify-between mb-3 sticky top-0 bg-slate-50 py-1 z-10">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{statusFilter} Records</div>
                                                    <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">{dateAttendanceData.employees?.length || 0} Employees</div>
                                                </div>
                                                <div className="space-y-2">
                                                    {dateAttendanceData.employees?.length > 0 ? (
                                                        dateAttendanceData.employees.map(emp => (
                                                            <div
                                                                key={emp.employeeId}
                                                                onClick={() => handleEmployeeClick(emp)}
                                                                className="flex items-center gap-3 p-3 rounded-xl border border-white bg-white hover:border-blue-200 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 group"
                                                            >
                                                                <div className="relative flex-shrink-0">
                                                                    <EmployeeAvatar employee={emp} />
                                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${['Present', 'Half Day', 'On Duty'].includes(emp.status) ? 'bg-emerald-500' :
                                                                        emp.status === 'Absent' ? 'bg-rose-500' :
                                                                            emp.status === 'Leave' ? 'bg-indigo-500' :
                                                                                emp.status === 'Holiday' ? 'bg-amber-500' :
                                                                                    emp.status === 'Weekly Off' ? 'bg-slate-400' :
                                                                                        'bg-slate-200'
                                                                        }`}></div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight text-xs">{emp.name}</div>
                                                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{emp.employeeId} • {emp.department}</div>
                                                                </div>
                                                                <div className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border flex-shrink-0 ${['Present', 'Half Day', 'On Duty'].includes(emp.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                    emp.status === 'Absent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                        emp.status === 'Leave' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                                            emp.status === 'Holiday' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                                emp.status === 'Weekly Off' ? 'bg-slate-50 text-slate-600 border-slate-100' :
                                                                                    'bg-slate-50 text-slate-400 border-slate-50'
                                                                    }`}>
                                                                    {emp.status === 'Not Marked' ? '--' : emp.status}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                                                                <AlertCircle className="text-slate-300" size={32} />
                                                            </div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Employees Found</p>
                                                            <p className="text-[9px] text-slate-300 mt-1 uppercase">Filter: {statusFilter}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                                <div className="w-20 h-20 bg-white rounded-full mb-4 flex items-center justify-center shadow-sm transition-transform hover:scale-110">
                                                    <CalendarIcon className="text-slate-200" size={40} />
                                                </div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Click a summary card</p>
                                                <p className="text-[9px] text-slate-300 uppercase font-bold leading-relaxed px-8">To view the detailed employee listing for the selected date.</p>
                                            </div>
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
            {/* Employee Detail Modal */}
            <Modal
                open={showDetailModal}
                onCancel={() => setShowDetailModal(false)}
                footer={null}
                width={600}
                centered
                closeIcon={<X className="text-slate-400 hover:text-rose-500 transition-colors" size={20} />}
                className="attendance-detail-modal"
            >
                {detailLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fetching Details...</p>
                    </div>
                ) : selectedEmployeeDetail ? (
                    <div className="p-2 space-y-8 animate-in fade-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                            <EmployeeAvatar
                                employee={selectedEmployeeDetail.employee}
                                size="w-20 h-20"
                                initialsSize="text-2xl"
                                className="rounded-2xl shadow-lg"
                            />
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedEmployeeDetail.employee?.name}</h2>
                                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{selectedEmployeeDetail.employee?.designation || 'Staff'}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedEmployeeDetail.employee?.employeeId}</span>
                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedEmployeeDetail.employee?.department}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Card */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance Status</p>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${['Present', 'Half Day', 'On Duty'].includes(selectedEmployeeDetail.status) ? 'bg-emerald-100 text-emerald-700' :
                                    selectedEmployeeDetail.status === 'Absent' ? 'bg-rose-100 text-rose-700' :
                                        selectedEmployeeDetail.status === 'Leave' ? 'bg-indigo-100 text-indigo-700' :
                                            selectedEmployeeDetail.status === 'Holiday' ? 'bg-amber-100 text-amber-700' :
                                                selectedEmployeeDetail.status === 'Weekly Off' ? 'bg-slate-200 text-slate-700' :
                                                    'bg-slate-100 text-slate-400'
                                    }`}>
                                    {selectedEmployeeDetail.status}
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                                <p className="text-sm font-black text-slate-800">{new Date(selectedEmployeeDetail.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                            </div>
                        </div>

                        {/* Attendance Logs */}
                        {selectedEmployeeDetail.attendance ? (
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={16} className="text-blue-500" />
                                    Punch Records
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Check In</p>
                                        <p className="text-xl font-black text-emerald-700">{selectedEmployeeDetail.attendance.checkIn ? new Date(selectedEmployeeDetail.attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                                        <p className="text-[10px] text-emerald-600 mt-1 font-bold">{selectedEmployeeDetail.attendance.logs?.[0]?.device || 'System'}</p>
                                    </div>
                                    <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Check Out</p>
                                        <p className="text-xl font-black text-rose-700">{selectedEmployeeDetail.attendance.checkOut ? new Date(selectedEmployeeDetail.attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Working Hours</p>
                                        <p className="text-lg font-black text-slate-700">{selectedEmployeeDetail.attendance.workingHours || 0} hrs</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Overtime</p>
                                        <p className="text-lg font-black text-emerald-600">{selectedEmployeeDetail.attendance.overtimeHours || 0} hrs</p>
                                    </div>
                                </div>
                            </div>
                        ) : selectedEmployeeDetail.status === 'Holiday' ? (
                            <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 border-dashed">
                                <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 mb-4">
                                    <Info size={16} />
                                    Holiday Details
                                </h3>
                                <p className="text-lg font-black text-amber-800">{dateAttendanceData?.holiday || 'Public Holiday'}</p>
                                <p className="text-sm font-bold text-slate-500 mt-2 uppercase tracking-widest">Office is Closed</p>
                            </div>
                        ) : (
                            <div className="py-12 text-center bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                                {selectedEmployeeDetail.isFutureDate ? (
                                    <Clock className="mx-auto text-slate-300 mb-3" size={32} />
                                ) : (
                                    <AlertTriangle className="mx-auto text-rose-400 mb-3" size={32} />
                                )}
                                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">
                                    {selectedEmployeeDetail.isFutureDate ? 'Future Date - Not Marked' : 'Attendance Not Marked'}
                                </p>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">
                                    {selectedEmployeeDetail.status === 'Weekly Off' ? 'Employee Weekly Off' : (selectedEmployeeDetail.isFutureDate ? 'Status will be calculated on this date' : 'Employee was likely absent')}
                                </p>
                            </div>
                        )}
                    </div>
                ) : null}
            </Modal >
        </div >
    );
}
