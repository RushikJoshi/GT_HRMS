const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  date: { type: Date, required: true, index: true },

  // High-Level Status
  status: {
    type: String,
    enum: ['present', 'absent', 'leave', 'holiday', 'weekly_off', 'half_day', 'missed_punch'],
    default: 'absent'
  },
  leaveType: { type: String },
  leaveColor: { type: String },

  // Punch Details
  checkIn: { type: Date },
  checkOut: { type: Date },

  // Multi-punch log (for detailed audit)
  logs: [{
    time: { type: Date },
    type: { type: String, enum: ['IN', 'OUT'] },
    device: { type: String },
    location: { type: String }
  }],

  // Calculated Metrics
  workingHours: { type: Number, default: 0 }, // In hours
  overtimeHours: { type: Number, default: 0 }, // Overtime hours (calculated if overtime is enabled)
  isLate: { type: Boolean, default: false },
  isEarlyOut: { type: Boolean, default: false },

  // Advanced Metrics (non-breaking additions)
  lateMinutes: { type: Number, default: 0 },          // Minutes late beyond shift start
  earlyExitMinutes: { type: Number, default: 0 },     // Minutes early before shift end

  // Advanced Policy Flags (WFH / OD / Comp-off / Night Shift)
  isWFH: { type: Boolean, default: false },           // Work From Home day
  isOnDuty: { type: Boolean, default: false },        // On Duty day
  isCompOffDay: { type: Boolean, default: false },    // Comp-off consumed today
  isNightShift: { type: Boolean, default: false },    // Shift spans past midnight

  // Loss of Pay (derived) – fraction of day converted to LOP (e.g., 0.5, 1)
  lopDays: { type: Number, default: 0 },

  // Rules Engine Traceability
  ruleEngineVersion: { type: Number, default: 1 },
  ruleEngineMeta: { type: mongoose.Schema.Types.Mixed },

  // Metadata
  isManualOverride: { type: Boolean, default: false },
  overrideReason: { type: String },
  locked: { type: Boolean, default: false }, // Prevent edits after payroll processing

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
}, { timestamps: true });

// Compound index for unique attendance per day per employee
AttendanceSchema.index({ tenant: 1, employee: 1, date: 1 }, { unique: true });

module.exports = AttendanceSchema;
