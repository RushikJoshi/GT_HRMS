const mongoose = require('mongoose');

/**
 * BGV Document Model
 * Stores all documents uploaded by candidates for BGV
 * Implements versioning and soft-delete (no hard deletes)
 */
const BGVDocumentSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BGVCase',
        required: true,
        index: true
    },
    checkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BGVCheck',
        index: true
    },
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        index: true
    },

    // Document Classification
    documentType: {
        type: String,
        enum: [
            'AADHAAR',
            'PAN',
            'PASSPORT',
            'DRIVING_LICENSE',
            'VOTER_ID',
            'DEGREE_CERTIFICATE',
            'MARKSHEET',
            'EXPERIENCE_LETTER',
            'PAYSLIP',
            'RELIEVING_LETTER',
            'ADDRESS_PROOF',
            'POLICE_VERIFICATION',
            'REFERENCE_LETTER',
            'PASSPORT_PHOTO',
            'OTHER'
        ],
        required: true,
        index: true
    },

    // File Information
    fileName: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number
    },
    mimeType: {
        type: String
    },

    // Versioning
    version: {
        type: Number,
        default: 1
    },
    previousVersionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BGVDocument'
    },

    // Status
    status: {
        type: String,
        enum: ['UPLOADED', 'UNDER_REVIEW', 'REVIEWED', 'VERIFIED', 'REJECTED', 'REPLACED'],
        default: 'UPLOADED'
    },

    // 🔐 DOCUMENT INTEGRITY (NEW - CRITICAL FOR COMPLIANCE)
    documentHash: {
        type: String, // SHA-256 hash of file content
        index: true
    },
    hashAlgorithm: {
        type: String,
        default: 'SHA256'
    },
    hashGeneratedAt: Date,

    // 🔐 REVIEW STATUS (NEW - CRITICAL FOR EVIDENCE VALIDATION)
    reviewStatus: {
        status: {
            type: String,
            enum: ['PENDING', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'REQUIRES_REUPLOAD'],
            default: 'PENDING'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: Date,
        reviewRemarks: String,
        rejectionReason: String,
        qualityScore: Number, // 0-100, based on OCR confidence or manual assessment
        isComplete: {
            type: Boolean,
            default: false
        },
        isLegible: {
            type: Boolean,
            default: true
        },
        meetsRequirements: {
            type: Boolean,
            default: false
        }
    },

    // 🔐 EVIDENCE VALIDATION METADATA (NEW)
    evidenceMetadata: {
        documentDate: Date, // Extracted or manually entered document date
        expiryDate: Date, // For documents with expiry
        issuerName: String, // e.g., University name, Employer name
        documentNumber: String, // e.g., Aadhaar number, PAN number (encrypted)
        extractedText: String, // OCR extracted text
        ocrConfidence: Number, // 0-1
        validationFlags: [{
            flag: String,
            severity: {
                type: String,
                enum: ['INFO', 'WARNING', 'ERROR']
            },
            message: String
        }]
    },

    // Upload Information
    uploadedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        userRole: String
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Verification Information
    verifiedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String
    },
    verifiedAt: {
        type: Date
    },
    verificationRemarks: {
        type: String
    },

    // Soft Delete (No hard deletes allowed)
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String
    },
    deletedAt: {
        type: Date
    },
    deletionReason: {
        type: String
    },

    // Metadata
    metadata: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true,
    collection: 'bgv_documents'
});

// Indexes
BGVDocumentSchema.index({ tenant: 1, caseId: 1, documentType: 1 });
BGVDocumentSchema.index({ tenant: 1, candidateId: 1 });
BGVDocumentSchema.index({ isDeleted: 1, status: 1 });

// Prevent hard delete
BGVDocumentSchema.pre('remove', function (next) {
    next(new Error('Hard delete not allowed. Use soft delete by setting isDeleted=true'));
});

module.exports = BGVDocumentSchema;
