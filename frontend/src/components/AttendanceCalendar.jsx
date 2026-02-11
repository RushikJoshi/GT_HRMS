import React, { useMemo } from 'react';
import { Info, AlertCircle, CheckCircle, Clock, Calendar as CalendarIcon, Coffee, Briefcase, Lock } from 'lucide-react';
import { getStatusStyles, getCalendarUI, STATUS } from '../utils/calendarUtils';

const LEGEND_LABELS = {
    HOLIDAY: 'Holiday',
    WEEKLY_OFF: 'Weekly Off',
    LEAVE: 'Leave',
    HALF_DAY: 'Half Day',
    PRESENT: 'Present',
    ABSENT: 'Absent',
    ON_DUTY: 'On Duty',
    DEFAULT: '-'
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
            // Always treat Saturday(6) and Sunday(0) as weekly off (ignore tenant settings for this view)
            const dow = date.getDay();
            const isWeekend = (dow === 0 || dow === 6);
            const isWeeklyOff = isWeekend;
            const isSunday = dow === 0;

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
            // Support both API shapes: { date: 'YYYY-MM-DD' } or { date: 'YYYY-MM-DDTHH:MM:SSZ' } or { dateStr }
            const raw = item.date || item.dateStr || item._id || '';
            const dStr = (raw && raw.split ? raw.split('T')[0] : raw) || '';
            if (dStr) map[dStr] = item;
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
            <div className="flex flex-wrap gap-x-4 gap-y-2 p-3 bg-slate-50 border-b border-slate-200">
                {Object.keys(LEGEND_LABELS).map(key => {
                    if (key === 'DEFAULT') return null;
                    const styles = getStatusStyles(key);
                    return (
                        <div key={key} className="flex items-center gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{LEGEND_LABELS[key]}</span>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 bg-white">
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className={`text-center py-1 text-[10px] font-black uppercase tracking-widest ${day === 'Sun' ? 'text-rose-500' : 'text-slate-400'}`}>
                            {day}
                        </div>
                    ))}

                    {calendarArray.map((cell, i) => {
                        if (cell.type === 'empty') return <div key={`empty-${i}`} className="h-[100px] invisible"></div>;

                        const { dateStr, dayNum, isWeeklyOff, isSunday, isToday, isFuture } = cell;
                        const attendance = attendanceMap[dateStr];
                        const holiday = holidayMap[dateStr];
                        const disabledReason = disabledDates[dateStr];
                        const isSelected = selectedDate === dateStr;

                        const deriveFinalStatus = (dayObj, holidayFlag, weeklyOffFlag) => {
                            const serverFinal = (dayObj?.finalStatus || '').toString().toUpperCase();
                            if (serverFinal === 'HOLIDAY') return STATUS.HOLIDAY;
                            if (holidayFlag) return STATUS.HOLIDAY;
                            if (weeklyOffFlag) return STATUS.WEEKLY_OFF;
                            if (dayObj?.approvedLeave?.exists) {
                                return dayObj.approvedLeave.isHalfDay ? STATUS.HALF_DAY : STATUS.LEAVE;
                            }
                            const attendanceExists = !!dayObj?.attendance?.exists;
                            const attStatus = (dayObj?.attendance?.status || '').toString().toUpperCase();
                            if (attendanceExists && attStatus === 'ON_DUTY') return STATUS.ON_DUTY;
                            if (attendanceExists && attStatus === 'PRESENT') return STATUS.PRESENT;
                            if (attendanceExists && attStatus === 'ABSENT') return STATUS.ABSENT;
                            return STATUS.DEFAULT;
                        };

                        const finalStatus = deriveFinalStatus(attendance, !!holiday, isWeeklyOff);
                        const ui = getCalendarUI(finalStatus, attendance?.approvedLeave?.leaveType);
                        const styles = { container: ui.container, border: ui.border, text: ui.text, dot: ui.dot };
                        const badgeLabel = ui.label;

                        const IconFor = (status) => {
                            switch ((status || '').toString().toUpperCase()) {
                                case STATUS.HOLIDAY: return Coffee;
                                case STATUS.WEEKLY_OFF: return CalendarIcon;
                                case STATUS.LEAVE: return Info;
                                case STATUS.HALF_DAY: return Clock;
                                case STATUS.PRESENT: return CheckCircle;
                                case STATUS.ON_DUTY: return Briefcase;
                                case STATUS.ABSENT: return AlertCircle;
                                default: return null;
                            }
                        };

                        const Icon = IconFor(finalStatus);

                        return (
                            <div
                                key={dateStr}
                                onClick={() => {
                                    const mergedDayObj = Object.assign({}, attendance || {}, { isHoliday: !!holiday, isWeeklyOff, finalStatus });
                                    if (!disabledReason) onDateClick?.(dateStr, mergedDayObj);
                                }}
                                className={`group relative h-[100px] p-2 rounded-xl border transition-all duration-200 flex flex-col justify-between
                                    ${disabledReason && selectionMode ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5'}
                                    ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10 shadow-md scale-[1.02] bg-blue-50/10' : ''}
                                    ${isToday && !isSelected ? 'ring-1 ring-blue-500 ring-offset-1' : ''}
                                    ${styles.container} ${styles.border}
                                `}
                                style={finalStatus === STATUS.LEAVE && attendance?.leaveColor ? {
                                    backgroundColor: isSelected ? undefined : `${attendance.leaveColor}10`,
                                    borderColor: isSelected ? undefined : `${attendance.leaveColor}30`
                                } : {}}>

                                <div className="flex justify-between items-start">
                                    <span className={`text-[11px] font-black h-5 w-5 rounded-lg flex items-center justify-center 
                                        ${isSunday ? 'text-rose-600' : 'text-slate-700'}
                                        ${isSelected ? 'bg-blue-600 text-white shadow-sm' : ''}
                                        ${isToday && !isSelected ? 'bg-blue-100 text-blue-700' : ''}
                                    `}>
                                        {dayNum}
                                    </span>
                                    {holiday ? <Coffee size={12} className={styles.text} /> : Icon && <Icon size={12} className={styles.text} style={finalStatus === STATUS.LEAVE && attendance?.leaveColor ? { color: attendance.leaveColor } : {}} />}
                                </div>

                                <div className="space-y-0.5">
                                    <div className={`text-[9px] leading-tight font-black truncate uppercase tracking-tighter ${styles.text}`}>
                                        {holiday ? holiday.name : ''}
                                    </div>

                                    {attendance?.checkIn && (
                                        <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                            <Clock size={8} />
                                            <span>{new Date(attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                        </div>
                                    )}

                                    {/* Compact Status Indicator */}
                                    {badgeLabel ? (
                                        <div className={`mt-auto text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border inline-block ${styles.container} ${styles.border} ${styles.text}`}>
                                            {badgeLabel}
                                        </div>
                                    ) : (
                                        <div className="h-4"></div>
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
