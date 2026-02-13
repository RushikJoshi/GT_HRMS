import React from 'react';
import { Clock, Calendar, ArrowRight } from 'lucide-react';
import MoveToRoundDropdown from '../CandidateStatusTracker/MoveToRoundDropdown';
import { normalizeStatus, DEFAULT_PIPELINE } from '../PipelineStatusManager';

export default function ActionButtons({
  stage,
  applicant,
  onShortlist,
  onReject,
  onScheduleInterview,
  onProceed,
  onMoveToRound,
  onFinalize,
  availableRounds,
  onAddCustomRound
}) {
  const normalizedCurrent = normalizeStatus(applicant.status);

  // Helper to check if applicant has already moved past this stage
  const hasMovedPast = (thisStage) => {
    if (applicant.status === 'Rejected') return false;

    // Use the default pipeline to determine progress
    const currentIdx = DEFAULT_PIPELINE.indexOf(normalizedCurrent);
    const thisIdx = DEFAULT_PIPELINE.indexOf(thisStage);

    if (currentIdx > thisIdx) return true;
    if ((applicant.status === 'Selected' || applicant.status === 'Finalized') && thisStage !== 'Finalized') return true;
    return false;
  };

  // If candidate has moved forward from this tab's stage, show status label
  if (hasMovedPast(stage)) {
    return (
      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center gap-2 text-blue-700 text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300">
        <span className="text-sm">✅</span>
        {applicant.status === 'Selected' ? 'SELECTED' : applicant.status.toUpperCase()}
      </div>
    );
  }

  // PART 1: APPLIED STAGE -> SHORTLIST / REJECT
  if (stage === 'Applied') {
    return (
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => onReject(applicant)}
          className="flex-1 py-3 px-4 bg-white border border-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 shadow-sm hover:shadow-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="text-sm">❌</span>
          Reject
        </button>
        <button
          onClick={() => onShortlist(applicant)}
          className="flex-1 py-3 px-4 bg-blue-600 border border-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 hover:shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="text-sm">✅</span>
          Shortlist
        </button>
      </div>
    );
  }

  // PART 2: SHORTLISTED STAGE -> SCHEDULE INTERVIEW
  if (stage === 'Shortlisted') {
    // If already has interview data, show nothing (details block will be shown in CandidateCard)
    if (applicant.interview?.date || applicant.status.includes('Interview')) return null;

    return (
      <div className="mt-4">
        <button
          onClick={() => onScheduleInterview(applicant)}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
        >
          <Calendar size={18} className="group-hover:animate-bounce" />
          Schedule Interview
        </button>
      </div>
    );
  }

  // PART 3 & 4: INTERVIEW / DYNAMIC ROUNDS -> PROCEED / REJECT / OTHER
  if (stage === 'Interview' || stage.includes('Round') || stage === 'HR Round' || stage === 'Technical Round') {
    // If candidate is already beyond INTERVIEW (e.g. Selected/Finalized), they are already handled by hasMovedPast

    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onProceed(applicant)}
          className="py-3 px-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 hover:shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="text-sm">▶</span>
          Proceed
        </button>

        <button
          onClick={() => onReject(applicant)}
          className="py-3 px-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 hover:border-rose-200 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="text-sm">❌</span>
          Reject
        </button>

        <MoveToRoundDropdown
          rounds={availableRounds}
          onSelectRound={(round) => onMoveToRound(applicant, round)}
          onAddCustomRound={onAddCustomRound}
        />
      </div>
    );
  }

  // Finalized
  if (stage === 'Finalized') {
    return (
      <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
        <span className="text-sm">✅</span>
        {applicant.status === 'Selected' ? 'SELECTED' : 'FINALIZED'}
      </div>
    );
  }

  return null;
}
