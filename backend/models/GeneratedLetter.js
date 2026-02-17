const mongoose = require('mongoose');

const GeneratedLetterSchema = new mongoose.Schema({
    applicantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Applicant',
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },

    // Letter Metadata
    letterIndex: {
        type: String,
        unique: true
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },

    // Type info
    letterType: {
        type: String, // generic type string
        required: true
    },

    // Snapshot of the data used to generate this specific letter
    snapshotData: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },

    // Template Info (Immutable Snapshot)
    templateSnapshot: {
        name: String,
        bodyContent: String,
        headerContent: String,
        footerContent: String,
        version: Number
    },

    // PDF Info
    pdfPath: String,
    fileName: String,
    fileSize: Number,

    // Status Flow
    status: {
        type: String,
        enum: ['Pending', 'Signed', 'Accepted', 'draft', 'pending', 'approved', 'rejected', 'generated', 'issued', 'sent', 'viewed', 'accepted', 'rejected_by_candidate', 'expired', 'revoked'],
        default: 'Pending'
    },
    acceptedAt: Date,

    // Tracking info
    tracking: {
        ip: String,
        userAgent: String,
        viewCount: { type: Number, default: 0 },
        lastViewedAt: Date
    }

}, { timestamps: true });

// Pre-save to generate letterIndex if not exist
GeneratedLetterSchema.pre('save', function (next) {
    if (!this.letterIndex) {
        this.letterIndex = 'LTR-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now();
    }
    next();
});

module.exports = mongoose.model('GeneratedLetter', GeneratedLetterSchema);
