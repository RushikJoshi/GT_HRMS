const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true, required: true },
  jobTitle: { type: String, trim: true, required: true },
  department: { type: String, trim: true, required: true },
  vacancy: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  visibility: { type: String, enum: ['Internal', 'External', 'Both'], default: 'External' },
  jobOpeningId: { type: String, index: true }, // Auto-generated ID (e.g., JOB-0001)
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', index: true },
  position: { type: String, trim: true },
  publicFields: { type: [String], default: [] },
  workflow: { type: [String], default: ['Applied', 'Shortlisted', 'Interview', 'Finalized'] },
  isReplacement: { type: Boolean, default: false },
  replacementId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReplacementRequest' },
  approvalStatus: { type: String, default: 'Pending' }, // For requisition approval
  hiringStatus: { type: String, default: 'Open' } // Open, Closed, etc.
}, { strict: false, collection: 'requirements', timestamps: true });

module.exports = RequirementSchema;