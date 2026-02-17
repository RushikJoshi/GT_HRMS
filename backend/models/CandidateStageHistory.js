const mongoose = require('mongoose');

const CandidateStageHistorySchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant', required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true },

    fromStage: { type: String },
    toStage: { type: String, required: true },

    action: { type: String, enum: ['Move', 'Revert', 'Initial'], default: 'Move' },
    notes: { type: String },

    movedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    movedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'candidate_stage_history' });

module.exports = CandidateStageHistorySchema;
