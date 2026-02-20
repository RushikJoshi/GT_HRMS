import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, CheckCircle, AlertOctagon, Timer, MapPin } from 'lucide-react';
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
    lastPunchIn = null, // New: Time of the most recent IN punch
    baseWorkedSeconds = 0, // New: Total seconds from completed sessions
    onAction,
    isLoading,
    location = "Remote",
    settings = {},
    error = null,
    isFinalCheckOut = false
}) {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Timer State
    const [workedSeconds, setWorkedSeconds] = useState(0);
    const [isOvertime, setIsOvertime] = useState(false);

    // Constants
    const SHIFT_DURATION = 8 * 60 * 60; // 8 Hours in seconds

    // Live Clock Update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Work Timer Logic
    useEffect(() => {
        let interval;

        const updateTimer = () => {
            // Worked time = Completed sessions + Current session (if running)
            let total = baseWorkedSeconds;

            if (isCheckedIn && !isCheckedOut && lastPunchIn) {
                const now = new Date();
                const start = new Date(lastPunchIn);
                const currentSessionSeconds = Math.max(0, (now - start) / 1000);
                total += currentSessionSeconds;
            }

            setWorkedSeconds(total);
            setIsOvertime(total > SHIFT_DURATION);
        };

        updateTimer(); // Initial calculation

        if (isCheckedIn && !isCheckedOut) {
            interval = setInterval(updateTimer, 1000);
        }

        return () => clearInterval(interval);
    }, [isCheckedIn, isCheckedOut, lastPunchIn, baseWorkedSeconds]);


    // UI Configuration
    const isMultipleMode = settings?.punchMode === 'multiple';
    const showShiftCompleted = isFinalCheckOut || (!isMultipleMode && isCheckedOut);

    return (
        <div className="w-full flex flex-col items-center justify-center min-h-[420px] relative font-sans">

            {/* Main Clock Container */}
            <div className="relative z-10 flex flex-col items-center">

                {/* Hexagon/Unique Shape Wrapper */}
                <div className="relative w-72 h-72 flex items-center justify-center group cursor-default">

                    {/* 1. Outer Glow/Pulse Rings - Behind everything */}
                    <div className={`absolute inset-0 rounded-full opacity-20 blur-xl transition-all duration-1000 ${isCheckedIn && !isCheckedOut
                        ? 'bg-teal-400 animate-pulse scale-110'
                        : 'bg-slate-300 scale-90'
                        }`}></div>

                    {/* 2. Rotating Border Ring (SVG) */}
                    <svg className="absolute inset-0 w-full h-full animate-[spin_10s_linear_infinite] opacity-80" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#14B8A6" stopOpacity="0" />
                                <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#0D9488" stopOpacity="1" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="48" fill="none" stroke="url(#ringGradient)" strokeWidth="0.5" strokeDasharray="10 10" />
                    </svg>

                    <svg className="absolute inset-0 w-full h-full animate-[spin_15s_linear_infinite_reverse] opacity-50" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#CCFBF1" strokeWidth="0.5" strokeDasharray="4 6" />
                    </svg>

                    {/* 3. Main Glass Disc */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/90 to-white/40 backdrop-blur-xl shadow-2xl border border-white/60 flex flex-col items-center justify-center z-20 overflow-hidden">

                        {/* Shimmer Effect */}
                        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-white/30 to-transparent rotate-45 animate-[shimmer_3s_infinite]" />

                        {/* Content Inside Clock */}
                        <div className="relative z-30 flex flex-col items-center">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">
                                {isOvertime ? 'Overtime' : 'Duration'}
                            </h3>

                            {/* Digital Timer */}
                            <div className={`text-5xl font-medium tabular-nums tracking-tight mb-2 transition-all duration-500 ${isOvertime ? 'text-amber-500' : 'text-slate-700'
                                }`}>
                                {formatDuration(workedSeconds)}
                            </div>

                            {/* Status Pill */}
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-inner transition-all duration-300 flex items-center gap-2 ${isCheckedIn && !isCheckedOut
                                ? 'bg-teal-50 text-teal-600 border border-teal-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-100'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isCheckedIn && !isCheckedOut ? 'bg-teal-500 animate-ping' : 'bg-slate-300'}`}></div>
                                {isCheckedIn && !isCheckedOut ? 'Active' : 'Idle'}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Real-time Display Below Clock */}
                <div className="mt-8 mb-8 text-center">
                    <div className="text-3xl font-light text-slate-400 tracking-wide font-mono">
                        {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        <span className="text-sm font-bold ml-1 align-top opacity-60">
                            {currentTime.toLocaleTimeString('en-US', { hour12: false, second: '2-digit' })}
                        </span>
                    </div>
                    <div className="text-xs font-bold text-teal-600/80 uppercase tracking-[0.2em] mt-1">
                        {formatDateDDMMYYYY(currentTime)}
                    </div>
                </div>

                {/* Unique Action Button */}
                <div className="w-full max-w-[260px] relative group button-wrapper">
                    <div className={`absolute -inset-1 rounded-2xl blur opacity-10 group-hover:opacity-40 transition duration-500 ${isCheckedIn && !isCheckedOut ? 'bg-rose-500' : 'bg-teal-500'
                        }`}></div>

                    <button
                        onClick={onAction}
                        disabled={isLoading}
                        className={`relative w-full py-4 rounded-xl font-bold text-sm uppercase tracking-[0.15em] transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-md overflow-hidden ${isCheckedIn && !isCheckedOut
                            ? 'bg-white text-rose-500 border-2 border-rose-50 hover:border-rose-100'
                            : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white border-none hover:shadow-teal-500/40'
                            }`}
                    >
                        {/* Button Icon */}
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : isCheckedIn && !isCheckedOut ? (
                            <>
                                <LogOut size={18} className="text-rose-500" />
                                <span>Check Out</span>
                            </>
                        ) : (
                            <>
                                <LogIn size={18} className="text-teal-100" />
                                <span>Check In</span>
                            </>
                        )}

                        {/* Shine Effect on Hover (Only for Check In) */}
                        {(!isCheckedIn || isCheckedOut) && (
                            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
                        )}
                    </button>
                </div>

                {/* Location Tag */}
                <div className="mt-6 flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:text-teal-400 transition-colors cursor-default">
                    <MapPin size={12} />
                    {location}
                </div>

            </div>
        </div>
    );
}
