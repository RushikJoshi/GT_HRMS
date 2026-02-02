const mongoose = require('mongoose');

const LeavePolicySchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // Simple compatibility fields (for quick UI+import) ✅
    leaveTypes: [{ type: String, trim: true }], // e.g. ['SL','CL','PL']
    yearlyLimit: { type: Number, default: 0 },
    carryForward: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },

    // Who does this policy apply to?
    applicableTo: {
        type: String,
        enum: ['All', 'Department', 'Role', 'Specific'],
        default: 'All'
    },
    // If specific departments or roles
    departmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    roles: [{ type: String, trim: true }],

    effectiveFrom: { type: Date, default: Date.now },
    expiryDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Employee type applicability & encashment rules
    encashmentAllowed: { type: Boolean, default: false },
    minimumTenureRequiredMonths: { type: Number, default: 0 }, // e.g., 3 months before eligible
    applicableEmployeeTypes: [{ type: String, enum: ['Full-time', 'Contract', 'Probation', 'Part-time'] }],

    // Array of rules defined in this policy
    rules: [{
        leaveType: { type: String, required: true, trim: true }, // e.g. "CL", "SL", "LWP"
        totalPerYear: { type: Number, default: 0 },
        monthlyAccrual: { type: Boolean, default: false }, // If true, adds Total/12 every month
        accrualType: { type: String, enum: ['yearly', 'monthly'], default: 'yearly' },
        carryForwardAllowed: { type: Boolean, default: false },
        maxCarryForward: { type: Number, default: 0 },
        encashmentAllowed: { type: Boolean, default: false },
        requiresApproval: { type: Boolean, default: true },
        allowDuringProbation: { type: Boolean, default: false }, // If false, 0 balance during probation
        minimumTenureMonths: { type: Number, default: 0 },
        color: { type: String, default: '#3b82f6' } // Default blue-500
    }]
}, { timestamps: true });

LeavePolicySchema.index({ tenant: 1, name: 1 });

// ❗ MULTI-TENANT FIX
// Do NOT export mongoose.model()
// Only export Schema
module.exports = LeavePolicySchema;
