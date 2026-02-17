const mongoose = require('mongoose');

const CandidateStageFeedbackSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant', required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true, index: true },
    stageId: { type: String, required: true }, // The stage identity in the JobPipeline

    interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    interviewerName: String,
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeedbackTemplate' },

    answers: [{
        fieldLabel: String,
        fieldType: String,
        value: mongoose.Schema.Types.Mixed
    }],

    decision: {
        type: String,
        enum: ['Pass', 'Reject', 'Hold'],
        required: true
    },
    comments: String,

    submittedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'candidate_stage_feedback' });

CandidateStageFeedbackSchema.index({ candidateId: 1, stageId: 1 }, { unique: true });

module.exports = CandidateStageFeedbackSchema;
