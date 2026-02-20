import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import AttendanceCalendar from './AttendanceCalendar';
import { ChevronLeft, ChevronRight, Download, Filter, Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, Briefcase } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';


export default function MyAttendanceView() {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [summary, setSummary] = useState({ present: 0, absent: 0, leave: 0, late: 0, hours: 0 });
    const [statusFilter, setStatusFilter] = useState('all');
    const [holidays, setHolidays] = useState([]);
    const [settings, setSettings] = useState({});

    useEffect(() => {
        fetchAttendance();
    }, [currentMonth, currentYear]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const t = new Date().getTime();
            // Fetch Attendance, Leaves, Holidays, and Settings in parallel
            const [attRes, leaveRes, holidayRes, settingsRes] = await Promise.all([
                api.get(`/attendance/my?month=${currentMonth + 1}&year=${currentYear}&t=${t}`),
                api.get(`/employee/leaves/history?t=${t}`),
                api.get(`/holidays?t=${t}`),
                api.get(`/attendance/settings?t=${t}`)
            ]);

            const rawAttendance = attRes.data || [];
            const leaves = leaveRes.data || [];

            // --- Merge Leaves into Attendance Data (Client-Side Patch) ---
            // This ensures "On Leave" shows up even if backend sync failed or for Pending leaves

            // 1. Create a map of existing attendance dates
            const attendanceMap = new Set(rawAttendance.map(a => new Date(a.date).toDateString()));

            // 2. Identify view range
            const viewStart = new Date(currentYear, currentMonth, 1);
            const viewEnd = new Date(currentYear, currentMonth + 1, 0);

            const mergedAttendance = [...rawAttendance];

            leaves.forEach(leave => {
                // Only consider Active leaves
                if (!['Approved', 'Pending'].includes(leave.status)) return;

                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);

                // Iterate through leave days
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    // Check if date is within current view month
                    if (d < viewStart || d > viewEnd) continue;

                    // If no attendance record exists for this date, create a synthetic one
                    if (!attendanceMap.has(d.toDateString())) {
                        mergedAttendance.push({
                            _id: `synthetic-leave-${d.getTime()}`,
                            date: d.toISOString(),
                            status: 'leave', // Force status to leave for visualization
                            leaveType: leave.leaveType,
                            isSynthetic: true, // Marker
                            checkIn: null,
                            checkOut: null,
                            workingHours: 0,
                            isLate: false
                        });
                        attendanceMap.add(d.toDateString()); // Prevent dupes if overlapping leaves exist (rare)
                    }
                }
            });

            // Sort by date again after merge
            mergedAttendance.sort((a, b) => new Date(a.date) - new Date(b.date));

            setAttendance(mergedAttendance);
            setHolidays(holidayRes.data || []);
            setSettings(settingsRes.data || {});

            // Calculate Summary
            const stats = mergedAttendance.reduce((acc, item) => {
                const s = (item.status || '').toLowerCase();

                if (s === 'present' || s === 'half_day') acc.present++;
                if (s === 'absent') acc.absent++;
                // "On Leave" count now includes synthetic leaves (Applied/Approved but not synced)
                if (s === 'leave') acc.leave++;
                if (item.isLate) acc.late++;
                acc.hours += (item.workingHours || 0);
                return acc;
            }, { present: 0, absent: 0, leave: 0, late: 0, hours: 0 });

            setSummary(stats);
        } catch (err) {
            console.error("Failed to fetch attendance", err);
        } finally {
            setLoading(false);
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

    const handleExport = async () => {
        if (!attendance.length) return alert("No data to export");

        const headers = ["Employee_id", "Employee_Name", "Date", "Status", "Check In", "Check Out", "Working Hours", "Is Late"];
        const tenant = localStorage.getItem("tenantId");
        console.log(tenant);

        const rows = attendance.map(item => [
            item.employee?.employeeId || '-',
            (item.employee?.firstName + " " + (item.employee?.lastName || '')).trim(),
            formatDateDDMMYYYY(item.date),
            (item.leaveType ? `${item.status} (${item.leaveType})` : item.status).toUpperCase(),
            item.checkIn ? new Date(item.checkIn).toLocaleTimeString() : '-',
            item.checkOut ? new Date(item.checkOut).toLocaleTimeString() : '-',
            item.workingHours || 0,
            item.isLate ? "YES" : "NO"
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Attendance_${currentMonth + 1}_${currentYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredAttendance = attendance.filter(item => {
        if (statusFilter === 'all') return true;
        return (item.status || '').toLowerCase() === statusFilter.toLowerCase();
    });

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">


                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white p-1 rounded-xl border border-[#E5E7EB] shadow-sm">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-[#6B7280] transition-colors"><ChevronLeft size={16} /></button>
                        <div className="px-3 text-xs font-bold text-[#111827] min-w-[120px] text-center uppercase tracking-widest">
                            {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-[#6B7280] transition-colors"><ChevronRight size={16} /></button>
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-[#14B8A6] hover:bg-[#0D9488] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-md transition-colors"
                    >
                        <Download size={14} /> Export CSV
                    </button>

                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 text-[10px] font-bold uppercase tracking-widest bg-white text-[#111827] rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] focus:outline-none focus:ring-1 focus:ring-[#14B8A6] transition-colors cursor-pointer shadow-sm"
                        >
                            <option value="all">All Records</option>
                            <option value="present">Present Only</option>
                            <option value="absent">Absent Only</option>
                            <option value="leave">On Leave</option>
                            <option value="half_day">Half Day</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#9CA3AF]">
                            <Filter size={10} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <SummaryCard label="Present" value={summary.present} color="text-[#14B8A6]" iconBg="bg-[#CCFBF1]" iconColor="text-[#14B8A6]" icon={CheckCircle} />
                <SummaryCard label="Absent" value={summary.absent} color="text-[#EF4444]" iconBg="bg-[#FEE2E2]" iconColor="text-[#EF4444]" icon={AlertCircle} />
                <SummaryCard label="On Leave" value={summary.leave} color="text-[#F59E0B]" iconBg="bg-[#FEF3C7]" iconColor="text-[#D97706]" icon={CalendarIcon} />
                <SummaryCard label="Late Marks" value={summary.late} color="text-[#A855F7]" iconBg="bg-[#F3E8FF]" iconColor="text-[#9333EA]" icon={Clock} />
                <SummaryCard label="Total Hours" value={summary.hours.toFixed(1)} color="text-[#6366F1]" iconBg="bg-[#E0E7FF]" iconColor="text-[#4F46E5]" unit="Hrs" icon={Briefcase} />
            </div>

            {/* Calendar Section */}
            <div className="bg-white rounded-[20px] shadow-md border border-[#E5E7EB] p-4">
                <div className="overflow-hidden">
                    <AttendanceCalendar
                        data={filteredAttendance}
                        holidays={holidays}
                        settings={settings}
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                    />
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ label, value, color, iconBg, iconColor, unit, icon: Icon }) {
    return (
        <div className="bg-white p-3 rounded-[20px] shadow-sm border border-[#E5E7EB] hover:shadow-md transition-all duration-300 flex flex-col justify-between h-24 group">
            <div className="flex justify-between items-start">
                <span className="text-[9px] text-[#6B7280] uppercase tracking-widest font-bold">{label}</span>
                <div className={`p-1.5 rounded-lg ${iconBg} ${iconColor} group-hover:scale-110 transition-transform`}>
                    {Icon ? <Icon size={12} /> : <div className="h-2 w-2 rounded-full bg-current opacity-50"></div>}
                </div>
            </div>
            <div className="mt-2 text-right">
                <div className="flex flex-col items-end">
                    <span className={`text-3xl font-bold ${color || 'text-[#111827]'} tracking-tighter leading-none`}>{value}</span>
                    {unit && <span className="text-[9px] font-bold text-[#9CA3AF] uppercase">{unit}</span>}
                </div>
            </div>
        </div>
    );
}
