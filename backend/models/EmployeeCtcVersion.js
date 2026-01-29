const mongoose = require('mongoose');

const EmployeeCtcVersionSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    version: {
        type: Number,
        required: true,
        default: 1
    },
    effectiveFrom: {
        type: Date,
        required: true,
        default: Date.now
    },
    grossA: {
        type: Number,
        default: 0
    },
    grossB: {
        type: Number,
        default: 0
    },
    grossC: {
        type: Number,
        default: 0
    },
    totalCTC: {
        type: Number,
        required: true,
        default: 0
    },
    components: [{
        name: String,
        code: String,
        monthlyAmount: Number,
        annualAmount: Number,
        type: { type: String, enum: ['EARNING', 'DEDUCTION', 'BENEFIT'] },
        isTaxable: { type: Boolean, default: true },
        isProRata: { type: Boolean, default: true }
    }],
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE',
        uppercase: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    collection: 'employee_ctc_versions'
});

// Pre-save hook to normalize status to uppercase
EmployeeCtcVersionSchema.pre('save', function(next) {
    if (this.status) {
        this.status = this.status.toUpperCase();
    }
    next();
});

// Index for version control
EmployeeCtcVersionSchema.index({ employeeId: 1, version: -1 });
EmployeeCtcVersionSchema.index({ companyId: 1, employeeId: 1, isActive: 1, status: 1 });

module.exports = EmployeeCtcVersionSchema;
