import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, CheckCircle, AlertOctagon, Timer } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

// Helper to format seconds into HH:mm:ss
const formatDuration = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function AttendanceClock({
    isCheckedIn,
    isCheckedOut,
    checkInTime,
    onAction,
    isLoading,
    location = "Remote",
    settings = {},
    error = null
}) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [radius, setRadius] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 100 : 120);

    // Timer State
    const [workedSeconds, setWorkedSeconds] = useState(0);
    const [isOvertime, setIsOvertime] = useState(false);

    // Constants
    const SHIFT_DURATION = 8 * 60 * 60; // 8 Hours in seconds
    const circumference = 2 * Math.PI * radius;

    // Live Clock Update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Work Timer Logic
    useEffect(() => {
        let interval;

        const updateTimer = () => {
            if (isCheckedIn && !isCheckedOut && checkInTime) {
                const now = new Date();
                const start = new Date(checkInTime);
                const diffValues = Math.max(0, (now - start) / 1000); // In Seconds

                setWorkedSeconds(diffValues);
                setIsOvertime(diffValues > SHIFT_DURATION);
            } else if (!isCheckedIn) {
                setWorkedSeconds(0);
                setIsOvertime(false);
            }
        };

        if (isCheckedIn && !isCheckedOut) {
            updateTimer(); // Initial call
            interval = setInterval(updateTimer, 1000);
        }

        return () => clearInterval(interval);
    }, [isCheckedIn, isCheckedOut, checkInTime]);

    // Responsive Radius
    useEffect(() => {
        const onResize = () => setRadius(window.innerWidth < 768 ? 90 : 120);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Visual Calculations
    // If NOT overtime: Scale based on 8h (0 to 100% of 8h)
    // If OVERTIME: Scale based on Total Worked Time (Blue portion shrinks, Green portion grows)

    // VISUAL FIX: Scale is ALWAYS based on Shift Duration (8h).
    // This ensures Blue fills 100% when shift is done, and Green wraps around (Lap 2).
    const totalScaleSeconds = SHIFT_DURATION;

    // Avoid division by zero
    const safeTotalScale = totalScaleSeconds > 0 ? totalScaleSeconds : 1;

    const shiftSeconds = Math.min(workedSeconds, SHIFT_DURATION);
    const overtimeSeconds = Math.max(0, workedSeconds - SHIFT_DURATION);

    const blueRatio = shiftSeconds / safeTotalScale;
    const greenRatio = overtimeSeconds / safeTotalScale;

    // Stroke Dash Logic
    // blueDashArray: Fill blue part. Gap is the rest.
    const blueDashArray = `${blueRatio * circumference} ${circumference}`;

    // greenDashArray: Fill green part. Gap is the rest.
    // Offset: Must start AFTER the blue part. 
    // SVG stroke starts at 3 o'clock. We rotated -90deg so it starts at 12 o'clock.
    // The "Start" of green should be at blueLength.
    // stroke-dashoffset pushes the pattern back. 
    // If we want it to start at `len`, offset should be `-len`.

    const greenDashArray = `${greenRatio * circumference} ${circumference}`;

    // Fix: Green starts where Blue ends.
    // If Blue is 100% (Ratio 1), Offset = 0 (Start at Top).
    // Formula per requirement: circumference * (1 - shiftProgress)
    const greenDashOffset = circumference * (1 - blueRatio);

    // UI Configuration
    const isMultipleMode = settings?.punchMode === 'multiple';
    const showShiftCompleted = !isMultipleMode && isCheckedOut;

    let statusBadgeText = isCheckedIn && !isCheckedOut ? (isOvertime ? "Overtime Running" : "Active Shift") : "Idle";
    let statusBadgeStyle = isCheckedIn && !isCheckedOut
        ? (isOvertime
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800')
        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md flex flex-col items-center justify-center min-h-[500px] transition-all relative overflow-hidden group">

            {/* Background Gradient - Shifts slightly based on state */}
            <div className={`absolute inset-0 bg-gradient-to-br transition-colors duration-1000 ${isOvertime
                ? 'from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20'
                : 'from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20'
                }`}></div>

            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-8 flex items-center gap-2 uppercase tracking-wide relative z-10">
                {isOvertime ? (
                    <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 animate-pulse">
                        <Timer size={14} /> Overtime Monitoring
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <Clock size={14} className="text-indigo-600 dark:text-indigo-400" /> Live Attendance
                    </span>
                )}
            </h3>

            {/* Circular Progress Clock UI */}
            <div className="relative mb-8 w-64 h-64 flex items-center justify-center group/clock transition-transform duration-300">

                {/* SVG Progress Ring */}
                <div className="absolute inset-0 transform -rotate-90">
                    <svg className="w-full h-full" viewBox="0 0 256 256">
                        <defs>
                            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#22c55e" />
                                <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Track */}
                        <circle
                            cx="128"
                            cy="128"
                            r={radius}
                            fill="none"
                            className="stroke-slate-100 dark:stroke-slate-800/40"
                            strokeWidth="8"
                        />

                        {/* Shift Progress (Blue) */}
                        <circle
                            cx="128"
                            cy="128"
                            r={radius}
                            fill="none"
                            stroke="url(#blueGradient)"
                            className="transition-all duration-1000 ease-in-out"
                            strokeWidth="8"
                            strokeDasharray={blueDashArray}
                            strokeLinecap={isOvertime ? "butt" : "round"}
                            style={{ filter: isCheckedIn && !isCheckedOut ? 'url(#glow)' : 'none' }}
                        />

                        {/* Overtime Progress (Green) */}
                        {isOvertime && (
                            <circle
                                cx="128"
                                cy="128"
                                r={radius}
                                fill="none"
                                stroke="url(#greenGradient)"
                                className="transition-all duration-1000 ease-in-out"
                                strokeWidth="8"
                                strokeDasharray={greenDashArray}
                                strokeDashoffset={greenDashOffset}
                                strokeLinecap="round"
                                style={{ filter: 'url(#glow)' }}
                            />
                        )}
                    </svg>
                </div>

                {/* Inner Content */}
                <div className="relative z-10 text-center flex flex-col items-center justify-center w-44 h-44 bg-white dark:bg-slate-900 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 transition-all duration-300">
                    {isOvertime ? (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shift Time</div>
                            <div className="text-xl font-mono font-bold text-indigo-500 mb-2">08:00:00</div>
                            <div className="w-12 h-px bg-slate-200 dark:bg-slate-700 mb-2"></div>
                            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Overtime</div>
                            <div className="text-xl font-mono font-bold text-emerald-500">
                                +{formatDuration(overtimeSeconds)}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Worked Time</div>
                            <div className="text-4xl font-mono font-bold text-slate-900 dark:text-white tracking-tight tabular-nums mb-3">
                                {formatDuration(workedSeconds)}
                            </div>
                        </div>
                    )}

                    {!isOvertime && (
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 mt-2 ${statusBadgeStyle}`}>
                            {statusBadgeText}
                        </div>
                    )}
                </div>

                {/* Overtime Badge Floating */}
                {isOvertime && (
                    <div className="absolute -bottom-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg animate-bounce">
                        Overtime Started
                    </div>
                )}
            </div>

            {/* Current Time Display */}
            <div className="mb-8 text-center bg-slate-50 dark:bg-slate-900/50 px-6 py-4 rounded-lg border border-slate-200 dark:border-slate-700 w-full max-w-[280px]">
                <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2 flex items-center justify-center gap-2">
                    <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    <span>{formatDateDDMMYYYY(currentTime)}</span>
                </div>
            </div>

            {/* Action Button */}
            <div className="w-full max-w-[280px] z-20 relative">
                {showShiftCompleted ? (
                    <div className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold text-sm text-center shadow-md flex flex-col items-center gap-2">
                        <CheckCircle size={20} />
                        <span>Shift Completed</span>
                    </div>
                ) : (
                    <button
                        onClick={onAction}
                        disabled={isLoading}
                        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg ${isCheckedIn && !isCheckedOut
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                    >
                        {isLoading ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (isCheckedIn && !isCheckedOut) ? (
                            <>
                                <LogOut size={18} />
                                <span>Check Out</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                <span>{isMultipleMode && isCheckedIn ? 'Check In Again' : 'Check In'}</span>
                            </>
                        )}
                    </button>
                )}

                {/* Error Message Display */}
                {error && (
                    <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2">
                        <AlertOctagon size={16} className="text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                        <p className="text-xs font-medium text-rose-700 dark:text-rose-300 leading-relaxed text-left">
                            {error}
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                <span>Location: <span className="font-medium capitalize">{location}</span></span>
            </div>
        </div>
    );
}
