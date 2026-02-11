import React, { useState, useEffect } from 'react';
import { Clock, Briefcase, Timer } from 'lucide-react';

const formatHoursMinutes = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
};

export default function WorkingHoursCard({
    baseHours = 0, // Closed sessions hours from backend
    lastPunchIn = null, // Time of the LAST punch IN
    isActive = false // If currently working
}) {
    const [totalSeconds, setTotalSeconds] = useState(0);

    useEffect(() => {
        const updateTimer = () => {
            const baseSeconds = baseHours * 3600;

            if (isActive && lastPunchIn) {
                const now = new Date();
                const start = new Date(lastPunchIn);
                const currentSessionSeconds = Math.max(0, (now - start) / 1000);
                setTotalSeconds(baseSeconds + currentSessionSeconds);
            } else {
                setTotalSeconds(baseSeconds);
            }
        };

        updateTimer(); // Initial call

        let interval;
        if (isActive) {
            interval = setInterval(updateTimer, 1000);
        }

        return () => clearInterval(interval);
    }, [baseHours, lastPunchIn, isActive]);

    // Business Logic
    const SHIFT_LIMIT = 8 * 3600; // 8 hours in seconds
    const shiftSeconds = Math.min(totalSeconds, SHIFT_LIMIT);
    const overtimeSeconds = Math.max(0, totalSeconds - SHIFT_LIMIT);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm flex flex-col justify-between group hover:border-indigo-500/30 transition-colors h-full">

            {/* Header / Total Section */}
            <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Overtime</h3>
                    {overtimeSeconds > 0 && (
                        <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider animate-pulse">
                            Active
                        </span>
                    )}
                </div>

                <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Working Hours</span>
                </div>
                <div className="text-4xl font-black text-slate-800 dark:text-white tracking-tight tabular-nums mt-1">
                    {formatHoursMinutes(totalSeconds)}
                </div>
            </div>

            {/* Shift & Overtime Breakdown Grid */}
            <div className="grid grid-cols-2 gap-4">

                {/* Shift Box (Blue) */}
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Shift</span>
                    </div>
                    <div className="text-xl font-black text-blue-700 dark:text-blue-300 tabular-nums leading-none">
                        {formatHoursMinutes(shiftSeconds)}
                    </div>
                    <div className="text-[9px] font-bold text-blue-400/60 mt-1 uppercase tracking-wider">Max 08h 00m</div>
                </div>

                {/* Overtime Box (Green) */}
                <div className={`rounded-xl p-4 border transition-colors duration-300 ${overtimeSeconds > 0
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                    }`}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${overtimeSeconds > 0 ? "bg-emerald-500" : "bg-slate-400"}`}></div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${overtimeSeconds > 0 ? "text-emerald-500" : "text-slate-400"}`}>Overtime</span>
                    </div>
                    <div className={`text-xl font-black tabular-nums leading-none ${overtimeSeconds > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-600"}`}>
                        {formatHoursMinutes(overtimeSeconds)}
                    </div>
                    <div className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${overtimeSeconds > 0 ? "text-emerald-600/40" : "text-slate-300/60"}`}>
                        {overtimeSeconds > 0 ? "Beyond 8h" : "No Overtime"}
                    </div>
                </div>

            </div>
        </div>
    );
}
