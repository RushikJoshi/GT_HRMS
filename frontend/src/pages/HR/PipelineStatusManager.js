
export const DEFAULT_PIPELINE = [
    'Applied',
    'Shortlisted',
    'Interview',
    'HR Round',
    'Finalized'
];

export const STAGE_COLORS = {
    'Applied': 'bg-blue-50 text-blue-700 border-blue-100',
    'Shortlisted': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'Interview': 'bg-purple-50 text-purple-700 border-purple-100',
    'HR Round': 'bg-pink-50 text-pink-700 border-pink-100',
    'Finalized': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Rejected': 'bg-rose-50 text-rose-700 border-rose-100',
    'default': 'bg-slate-50 text-slate-700 border-slate-100'
};

export const getNextStage = (currentStage, workflow = DEFAULT_PIPELINE) => {
    const idx = workflow.indexOf(currentStage);
    if (idx !== -1 && idx < workflow.length - 1) {
        return workflow[idx + 1];
    }
    return 'Finalized';
};

export const getPreviousStage = (currentStage, workflow = DEFAULT_PIPELINE) => {
    const idx = workflow.indexOf(currentStage);
    if (idx > 0) {
        return workflow[idx - 1];
    }
    return null;
};

export const isTerminalStage = (stage) => {
    return ['Finalized', 'Rejected', 'Selected'].includes(stage);
};


export const INTERVIEW_VARIANTS = ['Interview Scheduled', 'Interview Rescheduled', 'Interview Completed', 'New Round'];

export const normalizeStatus = (status) => {
    if (INTERVIEW_VARIANTS.includes(status)) return 'Interview';
    return status;
};

export const getStageColor = (stage) => {
    return STAGE_COLORS[stage] || STAGE_COLORS['default'];
};
