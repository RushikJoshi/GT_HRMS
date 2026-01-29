import React, { useMemo } from 'react';
import { Info, AlertCircle, CheckCircle, Clock, Calendar as CalendarIcon, Coffee, Briefcase, Lock } from 'lucide-react';

const STATUS_CONFIG = {
    present: { label: 'Present', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50/50', border: 'border-emerald-100', icon: CheckCircle },
    absent: { label: 'Absent', color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50/50', border: 'border-rose-100', icon: AlertCircle },
    leave: { label: 'Leave', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50/50', border: 'border-blue-100', icon: Info },
    holiday: { label: 'Holiday', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50/50', border: 'border-amber-100', icon: Coffee },
    weekly_off: { label: 'Weekly Off', color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50/50', border: 'border-slate-100', icon: CalendarIcon },
    half_day: { label: 'Half Day', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50/50', border: 'border-orange-100', icon: Clock },
    official_duty: { label: 'On Duty', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50/50', border: 'border-purple-100', icon: Briefcase },
    missed_punch: { label: 'Missed', color: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: AlertCircle },
    not_marked: { label: '-', color: 'bg-slate-100', text: 'text-slate-300', bg: 'bg-white', border: 'border-slate-50', icon: null },
    disabled: { label: 'Disabled', color: 'bg-slate-200', text: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100', icon: Lock }
};

export default function AttendanceCalendar({
    data = [],
    holidays = [],
    settings = {},
    currentMonth,
    currentYear,
    onDateClick,
    selectedDate,
    selectionMode = false,
    disabledDates = {} // { "YYYY-MM-DD": "Reason" }
}) {

    const weeklyOffDays = settings.weeklyOffDays || [0];

    const formatDateStr = (year, month, day) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const today = new Date();
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    const calendarArray = useMemo(() => {
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

        const arr = [];
        for (let i = 0; i < firstDay; i++) arr.push({ type: 'empty' });

        for (let d = 1; d <= lastDate; d++) {
            const date = new Date(currentYear, currentMonth, d);
            const dateStr = formatDateStr(currentYear, currentMonth, d);
            const isWeeklyOff = weeklyOffDays.includes(date.getDay());
            const isSunday = date.getDay() === 0;

            arr.push({
                type: 'date',
                dateStr,
                dayNum: d,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                isWeeklyOff,
                isSunday,
                isToday: todayStr === dateStr,
                isFuture: dateStr > todayStr
            });
        }
        return arr;
    }, [currentMonth, currentYear, weeklyOffDays, todayStr]);

    const attendanceMap = useMemo(() => {
        const map = {};
        data.forEach(item => {
            const dStr = item.date.split('T')[0];
            map[dStr] = item;
        });
        return map;
    }, [data]);

    const holidayMap = useMemo(() => {
        const map = {};
        holidays.forEach(h => {
            const dStr = h.date.split('T')[0];
            map[dStr] = h;
        });
        return map;
    }, [holidays]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap gap-x-6 gap-y-2 p-4 bg-slate-50 border-b border-slate-200">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    if (key === 'missed_punch' || key === 'not_marked' || key === 'disabled') return null;
                    if (selectionMode && key === 'not_marked') return null;
                    return (
                        <div key={key} className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${config.color}`}></div>
                            <span className="text-xs font-medium text-slate-600">{config.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 md:p-6 bg-white">
                <div className="grid grid-cols-7 gap-1 md:gap-3">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className={`text-center py-2 text-xs font-semibold uppercase tracking-wider ${day === 'Sun' ? 'text-rose-500' : 'text-slate-400'}`}>
                            {day}
                        </div>
                    ))}

                    {calendarArray.map((cell, i) => {
                        if (cell.type === 'empty') return <div key={`empty-${i}`} className="h-24 md:h-28 invisible"></div>;

                        const { dateStr, dayNum, isWeeklyOff, isSunday, isToday, isFuture } = cell;
                        const attendance = attendanceMap[dateStr];
                        const holiday = holidayMap[dateStr];
                        const disabledReason = disabledDates[dateStr];
                        const isSelected = selectedDate === dateStr;

                        let statusKey = 'not_marked';
                        if (holiday) {
                            statusKey = 'holiday';
                        } else if (attendance) {
                            statusKey = attendance.status?.toLowerCase() || 'not_marked';
                            if (attendance.locked) statusKey = 'disabled';
                        } else if (isWeeklyOff) {
                            statusKey = 'weekly_off';
                        }

                        const config = (disabledReason && selectionMode) ? STATUS_CONFIG.disabled : (STATUS_CONFIG[statusKey] || STATUS_CONFIG.not_marked);
                        const StatusIcon = config.icon;

                        return (
                            <div
                                key={dateStr}
                                onClick={() => !disabledReason && onDateClick?.(dateStr, attendance || { status: statusKey, isWeeklyOff, holiday })}
                                className={`group relative h-24 md:h-28 p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between
                                    ${disabledReason && selectionMode ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-blue-200 hover:z-10'}
                                    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-20 shadow-md' : ''}
                                    ${isToday && !isSelected ? 'ring-1 ring-blue-500 ring-offset-1' : ''}
                                    ${config.bg} ${config.border}
                                `}
                                style={statusKey === 'leave' && attendance?.leaveColor ? {
                                    backgroundColor: isSelected ? undefined : `${attendance.leaveColor}10`,
                                    borderColor: isSelected ? undefined : `${attendance.leaveColor}30`
                                } : {}}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-semibold h-7 w-7 rounded-full flex items-center justify-center 
                                        ${isSunday ? 'text-rose-600' : 'text-slate-700'}
                                        ${isSelected ? 'bg-blue-600 text-white shadow-sm' : ''}
                                        ${isToday && !isSelected ? 'bg-blue-100 text-blue-700' : ''}
                                    `}>
                                        {dayNum}
                                    </span>
                                    {holiday && <Coffee size={14} className="text-amber-500" />}
                                    {StatusIcon && !holiday && <StatusIcon size={14} className={config.text} style={statusKey === 'leave' && attendance?.leaveColor ? { color: attendance.leaveColor } : {}} />}
                                </div>

                                <div className="space-y-0.5 px-0.5">
                                    <div className={`text-[10px] font-semibold truncate ${config.text}`} style={statusKey === 'leave' && attendance?.leaveColor ? { color: attendance.leaveColor } : {}}>
                                        {holiday ? holiday.name : (attendance ? (attendance.leaveType || STATUS_CONFIG[attendance.status.toLowerCase()]?.label || attendance.status) : (isWeeklyOff ? 'Weekly Off' : ''))}
                                    </div>

                                    {attendance?.checkIn && (
                                        <div className="flex flex-col text-[9px] font-medium text-slate-500 leading-tight">
                                            <span>{new Date(attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {attendance.checkOut && <span>{new Date(attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                        </div>
                                    )}

                                    {attendance?.workingHours > 0 && (
                                        <div className="text-[9px] font-medium text-slate-400">
                                            {attendance.workingHours}h
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
