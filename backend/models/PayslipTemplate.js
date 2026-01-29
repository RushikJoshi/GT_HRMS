const mongoose = require('mongoose');

const payslipTemplateSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    templateType: {
        type: String,
        enum: ['HTML', 'WORD'],
        default: 'HTML'
    },
    htmlContent: {
        type: String,
        required: function () { return this.templateType === 'HTML'; }
    },
    filePath: {
        type: String,
        required: function () { return this.templateType === 'WORD'; }
    },
    placeholders: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure only one default template per tenant
payslipTemplateSchema.index({ tenant: 1, isDefault: 1 }, {
    unique: true,
    partialFilterExpression: { isDefault: true }
});

// Tenant + name unique
payslipTemplateSchema.index({ tenant: 1, name: 1 }, { unique: true });

module.exports = payslipTemplateSchema;
