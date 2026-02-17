const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true, required: true },

  // Linked Position
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', index: true, required: true },
  jobOpeningId: { type: String, required: true, unique: true, immutable: true, index: true }, // Auto-generated ID

  // Core Details (Snapshot from Position but editable if needed/overridden)
  jobTitle: { type: String, trim: true, required: true },
  department: { type: String, trim: true, required: true },

  // Hiring Configuration
  vacancy: { type: Number, required: true, min: 1 },
  filled: { type: Number, default: 0 },
  status: { type: String, enum: ['Open', 'Closed', 'Draft', 'PendingApproval', 'Hold'], default: 'Open' },

  workMode: { type: String, default: 'On-site' },
  jobType: { type: String, default: 'Full Time' },
  priority: { type: String, default: 'Medium' },
  visibility: { type: String, default: 'External' },

  // Experience
  minExperienceMonths: { type: Number, default: 0 },
  maxExperienceMonths: { type: Number, default: 0 },

  // Salary
  salaryMin: { type: Number, default: 0 },
  salaryMax: { type: Number, default: 0 },
  salaryCurrency: { type: String, default: 'INR' },
  isSalaryOverride: { type: Boolean, default: false },
  remarks: { type: String, trim: true },

  // Description & Skills
  description: { type: String, trim: true, minlength: 50 }, // Role Overview
  responsibilities: { type: [String], default: [] }, // Array of strings
  requiredSkills: { type: [String], default: [] },
  preferredSkills: { type: [String], default: [] },
  qualifications: { type: [String], default: [] }, // Education/Certs
  targetKeywords: { type: [String], default: [] }, // Specific keywords for search/matching
  benefits: { type: [String], default: [] },

  // Workflow
  workflow: { type: [String], default: ['Applied', 'Shortlisted', 'Interview', 'Finalized'] },
  detailedWorkflow: [{
    stageName: { type: String, required: true },
    stageType: { type: String, enum: ['Applied', 'Shortlisted', 'Screening', 'Interview', 'Assessment', 'HR', 'Discussion', 'Finalized', 'Rejected'], default: 'Interview' },
    assignedInterviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      set: v => (v === "" || v === "null") ? null : v
    },
    interviewMode: { type: String, enum: ['Online', 'Offline', 'Telephonic'], default: 'Online' },
    durationMinutes: { type: Number, default: 30 },
    notes: { type: String },
    positionIndex: { type: Number }
  }],

  // Metadata
  publicFields: { type: [String], default: [] },
  customFields: {
    type: [{
      label: String,
      key: String,
      value: mongoose.Schema.Types.Mixed,
      type: { type: String, default: 'text' },
      isPublic: { type: Boolean, default: true },
      isAdHoc: { type: Boolean, default: false }
    }], default: []
  },
  bannerImage: { type: String },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: { type: Date },
  closedAt: { type: Date },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { strict: false, collection: 'requirements', timestamps: true });

module.exports = RequirementSchema;