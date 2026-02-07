const mongoose = require('mongoose');

const BGVCheckSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BGVCase',
        required: true,
        index: true
    },
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['IDENTITY', 'ADDRESS', 'EDUCATION', 'EMPLOYMENT', 'CRIMINAL', 'REFERENCE', 'SOCIAL_MEDIA'],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'VERIFIED', 'FAILED', 'DISCREPANCY'],
        default: 'NOT_STARTED',
        index: true
    },

    // Verification Mode
    mode: {
        type: String,
        enum: ['MANUAL', 'VENDOR', 'API', 'FIELD_AGENT'],
        default: 'MANUAL'
    },

    // SLA Management
    slaDays: {
        type: Number,
        default: 5
    },
    dueDate: {
        type: Date
    },
    isOverdue: {
        type: Boolean,
        default: false
    },

    // Assignment
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: {
        type: Date
    },

    // Document Management (Versioned, No Delete)
    documents: [{
        name: String,
        originalName: String,
        path: String,
        version: Number,
        fileSize: Number,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: String,
        uploadedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isDeleted: { type: Boolean, default: false }, // Soft delete only
        deletedAt: Date,
        deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Remarks (Segregated)
    internalRemarks: {
        type: String // Only visible to HR/Verifiers
    },
    candidateRemarks: {
        type: String // Visible to candidate
    },

    // Verification Details
    verificationDetails: {
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: Date,
        verificationMethod: String, // e.g., "API", "Manual Call", "Field Visit"
        evidencePath: String,
        crossCheckData: Object // Store verification response data
    },

    // Reports
    verificationReport: {
        path: String,
        generatedAt: Date
    },

    // Vendor Integration
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BGVVendor'
    },
    vendorReference: {
        type: String
    },
    vendorResponse: {
        type: Object // Store vendor API response
    },

    // Timeline Events
    timeline: [{
        event: String,
        description: String,
        performedBy: String,
        performedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        oldStatus: String,
        newStatus: String,
        metadata: Object
    }],

    // Audit Fields
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },

    // Metadata
    meta: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true,
    collection: 'bgv_checks'
});

// Indexes for performance
BGVCheckSchema.index({ caseId: 1, status: 1 });
BGVCheckSchema.index({ tenant: 1, type: 1 });
BGVCheckSchema.index({ assignedTo: 1, status: 1 });

// Middleware to calculate SLA
BGVCheckSchema.pre('save', function (next) {
    // Set due date on creation
    if (this.isNew && this.slaDays) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + this.slaDays);
        this.dueDate = dueDate;
    }

    // Check if overdue
    if (this.dueDate && !this.completedAt) {
        this.isOverdue = new Date() > this.dueDate;
    }

    // Set startedAt when status changes from NOT_STARTED
    if (this.isModified('status') && this.status !== 'NOT_STARTED' && !this.startedAt) {
        this.startedAt = new Date();
    }

    // Set completedAt when status becomes VERIFIED or FAILED
    if (this.isModified('status') && ['VERIFIED', 'FAILED'].includes(this.status) && !this.completedAt) {
        this.completedAt = new Date();
    }

    next();
});

// Virtual for active documents (non-deleted)
BGVCheckSchema.virtual('activeDocuments').get(function () {
    return this.documents.filter(doc => !doc.isDeleted);
});

module.exports = BGVCheckSchema;
