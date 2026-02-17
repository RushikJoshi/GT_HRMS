const mongoose = require('mongoose');

const JobStageSchema = new mongoose.Schema({
    stageName: { type: String, required: true },
    stageType: {
        type: String,
        enum: ['Applied', 'Shortlisted', 'Screening', 'Interview', 'Assessment', 'HR', 'Discussion', 'Finalized', 'Rejected'],
        default: 'Interview'
    },
    positionIndex: { type: Number, required: true },

    // Configuration
    durationMinutes: { type: Number, default: 30 },
    mode: { type: String, enum: ['Online', 'Office', 'Hybrid'], default: 'Office' },
    evaluationNotes: { type: String },

    // Interviewer Assignment
    interviewerIds: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
        set: v => Array.isArray(v) ? v.filter(id => id && id !== "" && id !== "null") : v
    },
    assignedInterviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
        // 🚀 SANITIZER: Convert empty strings to null at the schema level
        set: v => (v === "" || v === "null") ? null : v
    },

    // Feedback Configuration
    feedbackTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeedbackTemplate', set: v => (v === "" ? null : v) },

    // Meta
    isLocked: { type: Boolean, default: false }
});

const JobPipelineSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true, index: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'PipelineTemplate' },

    stages: [JobStageSchema],

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, collection: 'job_pipelines' });

module.exports = JobPipelineSchema;
