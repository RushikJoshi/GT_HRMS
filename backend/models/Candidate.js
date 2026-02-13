const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    mobile: { type: String, trim: true },

    // Profile Information
    resume: { type: String }, // Path to default resume
    fatherName: { type: String, trim: true },
    address: { type: String },
    dob: { type: Date },
    profilePic: { type: String }, // Path to profile picture
    professionalTier: { type: String, default: 'Technical Leader' }, // New field for profile customization

    // 🔐 Identity Verification Fields (Required for OCR Validation)
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true, uppercase: true },

    // Additional data
    metadata: { type: Object, default: {} },

    // Meta
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique email PER TENANT
CandidateSchema.index({ tenant: 1, email: 1 }, { unique: true });

module.exports = CandidateSchema;
