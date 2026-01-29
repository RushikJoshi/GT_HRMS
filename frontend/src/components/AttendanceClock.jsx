import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, CheckCircle, AlertOctagon } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

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
    const [elapsed, setElapsed] = useState("00:00:00");
    const [currentTime, setCurrentTime] = useState(new Date());
    const [progress, setProgress] = useState(0);
    const [radius, setRadius] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 100 : 120);

    // Live Clock Update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Duration Timer & Progress Logic
    useEffect(() => {
        let interval;
        if (isCheckedIn && !isCheckedOut && checkInTime) {

            // Initial calculation to avoid 1s delay
            const calculateTime = () => {
                const now = new Date();
                const start = new Date(checkInTime);
                const diff = Math.max(0, now - start);

                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);

                setElapsed(
                    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                );

                // Calculate Progress
                const totalSeconds = diff / 1000;
                const targetHours = settings?.fullDayThresholdHours || 9;
                const targetSeconds = targetHours * 3600;
                const pct = Math.min((totalSeconds / targetSeconds) * 100, 100);
                setProgress(pct);
            };

            calculateTime(); // Run immediately
            interval = setInterval(calculateTime, 1000);
        } else if (!isCheckedIn) {
            setElapsed("00:00:00");
            setProgress(0);
        } else if (isCheckedOut) {
            // If checked out, we might want to show the final progress if we had the checkout time, 
            // but for now we stop the timer. The User didn't explicitly ask for historical progress here.
            // We'll leave progress as is or reset if we want. 
            // Often purely visual "Shift Completed" state is better.
        }
        return () => clearInterval(interval);
    }, [isCheckedIn, isCheckedOut, checkInTime, settings]);

    // UI Configuration based on Policy
    const isMultipleMode = settings?.punchMode === 'multiple';
    const showShiftCompleted = !isMultipleMode && isCheckedOut;

    let statusText = "Not Punched In";
    let statusColor = "text-slate-400";
    // let ringColor = "border-slate-100"; // No longer used for border color directly

    // Colors for SVG Stroke
    let strokeColorClass = "text-slate-200 dark:text-slate-700";

    if (isCheckedIn && !isCheckedOut) {
        statusText = "You are Punched In";
        statusColor = "text-emerald-500";
        strokeColorClass = "text-emerald-500";
    } else if (isCheckedOut) {
        statusText = isMultipleMode ? "Currently Out" : "Shift Completed";
        statusColor = isMultipleMode ? "text-amber-500" : "text-blue-500";
        strokeColorClass = isMultipleMode ? "text-amber-500" : "text-blue-500";
        // If shift completed, maybe show full ring?
        if (!isMultipleMode) strokeColorClass = "text-blue-500";
    }

    // Responsively update radius on resize
    useEffect(() => {
        const onResize = () => setRadius(window.innerWidth < 768 ? 90 : 120);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Circular Progress Constants
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md flex flex-col items-center justify-center min-h-[500px] transition-all relative overflow-hidden group">
            {/* Subtle Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20"></div>
            
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-8 flex items-center gap-2 uppercase tracking-wide relative z-10">
                <Clock size={14} className="text-indigo-600 dark:text-indigo-400" />
                Live Attendance
            </h3>

            {/* Circular Progress Clock UI */}
            <div className="relative mb-8 w-64 h-64 flex items-center justify-center group/clock transition-transform duration-300">

                {/* SVG Progress Ring */}
                <div className="absolute inset-0 transform -rotate-90">
                    <svg className="w-full h-full" viewBox="0 0 256 256">
                        <defs>
                            <linearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
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
                            strokeWidth="10"
                        />
                        {/* Progress */}
                        <circle
                            cx="128"
                            cy="128"
                            r={radius}
                            fill="none"
                            stroke="url(#clockGradient)"
                            className={`transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]`}
                            strokeWidth="10"
                            strokeDasharray={circumference}
                            strokeDashoffset={isCheckedIn && !isCheckedOut ? strokeDashoffset : (isCheckedOut && !isMultipleMode ? 0 : circumference)}
                            strokeLinecap="round"
                            style={{ filter: isCheckedIn && !isCheckedOut ? 'url(#glow)' : 'none' }}
                        />
                    </svg>
                </div>

                {/* Inner Content */}
                <div className="relative z-10 text-center flex flex-col items-center justify-center w-44 h-44 bg-white dark:bg-slate-900 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 group-hover/clock:scale-[1.02] transition-transform duration-300">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Duration</div>
                    <div className="text-4xl font-mono font-bold text-slate-900 dark:text-white tracking-tight tabular-nums mb-2">
                        {elapsed}
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-300 ${
                        isCheckedIn && !isCheckedOut
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}>
                        {isCheckedIn && !isCheckedOut ? 'Active' : 'Idle'}
                    </div>
                </div>
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
                        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg ${
                            isCheckedIn && !isCheckedOut
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
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>Location: <span className="font-medium capitalize">{location}</span></span>
            </div>
        </div>
    );
}
