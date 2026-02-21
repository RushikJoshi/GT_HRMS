import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { showToast } from '../utils/uiNotifications';
import {
    Calendar as CalendarIcon,
    AlertCircle,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Info,
    Lock,
    ArrowLeft
} from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

// --- Static configs for fallback if no category/color provided ---
const FALLBACK_CONFIG = {
    bg: 'bg-[#F0F9FF]',
    border: 'border-[#BAE6FD]',
    text: 'text-[#0284C7]',
    main: '#0EA5E9',
    light: '#E0F2FE',
    active: 'bg-[#0EA5E9]'
};

const LOP_CONFIG = {
    id: 'LOP',
    label: 'Unpaid / Personal',
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FECACA]',
    text: 'text-[#DC2626]',
    main: '#EF4444',
    light: '#FEE2E2',
    active: 'bg-[#EF4444]'
};

const HOLIDAY_ICONS = {
    diwali: '🪔',
    christmas: '🎄',
    holidays: '🎉',
    independence: '🇮🇳',
    republic: '🇮🇳',
    gandhi: '👓',
    eid: '🌙',
    holi: '🎨',
    default: '🎉'
};

const getHolidayIcon = (name = '') => {
    const n = name.toLowerCase();
    for (const key in HOLIDAY_ICONS) {
        if (n.includes(key)) return HOLIDAY_ICONS[key];
    }
    return HOLIDAY_ICONS.default;
};

export default function ApplyLeaveForm({ balances = [], existingLeaves = [], editData = null, isHR = false, targetEmployeeId = null, hasLeavePolicy = true, leavePolicy = null, onCancelEdit, onSuccess, onClose }) {
    const [form, setForm] = useState({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        isHalfDay: false,
        halfDayTarget: 'Start', // 'Start' or 'End'
        halfDaySession: 'First Half',
        employeeId: targetEmployeeId || ''
    });

    const [approvedRanges, setApprovedRanges] = useState([]);

    const [employees, setEmployees] = useState([]); // For HR to select employee
    const [internalBalances, setInternalBalances] = useState([]);

    // Fetch Balances Effect
    useEffect(() => {
        const fetchBalances = async () => {
            const empId = isHR ? (targetEmployeeId || form.employeeId) : null;
            if (!empId && isHR) return;

            try {
                const endpoint = isHR ? `/hr/leaves/balances/${empId}` : '/employee/leaves/balances';
                const res = await api.get(endpoint);
                const balanceData = res.data?.balances || (Array.isArray(res.data) ? res.data : []);
                setInternalBalances(balanceData);
            } catch (err) {
                console.error("Failed to fetch balances", err);
            }
        };

        if (isHR && (targetEmployeeId || form.employeeId)) {
            fetchBalances();
        } else if (!isHR && balances.length === 0) {
            fetchBalances();
        }
    }, [isHR, targetEmployeeId, form.employeeId, balances.length]);

    // Use internalBalances if balances prop is empty
    const effectiveBalances = useMemo(() => {
        return balances && balances.length > 0 ? balances : internalBalances;
    }, [balances, internalBalances]);

    // Generate dynamic LEAVE_CONFIG from effectiveBalances
    const dynamicLeaveConfig = useMemo(() => {
        const config = {};
        effectiveBalances.forEach(b => {
            const mainColor = b.color || '#14B8A6'; // Default Teal
            config[b.leaveType] = {
                id: b.leaveType,
                label: b.leaveType,
                main: mainColor,
                light: `${mainColor}15`, // 15% opacity
                bg: 'bg-white',
                border: 'border-[#E5E7EB]',
                text: 'text-[#374151]'
            };
        });
        // Always add Unpaid/Personal Leave
        config['Personal Leave'] = LOP_CONFIG;
        return config;
    }, [effectiveBalances]);

    const [currentCalDate, setCurrentCalDate] = useState(new Date());
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(null);
    const [infoMessage, setInfoMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [holidays, setHolidays] = useState([]);
    const [hoverDate, setHoverDate] = useState(null);
    const [settings, setSettings] = useState({});

    // Fetch Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/attendance/settings');
                setSettings(res.data || {});
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };
        fetchSettings();
    }, []);

    // Fetch Employees if HR
    useEffect(() => {
        if (isHR && !targetEmployeeId) {
            const fetchEmployees = async () => {
                try {
                    const res = await api.get('/hr/employees');
                    setEmployees(res.data.data || []);
                } catch (err) {
                    console.error("Failed to fetch employees", err);
                }
            };
            fetchEmployees();
        }
    }, [isHR, targetEmployeeId]);



    // Fetch Holidays
    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const res = await api.get('/holidays');
                setHolidays(res.data || []);
            } catch (err) {
                console.error("Failed to fetch holidays", err);
            }
        };
        fetchHolidays();
    }, []);

    // Fetch Approved Date Ranges (to disable them in calendar)
    useEffect(() => {
        const fetchApprovedDates = async () => {
            if (isHR) return; // HR might need to override, but usually we focus on employee self-service first
            try {
                const res = await api.get('/employee/leaves/approved-dates');
                setApprovedRanges(res.data || []);
            } catch (err) {
                console.error("Failed to fetch approved dates", err);
            }
        };
        fetchApprovedDates();
    }, [isHR]);

    // Populate form if editing
    useEffect(() => {
        if (editData) {
            setForm({
                leaveType: editData.leaveType,
                startDate: editData.startDate.split('T')[0],
                endDate: editData.endDate.split('T')[0],
                reason: editData.reason,
                isHalfDay: editData.isHalfDay || false,
                halfDayTarget: editData.halfDayTarget || 'Start',
                halfDaySession: editData.halfDaySession || 'First Half'
            });
            setCurrentCalDate(new Date(editData.startDate));
        }
    }, [editData]);

    const holidayMap = useMemo(() => {
        const map = {};
        holidays.forEach(h => {
            const dStr = new Date(h.date).toISOString().split('T')[0];
            map[dStr] = h;
        });
        return map;
    }, [holidays]);

    const isDateSelectable = (dateStr) => {
        // If tenant/employee has no leave policy, block all date selection
        if (!hasLeavePolicy) return false;
        if (!dateStr) return false;

        const [y, m, dPart] = dateStr.split('-').map(Number);
        const d = new Date(y, m - 1, dPart);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Future Dates Only
        if (d < today) return false;

        // 2. No Weekly Offs (treat Saturday & Sunday as weekly off)
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
        if (isWeekend) return false;

        // 3. No Holidays
        if (holidayMap[dateStr]) return false;

        // 4. No Approved Leaves (Locking)
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        const hasApprovedOverlap = approvedRanges.some(range => {
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return date >= start && date <= end;
        });

        if (hasApprovedOverlap) return false;

        return true;
    };

    const getDisabledReason = (dateStr) => {
        if (!dateStr) return null;
        const [y, m, dPart] = dateStr.split('-').map(Number);
        const d = new Date(y, m - 1, dPart);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Treat Saturday & Sunday as weekly off
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6);

        if (d < today) return "Past dates are locked";
        if (isWeekend) return "Selection blocked on Weekly Offs";
        if (holidayMap[dateStr]) return `Holiday: ${holidayMap[dateStr].name}`;

        // Check Approved Ranges for Tooltip
        const dObj = new Date(dateStr);
        dObj.setHours(0, 0, 0, 0);
        const hasApprovedOverlap = approvedRanges.some(range => {
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return dObj >= start && dObj <= end;
        });
        if (hasApprovedOverlap) return "Date already approved for leave";

        return null;
    };

    // Validation
    useEffect(() => {
        setError(null);
        setDuration(0);
        setInfoMessage(null);

        if (!form.startDate) return;

        const start = new Date(form.startDate);
        const end = new Date(form.endDate || form.startDate);

        if (end < start) {
            setError('To Date cannot be earlier than From Date.');
            return;
        }

        let count = 0;
        let loop = new Date(start);
        while (loop <= end) {
            const dStr = loop.toISOString().split('T')[0];

            // Sandwich Rule: Count ALL days in the range, including Sundays and Holidays.
            // If the user selects Sat to Mon, it should count Sat, Sun, Mon = 3 Days.
            count++;
            loop.setDate(loop.getDate() + 1);
        }

        if (form.isHalfDay && count > 0) count -= 0.5;

        if (count <= 0) {
            setError('Range contains no working days.');
            return;
        }

        setDuration(count);

        if (form.leaveType) {
            const bal = balances.find(b => b.leaveType === form.leaveType);
            const rawAvailable = bal ? (bal.total - bal.used - bal.pending) : 0;
            const currentlyBlocked = (editData && editData.leaveType === form.leaveType) ? editData.daysCount : 0;
            const availableToThisAction = rawAvailable + currentlyBlocked;

            if (count > availableToThisAction) {
                // Allow submission but warn about LOP
                setInfoMessage(`Note: You have ${availableToThisAction} ${form.leaveType} balance. Remaining ${count - availableToThisAction} days will be marked as Unpaid / Loss of Pay.`);
            }
        }

        // 5. Final Block: Overlap with Approved Ranges
        const startObj = new Date(form.startDate);
        const endObj = new Date(form.endDate || form.startDate);
        startObj.setHours(0, 0, 0, 0);
        endObj.setHours(0, 0, 0, 0);

        const overlapsWithApproved = approvedRanges.some(range => {
            const rStart = new Date(range.startDate);
            const rEnd = new Date(range.endDate);
            rStart.setHours(0, 0, 0, 0);
            rEnd.setHours(0, 0, 0, 0);
            return (startObj <= rEnd && endObj >= rStart);
        });

        if (overlapsWithApproved) {
            setError('The selected dates overlap with an already approved leave.');
        }
    }, [form.startDate, form.endDate, form.leaveType, form.isHalfDay, holidayMap, balances, editData, approvedRanges]);

    // Calendar Grid
    const calendarArray = useMemo(() => {
        const month = currentCalDate.getMonth();
        const year = currentCalDate.getFullYear();
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        const arr = [];
        for (let i = 0; i < firstDay; i++) arr.push(null);
        for (let d = 1; d <= lastDate; d++) {
            // Generates YYYY-MM-DD
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            arr.push(dateStr);
        }
        return arr;
    }, [currentCalDate]);

    const handleDateClick = (dateStr) => {
        if (!isDateSelectable(dateStr)) return;

        if (!form.startDate || (form.startDate && form.endDate)) {
            setForm(prev => ({ ...prev, startDate: dateStr, endDate: '', isHalfDay: false }));
        } else {
            if (new Date(dateStr) < new Date(form.startDate)) {
                setForm(prev => ({ ...prev, startDate: dateStr, endDate: '', isHalfDay: false }));
            } else {
                setForm(prev => ({ ...prev, endDate: dateStr }));
            }
        }
    };

    const isInRange = (dateStr) => {
        if (!form.startDate) return false;
        if (dateStr === form.startDate) return true;
        if (form.endDate && dateStr >= form.startDate && dateStr <= form.endDate) return true;
        return false;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (error || isSubmitting || !form.leaveType || duration <= 0) return;

        try {
            setIsSubmitting(true);
            const payload = { ...form, daysCount: duration };
            if (editData) {
                await api.put(`/employee/leaves/edit/${editData._id}`, payload);
                showToast('success', 'Success', 'Request Updated.');
            } else {
                await api.post('/employee/leaves/apply', payload);
                showToast('success', 'Success', 'Leave Applied.');
            }
            // Call onSuccess in its own guarded block so UI handler errors do not trigger the "catch" for API failures
            try {
                if (onSuccess) onSuccess();
            } catch (handlerErr) {
                console.error('onSuccess handler error:', handlerErr);
                // Do NOT show an error toast here because the main API call already succeeded
            }
        } catch (err) {
            // Only show user-facing toasts for actual API/network errors
            const serverMsg = err.response?.data?.message || err.response?.data?.error || err.hrms?.message || err.message;

            if (serverMsg === 'NO_LEAVE_POLICY_ASSIGNED') {
                showToast('error', 'Policy Restriction', 'No leave policy assigned yet. Please contact your HR administrator.');
            } else if (err.hrms && err.hrms.type === 'network') {
                // Network errors are handled globally by api interceptor but show a contextual message here as well
                showToast('error', 'Network Error', err.hrms.message || 'Server unreachable. Please check your connection.');
            } else if (err.response) {
                // Backend returned a non-2xx response
                showToast('error', 'Error', serverMsg || 'Failed to apply leave.');
            } else {
                // Non-API error (likely a JS runtime error) — don't show an error toast to avoid false negatives
                console.error('Unexpected error during leave submission:', err);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-[20px] shadow-md border border-[#E5E7EB] transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-50 rounded-xl transition text-[#6B7280]"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="p-3 bg-[#CCFBF1] text-[#14B8A6] rounded-xl">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#111827] leading-tight">
                            {editData ? 'Edit Request' : 'Time Off'}
                        </h2>
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mt-0.5">Leave Application</p>
                    </div>
                </div>
                <div className="hidden lg:block bg-white p-3 rounded-xl border border-[#E5E7EB] max-w-xs transition-all">
                    <p className="text-[9px] font-bold text-[#6B7280] leading-relaxed text-center">
                        “Select the start and end dates of your leave. The system will calculate the total leave days automatically including sandwich rules.”
                    </p>
                </div>
                {editData && (
                    <button onClick={onCancelEdit} className="text-[10px] font-bold text-[#EF4444] hover:text-rose-700 uppercase tracking-widest border-b border-rose-200">Cancel Edit</button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Employee Selection (HR only) */}
                {isHR && !targetEmployeeId && (
                    <div>
                        <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1.5 block">Select Employee</label>
                        <select
                            required
                            className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-bold text-[#111827] outline-none focus:ring-1 focus:ring-[#14B8A6] focus:border-[#14B8A6] transition-all"
                            value={form.employeeId}
                            onChange={e => setForm({ ...form, employeeId: e.target.value })}
                        >
                            <option value="">-- Choose Employee --</option>
                            {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Leave Type Grid */}
                <div>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Select Category</label>
                        {form.leaveType && (
                            <span className="text-[9px] font-bold bg-[#F3F4F6] text-[#6B7280] px-2 py-0.5 rounded uppercase tracking-widest">
                                {form.leaveType === 'Personal Leave' ? 'UNPAID / LOP' : `BAL: ${balances.find(b => b.leaveType === form.leaveType)?.available || 0}`}
                            </span>
                        )}
                        {!hasLeavePolicy && (
                            <span className="text-[9px] font-bold bg-[#FFFBEB] text-[#D97706] px-2 py-0.5 rounded uppercase tracking-widest">Policy Not Assigned</span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(dynamicLeaveConfig).map(([key, config]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, leaveType: key }))}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${form.leaveType === key
                                    ? `shadow-md scale-[1.02] ring-1 ring-[#14B8A6]`
                                    : 'bg-white border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-sm'
                                    }`}
                                style={form.leaveType === key ? { borderColor: '#14B8A6', backgroundColor: '#F0FDFA' } : {}}
                            >
                                <div className="h-2.5 w-2.5 rounded-full mb-1" style={{ backgroundColor: config.main }}></div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest text-center ${form.leaveType === key ? 'text-[#111827]' : 'text-[#6B7280]'}`}>
                                    {key}
                                </span>
                            </button>
                        ))}
                    </div>
                    {form.leaveType === 'Personal Leave' && (
                        <p className="mt-3 text-[9px] font-bold text-[#EF4444] uppercase tracking-widest bg-[#FEF2F2] p-2 rounded-lg border border-[#FECACA]">
                            Note: This leave will be treated as unpaid personal leave.
                        </p>
                    )}
                </div>

                {/* Calendar View */}
                <div className="bg-white p-6 rounded-[20px] border border-[#E5E7EB] shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-bold text-[#111827] uppercase tracking-widest">
                            {currentCalDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h4>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setCurrentCalDate(new Date(currentCalDate.setMonth(currentCalDate.getMonth() - 1)))} className={`p-1.5 rounded-md text-[#6B7280] bg-white hover:bg-slate-50 border border-[#E5E7EB] shadow-sm transition-all ${!hasLeavePolicy ? 'opacity-40 cursor-not-allowed' : ''}`} disabled={!hasLeavePolicy} title={!hasLeavePolicy ? 'Date selection disabled: No leave policy assigned' : ''}><ChevronLeft size={16} /></button>
                            <button type="button" onClick={() => setCurrentCalDate(new Date(currentCalDate.setMonth(currentCalDate.getMonth() + 1)))} className={`p-1.5 rounded-md text-[#6B7280] bg-white hover:bg-slate-50 border border-[#E5E7EB] shadow-sm transition-all ${!hasLeavePolicy ? 'opacity-40 cursor-not-allowed' : ''}`} disabled={!hasLeavePolicy} title={!hasLeavePolicy ? 'Date selection disabled: No leave policy assigned' : ''}><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className={`text-center py-2 text-[9px] font-bold uppercase tracking-widest ${day === 'Su' ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`}>{day}</div>
                        ))}
                        {calendarArray.map((d, i) => {
                            if (!d) return <div key={`empty-${i}`} className="p-1"></div>;

                            const selectable = isDateSelectable(d);
                            const selected = isInRange(d);
                            const holiday = holidayMap[d];

                            // Visual index matches Day Of Week because we start with empty 'Su' slots if needed
                            const dayOfWeek = i % 7;
                            const sunday = dayOfWeek === 0;

                            const isStart = d === form.startDate;
                            const isEnd = d === form.endDate;

                            const config = dynamicLeaveConfig[form.leaveType] || { main: '#374151', light: '#F3F4F6' };

                            return (
                                <div
                                    key={d}
                                    onMouseEnter={() => setHoverDate(d)}
                                    onMouseLeave={() => setHoverDate(null)}
                                    onClick={() => handleDateClick(d)}
                                    className={`relative h-10 w-full flex items-center justify-center rounded-lg text-xs font-bold transition-all
                                        ${!selectable ? 'opacity-30 cursor-not-allowed bg-white' : 'cursor-pointer hover:bg-slate-50'}
                                        ${sunday && !selected ? 'text-[#EF4444]' : 'text-[#374151]'}
                                    `}
                                    style={selected ? {
                                        backgroundColor: (isStart || isEnd) ? '#14B8A6' : '#F0FDFA', // Custom Teal
                                        color: (isStart || isEnd) ? 'white' : '#14B8A6',
                                        border: (isStart || isEnd) ? 'none' : '1px solid #CCFBF1'
                                    } : {}}
                                >
                                    {new Date(d).getDate()}

                                    {holiday && (
                                        <div className="absolute top-0.5 right-0.5 text-[7px]" title={holiday.name}>{getHolidayIcon(holiday.name)}</div>
                                    )}

                                    {hoverDate === d && (getDisabledReason(d) || holiday || (!hasLeavePolicy && 'No leave policy assigned')) && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 px-2 py-1.5 bg-[#1F2937] text-white text-[9px] font-bold uppercase tracking-widest rounded shadow-xl pointer-events-none w-max max-w-[150px] animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex items-center gap-1.5">
                                                {holiday ? <Info size={10} className="text-[#60A5FA]" /> : !hasLeavePolicy ? <AlertCircle size={10} className="text-[#FBBF24]" /> : <Lock size={10} className="text-[#F87171]" />}
                                                <span>{!hasLeavePolicy ? 'No Policy' : getDisabledReason(d) || holiday?.name}</span>
                                            </div>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1F2937]"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </div>

                {/* Range Info */}
                {form.startDate && (
                    <div className="flex flex-col md:flex-row items-center justify-between p-5 bg-[#F0FDFA] border border-[#CCFBF1] rounded-2xl gap-4">
                        <div className="flex items-center gap-6">
                            <div>
                                <p className="text-[9px] font-bold text-[#14B8A6] uppercase tracking-widest mb-0.5">Period</p>
                                <h5 className="text-xs font-bold text-[#111827]">
                                    {formatDateDDMMYYYY(form.startDate)}
                                    {form.endDate && ` — ${formatDateDDMMYYYY(form.endDate)}`}
                                </h5>
                            </div>
                            <div className="h-6 w-px bg-[#CCFBF1]"></div>
                            <div>
                                <p className="text-[9px] font-bold text-[#14B8A6] uppercase tracking-widest mb-0.5">Net Days</p>
                                <h5 className="text-lg font-bold text-[#14B8A6]">{duration} <span className="text-[9px]">DAYS</span></h5>
                            </div>
                        </div>

                        {/* Half Day Variant */}
                        {form.startDate && duration > 0 && (
                            <div className="flex flex-col gap-2 bg-white p-3 rounded-xl shadow-sm border border-[#E5E7EB] transition-all w-full md:w-auto">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${form.isHalfDay ? 'bg-[#14B8A6] border-[#14B8A6]' : 'bg-white border-[#D1D5DB] group-hover:border-[#14B8A6]'}`}>
                                        {form.isHalfDay && <CheckCircle size={10} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={form.isHalfDay} onChange={e => setForm({ ...form, isHalfDay: e.target.checked, halfDayTarget: form.endDate ? 'End' : 'Start', halfDaySession: 'First Half' })} />
                                    <span className="text-[10px] font-bold text-[#374151] uppercase tracking-widest">Enable Half Day</span>
                                </label>

                                {form.isHalfDay && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {/* If Range selection, choose WHICH day is half-day */}
                                        {form.endDate && form.startDate !== form.endDate && (
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm({ ...form, halfDayTarget: 'Start' })}
                                                    className={`flex-1 py-1 text-[8px] font-bold uppercase tracking-widest rounded border transition-all ${form.halfDayTarget === 'Start'
                                                        ? 'bg-[#14B8A6] text-white border-[#14B8A6]'
                                                        : 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB] hover:bg-white'
                                                        }`}
                                                >
                                                    Start Day
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setForm({ ...form, halfDayTarget: 'End' })}
                                                    className={`flex-1 py-1 text-[8px] font-bold uppercase tracking-widest rounded border transition-all ${form.halfDayTarget === 'End'
                                                        ? 'bg-[#14B8A6] text-white border-[#14B8A6]'
                                                        : 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB] hover:bg-white'
                                                        }`}
                                                >
                                                    End Day
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex gap-1 p-0.5 bg-white rounded-lg border border-[#E5E7EB]">
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, halfDaySession: 'First Half' })}
                                                className={`flex-1 py-1 text-[8px] font-bold uppercase tracking-widest rounded-md transition-all ${form.halfDaySession === 'First Half'
                                                    ? 'bg-white text-[#14B8A6] shadow-sm ring-1 ring-[#E5E7EB]'
                                                    : 'text-[#9CA3AF] hover:text-[#6B7280]'
                                                    }`}
                                            >
                                                1st Half
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setForm({ ...form, halfDaySession: 'Second Half' })}
                                                className={`flex-1 py-1 text-[8px] font-bold uppercase tracking-widest rounded-md transition-all ${form.halfDaySession === 'Second Half'
                                                    ? 'bg-white text-[#14B8A6] shadow-sm ring-1 ring-[#E5E7EB]'
                                                    : 'text-[#9CA3AF] hover:text-[#6B7280]'
                                                    }`}
                                            >
                                                2nd Half
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Alerts */}
                {error && (
                    <div className="flex items-start gap-3 p-3 bg-[#FEF2F2] text-[#B91C1C] rounded-xl border border-[#FECACA] animate-pulse">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">{error}</p>
                    </div>
                )}

                {!hasLeavePolicy && (
                    <div className="flex items-start gap-3 p-3 bg-[#FFFBEB] text-[#D97706] rounded-xl border border-[#FEF3C7]">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">Policy Restriction</p>
                            <p className="text-[9px] mt-0.5">No leave policy assigned yet. Please contact your HR administrator.</p>
                        </div>
                    </div>
                )}

                {infoMessage && (
                    <div className="flex items-start gap-3 p-3 bg-[#F0FDFA] text-[#0F766E] rounded-xl border border-[#CCFBF1]">
                        <Info size={16} className="mt-0.5 shrink-0" />
                        <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">{infoMessage}</p>
                    </div>
                )}

                {/* Reason */}
                <div>
                    <label className="flex items-center justify-between px-1 mb-1.5">
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest">Reason / Justification</span>
                        <span className="text-[8px] text-[#EF4444] font-bold uppercase tracking-widest">Required</span>
                    </label>
                    <textarea
                        required
                        rows="2"
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-bold text-[#111827] outline-none focus:ring-1 focus:ring-[#14B8A6] focus:border-[#14B8A6] resize-none transition-all placeholder:text-[#9CA3AF]"
                        placeholder="Why do you need this time off?..."
                        value={form.reason}
                        onChange={e => setForm({ ...form, reason: e.target.value })}
                    ></textarea>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={!hasLeavePolicy || isSubmitting || !!error || duration <= 0 || !form.leaveType}
                    className={`w-full py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:grayscale disabled:opacity-50
                        ${form.leaveType ? 'bg-[#14B8A6] text-white hover:bg-[#0D9488]' : 'bg-[#1F2937] text-white hover:bg-black'}
                    `}
                    title={!hasLeavePolicy ? 'Contact HR to assign leave policy' : ''}
                >
                    {isSubmitting ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <span>
                                {!form.leaveType ? 'Select Leave Category' :
                                    !form.startDate ? 'Select Dates' :
                                        duration <= 0 ? 'Invalid Dates' :
                                            editData ? 'Update Request' : 'Submit Request'}
                            </span>
                            {(form.leaveType && duration > 0) && <CheckCircle size={14} />}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
