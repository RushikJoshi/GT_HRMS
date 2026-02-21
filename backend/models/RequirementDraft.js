const mongoose = require('mongoose');

const RequirementDraftSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    currentStep: { type: Number, default: 1 },
    status: { type: String, default: 'Draft' },

    // Step 1: Position selection
    step1: {
        positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position' },
        department: String,
        jobType: String,
        workMode: String,
        location: String,
        vacancy: Number
    },

    // Step 2: Job Basic Details
    step2: {
        jobTitle: String,
        salaryMin: Number,
        salaryMax: Number,
        experienceMin: Number,
        experienceMax: Number,
        priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'] },
        visibility: { type: String, enum: ['Internal', 'External', 'Both'] },
        hiringManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        interviewPanel: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }]
    },

    // Step 3: Job Description & Requirements
    step3: {
        description: String,
        responsibilities: [String],
        requiredSkills: [String],
        optionalSkills: [String],
        education: String,
        certifications: [String],
        keywords: [String]
    },

    // Step 4: Pipeline Configuration
    step4: {
        pipelineStages: [{
            stageId: String,
            stageName: String,
            stageType: { type: String, enum: ['Screening', 'Interview', 'Assessment', 'HR', 'Offer', 'Custom', 'Finalized', 'Round', 'Technical', 'Management', 'System'] },
            assignedInterviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
            mode: { type: String, enum: ['Online', 'Offline', 'Telephonic', 'Virtual', 'In-person'] },
            durationMinutes: Number,
            feedbackFormId: String,
            evaluationCriteria: [String],
            orderIndex: Number,
            isSystemStage: Boolean
        }]
    },

    createdAt: { type: Date, default: Date.now, expires: 86400 * 7 } // Auto-delete drafts after 7 days
}, { timestamps: true });

module.exports = RequirementDraftSchema;
