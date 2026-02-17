const mongoose = require('mongoose');

const generatedLetterSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    applicantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Applicant',
        required: false
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: false
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LetterTemplate'
    },

    // Type info
    letterType: {
        type: String, // generic type string
        required: true
    },

    // Snapshot of the data used to generate this specific letter
    // generic object to support any placeholder data
    snapshotData: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },

    // Snapshot of the template used (for versioning/audit)
    templateSnapshot: {
        bodyContent: String,
        contentJson: Object,
        templateType: String,
        filePath: String,
        version: String
    },

    // File Details
    pdfPath: {
        type: String,
        required: true
    },
    pdfUrl: {
        type: String,
        required: true
    },

    // Status Flow
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected', 'generated', 'issued', 'sent', 'viewed', 'accepted', 'rejected_by_candidate', 'expired', 'revoked'],
        default: 'draft'
    },

    // Tracking info
    tracking: {
        viewCount: { type: Number, default: 0 },
        downloadCount: { type: Number, default: 0 },
        lastViewedAt: Date,
    },

    // Metadata
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sentAt: { type: Date },
    acceptedAt: { type: Date }

}, { timestamps: true });

generatedLetterSchema.index({ pdfPath: 1 });
generatedLetterSchema.index({ tenantId: 1, applicantId: 1 });
generatedLetterSchema.index({ tenantId: 1, letterType: 1 });

// Multi-tenant fix: Export ONLY Schema (not mongoose.model)
module.exports = generatedLetterSchema;

