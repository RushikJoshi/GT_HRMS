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
        if (status === 'Approved') return <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold border border-green-200">Approved</span>;
        if (status === 'Rejected') return <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded text-xs font-bold border border-rose-200">Rejected</span>;
        return <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-bold border border-amber-200">Pending</span>;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header section with glassmorphism */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-20 -mt-20"></div>
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                                <AlertTriangle size={20} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">Correction Portal</h2>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-11">Request log adjustments & attendance fixes</p>
                    </div>

                    <div className="inline-flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                        <button
                            onClick={() => setActiveTab('apply')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'apply'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            New Request
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'history'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                        >
                            History
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-0">
                {activeTab === 'apply' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Selector Section (Left) */}
                        <div className="xl:col-span-8 space-y-6">
                            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Select Target Date</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Only business days are eligible for adjustment</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                                        <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm"><ChevronLeft size={14} className="text-slate-400" /></button>
                                        <div className="px-4 text-[10px] font-black text-slate-700 dark:text-slate-300 min-w-[140px] text-center uppercase tracking-[0.2em]">
                                            {dayjs(new Date(currentYear, currentMonth)).format('MMMM YYYY')}
                                        </div>
                                        <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm"><ChevronRight size={14} className="text-slate-400" /></button>
                                    </div>
                                </div>

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

                        {/* Form Section (Right) */}
                        <div className="xl:col-span-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-xl">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Correction Module</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, category: 'Attendance' })}
                                            className={`group relative py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-500 ${form.category === 'Attendance' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'}`}
                                        >
                                            <Clock size={18} className={form.category === 'Attendance' ? 'text-white' : 'text-slate-400 group-hover:scale-110 transition-transform'} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Punches</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, category: 'Leave' })}
                                            className={`group relative py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-500 ${form.category === 'Leave' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'}`}
                                        >
                                            <CalendarIcon size={18} className={form.category === 'Leave' ? 'text-white' : 'text-slate-400 group-hover:scale-110 transition-transform'} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Leaves</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">System Issue Path</label>
                                        <select required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                            value={form.issueType} onChange={e => setForm({ ...form, issueType: e.target.value })}>
                                            <option value="">-- RESOLVE ISSUE --</option>
                                            {form.category === 'Attendance' ? (
                                                <>
                                                    <option>Missed Check In</option>
                                                    <option>Missed Check Out</option>
                                                    <option>Forgot to Punch (Both)</option>
                                                    <option>Actually Present (Approved Leave Reversal)</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option>Applied Wrong Leave Type</option>
                                                    <option>Forgot to Apply Leave</option>
                                                    <option>LOP Correction</option>
                                                    <option>Cancel Approved Leave</option>
                                                </>
                                            )}
                                        </select>
                                    </div>

                                    {form.category === 'Attendance' ? (
                                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-500">
                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Corrected Timestamp
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">IN_TIME</label>
                                                    <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-black text-slate-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500/20 list-none outline-none"
                                                        value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">OUT_TIME</label>
                                                    <input type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-black text-slate-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500/20 list-none outline-none"
                                                        value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-4 duration-500">
                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Leave Override
                                            </h4>
                                            <div className="space-y-3">
                                                <input type="text" placeholder="Marked As (Original status)" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    value={form.originalLeaveType} onChange={e => setForm({ ...form, originalLeaveType: e.target.value })} />
                                                <select className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs font-black text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    value={form.requestedLeaveType} onChange={e => setForm({ ...form, requestedLeaveType: e.target.value })}>
                                                    <option value="">-- CONVERT TO --</option>
                                                    <option value="CL">CL (Casual)</option>
                                                    <option value="PL">PL (Paid)</option>
                                                    <option value="SL">SL (Sick)</option>
                                                    <option value="Present">Present (Working)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Justification Record</label>
                                        <textarea required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold min-h-[120px] text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                            placeholder="Provide technical justification for this correction..."
                                            value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}></textarea>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!form.startDate || !form.reason}
                                    className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${form.startDate && form.reason
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                                >
                                    {form.startDate ? `Push Correction: ${dayjs(form.startDate).format('DD MMM')}` : 'Awaiting Date Selection'}
                                </button>

                                <div className="flex items-start gap-4 p-5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[1.5rem] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full"></div>
                                    <div className="flex-shrink-0 p-2 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                                        <AlertTriangle size={14} />
                                    </div>
                                    <p className="text-[9px] font-bold text-amber-700 dark:text-amber-500 leading-relaxed uppercase tracking-tighter">
                                        Adjustment protocols are audited. Any falsification of records will result in immediate termination of access.
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    /* HISTORY TAB */
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 shadow-2xl overflow-hidden animate-in fade-in duration-500">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">
                                        <th className="px-8 py-6 text-left">Incident Date</th>
                                        <th className="px-8 py-6 text-center">Module</th>
                                        <th className="px-8 py-6 text-left">Correction Log</th>
                                        <th className="px-8 py-6 text-left">Status</th>
                                        <th className="px-8 py-6 text-left">Manager Authority</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {requests.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-32 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-30">
                                                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                        <Clock size={32} className="text-slate-400" />
                                                    </div>
                                                    <p className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400">Archived Stream Empty</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        requests.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(req => (
                                            <tr key={req._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                                            <span className="text-[8px] font-black leading-none mb-1">{dayjs(req.startDate).format('MMM')}</span>
                                                            <span className="text-xs font-black leading-none">{dayjs(req.startDate).format('DD')}</span>
                                                        </div>
                                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tighter uppercase italic">{dayjs(req.startDate).format('YYYY')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest shadow-sm ${req.category === 'Attendance'
                                                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
                                                        : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'}`}>
                                                        {req.category}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">{req.issueType}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{req.reason}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">{getStatusBadge(req.status)}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        {req.adminRemark ? (
                                                            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 w-full group-hover:border-indigo-500/30 transition-colors">
                                                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 italic">"{req.adminRemark}"</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Awaiting Review</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {requests.length > pageSize && (
                            <div className="px-8 py-6 bg-slate-50/30 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
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
        </div>
    );
}
