const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant', required: true, index: true },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },

    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    applicationReadableId: { type: String },

    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true },
    jobTitle: { type: String, required: true },
    department: { type: String },
    location: { type: String },

    salary: { type: Number, required: true },
    salaryStructure: { type: Object }, // Detailed breakdown (Legacy/Simple)
    salarySnapshot: { type: Object }, // Complex breakdown for workflow

    status: {
        type: String,
        enum: ['Sent', 'Accepted', 'ReOffered', 'Expired', 'Rejected', 'Draft', 'Revoked', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
        default: 'Sent'
    },

    offerDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    reofferCount: { type: Number, default: 0 },

    // Letter & Files
    offerCode: { type: String }, // Human-readable ID (Legacy)
    offerId: { type: String }, // Human-readable ID (Workflow)
    letterPath: { type: String },
    letterUrl: { type: String },
    pdfUrl: { type: String },

    // Public Access
    token: { type: String },
    tokenExpiry: { type: Date },

    // Additional Details
    joiningDate: { type: Date },
    rejectionReason: { type: String },
    ipAddress: { type: String },

    // Workflow Specifics
    candidateInfo: { type: Object },
    jobDetails: { type: Object },
    probationPeriod: { type: Number },
    noticePeriod: { type: Number },
    workingDays: { type: String },
    workingHours: { type: String },
    benefits: { type: Array },
    specialTerms: { type: Array },

    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeReadableId: { type: String },

    // Audit & Lifecycle
    isLatest: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    history: [{
        action: String,
        status: String,
        by: String,
        timestamp: { type: Date, default: Date.now },
        metadata: Object
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    strict: false // Allow dynamic growth for complex workflows
});

// Update timestamps on save
OfferSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

/**
 * Methods for Status Transitions (Recruitment Workflow Compatibility)
 */
OfferSchema.methods.send = function (userId, userName) {
    if (!['Draft', 'DRAFT'].includes(this.status)) {
        throw new Error(`Cannot send offer in ${this.status} status`);
    }
    this.status = 'SENT';
    this.offerDate = new Date();
    this.history.push({
        action: 'Sent',
        status: 'SENT',
        by: userName,
        timestamp: new Date()
    });
};

OfferSchema.methods.accept = function (notes = null) {
    if (!['Sent', 'SENT', 'ReOffered'].includes(this.status)) {
        throw new Error(`Cannot accept offer in ${this.status} status`);
    }
    this.status = 'ACCEPTED';
    this.acceptedAt = new Date();
    this.history.push({
        action: 'Accepted',
        status: 'ACCEPTED',
        by: 'Candidate',
        timestamp: new Date(),
        metadata: { notes }
    });
};

OfferSchema.methods.reject = function (reason, notes = null) {
    if (!['Sent', 'SENT', 'ReOffered'].includes(this.status)) {
        throw new Error(`Cannot reject offer in ${this.status} status`);
    }
    this.status = 'REJECTED';
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    this.history.push({
        action: 'Rejected',
        status: 'REJECTED',
        by: 'Candidate',
        timestamp: new Date(),
        metadata: { reason, notes }
    });
};

OfferSchema.virtual('canCreateEmployee').get(function () {
    return (this.status === 'ACCEPTED' || this.status === 'Accepted') && !this.employeeId;
});

// For backward compatibility
OfferSchema.virtual('acceptedDate').get(function () {
    return this.acceptedAt;
});

OfferSchema.methods.linkEmployee = function (employeeId, employeeReadableId) {
    this.employeeId = employeeId;
    this.employeeReadableId = employeeReadableId;
    this.status = 'JOINED';
    this.history.push({
        action: 'Joined',
        status: 'JOINED',
        by: 'System',
        timestamp: new Date()
    });
};

module.exports = OfferSchema;
