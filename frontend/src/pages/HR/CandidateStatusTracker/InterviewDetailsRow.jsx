import React from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import dayjs from 'dayjs';

/**
 * InterviewDetailsRow
 * Displays interview information in a styled card format
 * Used in both SHORTLISTED and INTERVIEW tabs
 */
export default function InterviewDetailsRow({ interview, showTag = true, tagLabel = 'Shortlisted' }) {
    if (!interview) return null;

    const formatTime = (time) => {
        // Handle both "HH:mm" and "HH:mm:ss" formats
        if (!time) return 'N/A';
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
    };

    return (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100/60 p-5 space-y-4">
            {/* Header with title and status tag */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                    Interview Scheduled
                </h4>
                {showTag && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wider">
                        {tagLabel}
                    </span>
                )}
            </div>

            {/* Interview details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Date */}
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg text-purple-600 flex-shrink-0 shadow-sm">
                        <Calendar size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</div>
                        <div className="text-sm font-semibold text-slate-800 truncate">
                            {dayjs(interview.scheduledDate).format('MMM DD, YYYY')}
                        </div>
                    </div>
                </div>

                {/* Time */}
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg text-blue-600 flex-shrink-0 shadow-sm">
                        <Clock size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</div>
                        <div className="text-sm font-semibold text-slate-800">
                            {formatTime(interview.scheduledTime)}
                        </div>
                    </div>
                </div>

                {/* Location/Mode */}
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg text-emerald-600 flex-shrink-0 shadow-sm">
                        <MapPin size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</div>
                        <div className="text-sm font-semibold text-slate-800 truncate">
                            {interview.mode || 'N/A'}
                            {interview.location && ` • ${interview.location}`}
                        </div>
                    </div>
                </div>

                {/* Interviewer */}
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg text-orange-600 flex-shrink-0 shadow-sm">
                        <User size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interviewer</div>
                        <div className="text-sm font-semibold text-slate-800 truncate">
                            {interview.interviewerName || interview.interviewerId?.name || 'N/A'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Meeting link if online */}
            {interview.mode === 'Online' && interview.meetingLink && (
                <div className="pt-3 border-t border-purple-100/50">
                    <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
                    >
                        📎 Join Meeting Link
                    </a>
                </div>
            )}
        </div>
    );
}
