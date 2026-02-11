const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true, required: true },
  jobTitle: { type: String, trim: true, required: true },
  department: { type: String, trim: true, required: true },
  vacancy: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  visibility: { type: String, enum: ['Internal', 'External', 'Both'], default: 'External' },
  updatedAt: { type: Date, default: Date.now },
  jobOpeningId: { type: String, index: true }, // Auto-generated ID (e.g., JOB-0001)
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', index: true },
  position: { type: String, trim: true },
  publicFields: { type: [String], default: [] },
  workflow: { type: [String], default: ['Applied', 'Shortlisted', 'Interview', 'Finalized'] },
  bannerImage: { type: String } // Path to uploaded image
}, { strict: false, collection: 'requirements', timestamps: true });

module.exports = RequirementSchema;