import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from 'antd';
import api from '../../utils/api';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Info, AlertTriangle } from 'lucide-react';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import AttendanceCalendar from '../../components/AttendanceCalendar';
import dayjs from 'dayjs';

export default function RegularizationRequest() {
    const [activeTab, setActiveTab] = useState('apply'); // apply | history
    const [requests, setRequests] = useState([]);

    // Calendar & Data State
    const [attendance, setAttendance] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [settings, setSettings] = useState({});
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Toggle for Custom Selects
    const [isIssueTypeOpen, setIsIssueTypeOpen] = useState(false);
    const [isLeaveTypeOpen, setIsLeaveTypeOpen] = useState(false);

    // Toggle for Time Pickers
    const [isCheckInOpen, setIsCheckInOpen] = useState(false);
    const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);


    // Form
    const [form, setForm] = useState({
        category: 'Attendance', // Attendance | Leave
        startDate: '',
        endDate: '',
        issueType: '',
        reason: '',
        // Dynamic Fields
        checkIn: '',
        checkOut: '',
        requestedLeaveType: '',
        originalLeaveType: ''
    });

    useEffect(() => {
        if (activeTab === 'history') fetchHistory();
        if (activeTab === 'apply') fetchData();
    }, [activeTab, currentMonth, currentYear]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [attRes, holidayRes, settingsRes] = await Promise.all([
                api.get(`/attendance/my?month=${currentMonth + 1}&year=${currentYear}`),
                api.get('/holidays'),
                api.get('/attendance/settings')
            ]);
            setAttendance(attRes.data || []);
            setHolidays(holidayRes.data || []);
            setSettings(settingsRes.data || {});
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/employee/regularization/my');
            setRequests(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    // Calculate Disabled Dates based on strict rules
    const disabledDates = useMemo(() => {
        const disabled = {};
        const today = dayjs().format('YYYY-MM-DD');
        const weeklyOffs = settings.weeklyOffDays || [0];

        // Helper to check range
        const startOfMonth = dayjs(`${currentYear}-${currentMonth + 1}-01`);
        const endOfMonth = startOfMonth.endOf('month');

        let current = startOfMonth;
        while (current.isBefore(endOfMonth) || current.isSame(endOfMonth)) {
            const dateStr = current.format('YYYY-MM-DD');

            // 1. Future Dates
            if (dateStr > today) {
                disabled[dateStr] = "Future date selection is blocked";
            }

            // 2. Weekly Offs
            if (weeklyOffs.includes(current.day())) {
                disabled[dateStr] = "Selection blocked on Weekly Offs";
            }

            current = current.add(1, 'day');
        }

        // 3. Company Holidays
        holidays.forEach(h => {
            const dStr = h.date.split('T')[0];
            disabled[dStr] = `Holiday: ${h.name}`;
        });

        // 4. Payroll Locked & Approved Leave Days
        attendance.forEach(att => {
            const dStr = att.date.split('T')[0];
            if (att.locked) {
                disabled[dStr] = "Attendance record is locked by Payroll";
            }
            if (att.status === 'leave') {
                disabled[dStr] = "Regularization not allowed on Approved Leave";
            }
        });

        return disabled;
    }, [currentMonth, currentYear, attendance, holidays, settings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.startDate) return alert("Please select a date from the calendar");

        try {
            const payload = {
                category: form.category,
                startDate: form.startDate,
                endDate: form.endDate || form.startDate,
                issueType: form.issueType,
                reason: form.reason,
                requestedData: {}
            };

            if (form.category === 'Attendance') {
                if (form.checkIn) payload.requestedData.checkIn = `${form.startDate}T${form.checkIn}:00`;
                if (form.checkOut) payload.requestedData.checkOut = `${form.startDate}T${form.checkOut}:00`;
            } else {
                payload.requestedData.requestedLeaveType = form.requestedLeaveType;
                payload.requestedData.originalLeaveType = form.originalLeaveType;
            }

            await api.post('/employee/regularization', payload);
            alert('Request Submitted Successfully');
            setActiveTab('history');
            setForm({ category: 'Attendance', startDate: '', endDate: '', issueType: '', reason: '', checkIn: '', checkOut: '', requestedLeaveType: '', originalLeaveType: '' });
        } catch (err) {
            alert(err.response?.data?.error || "Submission Failed");
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'Approved') return <span className="text-[#14B8A6] bg-[#CCFBF1] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-[#14B8A6]/20">Approved</span>;
        if (status === 'Rejected') return <span className="text-[#EF4444] bg-[#FEE2E2] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-[#EF4444]/20">Rejected</span>;
        return <span className="text-[#D97706] bg-[#FEF3C7] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-[#D97706]/20">Pending</span>;
    };

    // Custom Time Picker Component
    function CustomTimeInput({ value, onChange, isOpen, setIsOpen, placeholder }) {
        // Generate Hour/Minute arrays
        const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
        const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

        const [selectedHour, selectedMinute] = (value || '--:--').split(':');

        const updateTime = (newH, newM) => {
            const h = newH !== undefined ? newH : (selectedHour === '--' ? '09' : selectedHour);
            const m = newM !== undefined ? newM : (selectedMinute === '--' ? '00' : selectedMinute);
            onChange(`${h}:${m}`);
        };

        return (
            <div className="relative w-full">
                {isOpen && <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>}

                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full bg-white border border-[#E5E7EB] rounded-lg p-3 text-xs font-bold text-center outline-none focus:ring-1 focus:ring-[#14B8A6] focus:border-[#14B8A6] relative z-20 transition-all flex items-center justify-between gap-2 shadow-sm ${isOpen ? 'ring-1 ring-[#14B8A6] border-[#14B8A6]' : ''}`}
                >
                    <span className={value ? "text-[#111827]" : "text-[#9CA3AF]"}>{value || placeholder}</span>
                    <Clock size={14} className="text-[#9CA3AF]" />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl shadow-slate-200/50 p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex h-48 w-[200px]">
                        <div className="flex-1 overflow-y-auto no-scrollbar border-r border-[#E5E7EB]">
                            <div className="text-[9px] font-bold text-[#9CA3AF] text-center sticky top-0 bg-[#F9FAFB] py-1 border-b border-[#E5E7EB] uppercase tracking-widest">HR</div>
                            {hours.map(h => (
                                <div key={h}
                                    onClick={() => updateTime(h, undefined)}
                                    className={`text-center py-2 text-xs font-bold cursor-pointer transition-colors ${selectedHour === h ? 'bg-[#14B8A6] text-white' : 'text-[#374151] hover:bg-[#F3F4F6]'}`}
                                >
                                    {h}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="text-[9px] font-bold text-[#9CA3AF] text-center sticky top-0 bg-[#F9FAFB] py-1 border-b border-[#E5E7EB] uppercase tracking-widest">MIN</div>
                            {minutes.map(m => (
                                <div key={m}
                                    onClick={() => updateTime(undefined, m)}
                                    className={`text-center py-2 text-xs font-bold cursor-pointer transition-colors ${selectedMinute === m ? 'bg-[#14B8A6] text-white' : 'text-[#374151] hover:bg-[#F3F4F6]'}`}
                                >
                                    {m}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Custom Select Component
    function CustomSelect({ options, values, value, onChange, placeholder, isOpen, setIsOpen }) {
        if (!options) return null;

        return (
            <div className="relative">
                {isOpen && <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>}

                <button
                    type="button"
                    onClick={() => setIsOpen(prev => !prev)}
                    className={`w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-bold text-left flex items-center justify-between outline-none focus:ring-1 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all relative z-20 ${isOpen ? 'ring-1 ring-[#14B8A6] border-[#14B8A6]' : ''}`}
                >
                    <span className={value ? "text-[#111827]" : "text-[#9CA3AF] uppercase tracking-widest text-[10px] font-bold"}>
                        {value || placeholder}
                    </span>
                    <ChevronRight size={14} className={`text-[#9CA3AF] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1.5 w-full bg-white border border-[#E5E7EB] rounded-xl shadow-xl shadow-slate-200/50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 custom-scrollbar">
                        <div className="p-1.5 space-y-0.5">
                            {options.map((opt, idx) => {
                                const val = values ? (values[idx] || opt) : opt;
                                const isSelected = value === val;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            onChange(val);
                                            setIsOpen(false);
                                        }}
                                        className={`px-3 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${isSelected
                                            ? 'bg-[#CCFBF1] text-[#14B8A6]'
                                            : 'text-[#374151] hover:bg-[#F3F4F6]'}`}
                                    >
                                        {opt}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">


                <div className="flex items-center bg-white p-1 rounded-xl border border-[#E5E7EB] shadow-sm">
                    <button
                        onClick={() => setActiveTab('apply')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'apply'
                            ? 'bg-[#14B8A6] text-white shadow-md'
                            : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                            }`}
                    >
                        New Request
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'history'
                            ? 'bg-[#14B8A6] text-white shadow-md'
                            : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                            }`}
                    >
                        History
                    </button>
                </div>
            </div>

            {activeTab === 'apply' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Selector Section (Left - Calendar) */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-[20px] shadow-md border border-[#E5E7EB] p-4 h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-[#111827] uppercase tracking-widest">Select Date</h3>
                                    <p className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-widest mt-0.5">Only business days are eligible for adjustment</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-[#E5E7EB]">
                                    <button onClick={prevMonth} className="p-1.5 hover:bg-white rounded-md text-[#6B7280] transition-all shadow-sm"><ChevronLeft size={14} /></button>
                                    <span className="px-2 text-[10px] font-bold text-[#111827] min-w-[100px] text-center uppercase tracking-widest">
                                        {dayjs(new Date(currentYear, currentMonth)).format('MMMM YYYY')}
                                    </span>
                                    <button onClick={nextMonth} className="p-1.5 hover:bg-white rounded-md text-[#6B7280] transition-all shadow-sm"><ChevronRight size={14} /></button>
                                </div>
                            </div>

                            <div className="overflow-hidden">
                                <AttendanceCalendar
                                    data={attendance}
                                    holidays={holidays}
                                    settings={settings}
                                    currentMonth={currentMonth}
                                    currentYear={currentYear}
                                    onDateClick={(date) => setForm({ ...form, startDate: date })}
                                    selectedDate={form.startDate}
                                    selectionMode={true}
                                    disabledDates={disabledDates}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Section (Right) */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-[20px] shadow-md border border-[#E5E7EB] p-6 h-full flex flex-col">
                            <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest border-b border-[#E5E7EB] pb-2">Correction Module</h4>

                                    {/* Category Toggle */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, category: 'Attendance' })}
                                            className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${form.category === 'Attendance' ? 'bg-[#14B8A6] border-[#14B8A6] text-white shadow-md' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'}`}
                                        >
                                            <Clock size={16} />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">Punches</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, category: 'Leave' })}
                                            className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${form.category === 'Leave' ? 'bg-[#14B8A6] border-[#14B8A6] text-white shadow-md' : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'}`}
                                        >
                                            <CalendarIcon size={16} />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">Leaves</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 flex-1">

                                    {/* Custom Dropdown for System Issue Path */}
                                    <div className="relative z-30">
                                        <label className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest mb-1.5 block">System Issue Path</label>
                                        <CustomSelect
                                            options={form.category === 'Attendance'
                                                ? ['Missed Check In', 'Missed Check Out', 'Forgot to Punch (Both)', 'Actually Present (Approved Leave Reversal)']
                                                : ['Applied Wrong Leave Type', 'Forgot to Apply Leave', 'LOP Correction', 'Cancel Approved Leave']
                                            }
                                            value={form.issueType}
                                            onChange={(val) => setForm({ ...form, issueType: val })}
                                            placeholder="-- RESOLVE ISSUE --"
                                            isOpen={isIssueTypeOpen}
                                            setIsOpen={setIsIssueTypeOpen}
                                        />
                                    </div>

                                    {form.category === 'Attendance' ? (
                                        <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] space-y-3 relative z-20">
                                            <h4 className="text-[9px] font-bold text-[#14B8A6] uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]"></div> Corrected Timestamp
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[8px] font-bold text-[#9CA3AF] uppercase tracking-widest block mb-1">IN_TIME</label>
                                                    <CustomTimeInput
                                                        value={form.checkIn}
                                                        onChange={(val) => setForm({ ...form, checkIn: val })}
                                                        isOpen={isCheckInOpen}
                                                        setIsOpen={setIsCheckInOpen}
                                                        placeholder="--:--"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-bold text-[#9CA3AF] uppercase tracking-widest block mb-1">OUT_TIME</label>
                                                    <CustomTimeInput
                                                        value={form.checkOut}
                                                        onChange={(val) => setForm({ ...form, checkOut: val })}
                                                        isOpen={isCheckOutOpen}
                                                        setIsOpen={setIsCheckOutOpen}
                                                        placeholder="--:--"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] space-y-3 relative z-20">
                                            <h4 className="text-[9px] font-bold text-[#14B8A6] uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]"></div> Leave Override
                                            </h4>
                                            <input type="text" placeholder="Marked As (Original status)" className="w-full bg-white border border-[#E5E7EB] rounded-lg p-3 text-xs font-bold text-[#111827] outline-none focus:border-[#14B8A6] transition-all"
                                                value={form.originalLeaveType} onChange={e => setForm({ ...form, originalLeaveType: e.target.value })} />

                                            <CustomSelect
                                                options={['CL (Casual)', 'PL (Paid)', 'SL (Sick)', 'Present (Working)']}
                                                values={['CL', 'PL', 'SL', 'Present']}
                                                value={form.requestedLeaveType}
                                                onChange={(val) => setForm({ ...form, requestedLeaveType: val })}
                                                placeholder="-- CONVERT TO --"
                                                isOpen={isLeaveTypeOpen}
                                                setIsOpen={setIsLeaveTypeOpen}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest mb-1.5 block">Justification Record</label>
                                        <textarea required className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-bold min-h-[80px] text-[#111827] outline-none focus:ring-1 focus:ring-[#14B8A6] focus:border-[#14B8A6] resize-none relative z-10 transition-all placeholder:text-[#9CA3AF]"
                                            placeholder="Provide technical justification for this correction..."
                                            value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}></textarea>
                                    </div>
                                </div>

                                <div className="pt-2 relative z-0">
                                    <button
                                        type="submit"
                                        disabled={!form.startDate || !form.reason}
                                        className={`w-full py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${form.startDate && form.reason
                                            ? 'bg-[#14B8A6] text-white shadow-md hover:bg-[#0D9488] active:scale-95'
                                            : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'}`}
                                    >
                                        {form.startDate ? `Push Correction: ${dayjs(form.startDate).format('DD MMM')}` : 'Awaiting Date Selection'}
                                    </button>
                                </div>

                                <div className="flex items-start gap-2 p-2 bg-[#FFFBEB] border border-[#FEF3C7] rounded-lg">
                                    <AlertTriangle size={12} className="text-[#D97706] mt-0.5 shrink-0" />
                                    <p className="text-[9px] text-[#B45309] leading-tight font-medium">
                                        Adjustment protocols are audited. Any falsification of records will result in immediate termination of access.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            ) : (
                /* HISTORY TAB */
                <div className="bg-white rounded-[20px] shadow-md border border-[#E5E7EB] overflow-hidden animate-in fade-in duration-500">
                    <div className="flex flex-col gap-3">
                        {requests.length > 0 ? (
                            requests.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((req) => (
                                <div
                                    key={req._id}
                                    className="bg-white p-4 rounded-[16px] border border-[#E5E7EB] hover:shadow-md hover:border-[#14B8A6]/30 hover:bg-[#F0FDFA]/30 transition-all duration-300 group flex flex-col md:flex-row items-center gap-4"
                                >
                                    {/* Date Box */}
                                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#6B7280] group-hover:bg-white group-hover:text-[#14B8A6] group-hover:border-[#14B8A6]/30 transition-colors shrink-0">
                                        <span className="text-[9px] font-bold uppercase tracking-widest">{dayjs(req.startDate).format('MMM')}</span>
                                        <span className="text-xl font-bold leading-none text-[#111827] group-hover:text-[#14B8A6]">{dayjs(req.startDate).format('DD')}</span>
                                    </div>

                                    {/* Main Info */}
                                    <div className="flex flex-col flex-1 text-center md:text-left overflow-hidden">
                                        <div className="flex items-center justify-center md:justify-start gap-2 mb-0.5">
                                            <span className="text-sm font-bold text-[#111827]">{req.issueType}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${req.category === 'Attendance'
                                                ? 'bg-[#CCFBF1] text-[#14B8A6] border-[#14B8A6]/20'
                                                : 'bg-[#FEF3C7] text-[#D97706] border-[#D97706]/20'}`}>
                                                {req.category}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-[#6B7280] font-medium truncate w-full" title={req.reason}>
                                            {req.reason}
                                        </span>
                                        {req.adminRemark && (
                                            <div className="flex items-center justify-center md:justify-start gap-1 mt-1 text-[9px] text-[#4B5563] italic">
                                                <div className="w-0.5 h-3 bg-[#E5E7EB]"></div>
                                                <span>"{req.adminRemark}"</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="shrink-0">
                                        {getStatusBadge(req.status)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center text-[#9CA3AF] bg-[#F9FAFB] rounded-[20px] border border-dashed border-[#E5E7EB]">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-3 bg-white rounded-full shadow-sm">
                                        <Clock size={24} className="opacity-20 text-[#111827]" />
                                    </div>
                                    <span className="text-[10px] uppercase tracking-widest font-bold">Archived Stream Empty</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {requests.length > pageSize && (
                        <div className="px-6 py-4 border-t border-[#E5E7EB] flex justify-end">
                            <Pagination
                                current={currentPage}
                                pageSize={pageSize}
                                total={requests.length}
                                onChange={(page) => setCurrentPage(page)}
                                showSizeChanger={false}
                                className="custom-pagination"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
