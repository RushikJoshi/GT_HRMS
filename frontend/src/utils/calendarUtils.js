export const STATUS = Object.freeze({
    HOLIDAY: 'HOLIDAY',
    WEEKLY_OFF: 'WEEKLY_OFF',
    LEAVE: 'LEAVE',
    HALF_DAY: 'HALF_DAY',
    PRESENT: 'PRESENT',
    ABSENT: 'ABSENT',
    ON_DUTY: 'ON_DUTY',
    DEFAULT: 'DEFAULT'
});

export function getStatusStyles(status) {
    const s = (status || '').toString().toUpperCase();
    switch (s) {
        case STATUS.HOLIDAY:
            return { container: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800', dot: 'bg-yellow-400' };
        case STATUS.WEEKLY_OFF:
            return { container: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', dot: 'bg-gray-400' };
        case STATUS.LEAVE:
            return { container: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', dot: 'bg-blue-400' };
        case STATUS.HALF_DAY:
            return { container: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', dot: 'bg-orange-400' };
        case STATUS.PRESENT:
            return { container: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', dot: 'bg-green-400' };
        case STATUS.ON_DUTY:
            return { container: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', dot: 'bg-purple-400' };
        case STATUS.ABSENT:
            return { container: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', dot: 'bg-red-400' };
        default:
            return { container: 'bg-white', border: 'border-slate-100', text: 'text-slate-600', dot: 'bg-slate-300' };
    }
}

// Single helper for UI mapping per requirement
export function getCalendarUI(status, leaveType) {
    const s = (status || '').toString().toUpperCase();
    const styles = getStatusStyles(s);
    let label = '';

    switch (s) {
        case STATUS.HOLIDAY:
            label = 'Holiday';
            break;
        case STATUS.WEEKLY_OFF:
            label = 'Weekly Off';
            break;
        case STATUS.HALF_DAY:
            label = 'Half Day';
            break;
        case STATUS.LEAVE:
            label = (leaveType || 'Leave').toString().toUpperCase();
            break;
        case STATUS.PRESENT:
            label = 'Present';
            break;
        case STATUS.ABSENT:
            label = 'Absent';
            break;
        case STATUS.ON_DUTY:
            label = 'On Duty';
            break;
        default:
            label = '';
    }

    return { ...styles, label };
}
