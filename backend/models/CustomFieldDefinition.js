const mongoose = require('mongoose');

const CustomFieldDefinitionSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    key: {
        type: String,
        required: true,
        trim: true,
        match: /^[a-zA-Z0-9_]+$/ // camelCase or snake_case only
    },
    type: {
        type: String,
        enum: ['text', 'number', 'textarea', 'dropdown', 'checkbox', 'date', 'multiSelect'],
        default: 'text'
    },
    section: {
        type: String,
        default: 'Additional Specifications' // Can expand to 'Candidate Info', 'Offer Details' later
    },
    isRequired: {
        type: Boolean,
        default: false
    },
    isPublic: {
        type: Boolean,
        default: true
    }, // Visible on careers page?
    placeholder: {
        type: String,
        trim: true
    },
    defaultValue: {
        type: mongoose.Schema.Types.Mixed
    },
    options: {
        type: [String],
        default: [] // Only for dropdown/multiSelect
    },
    validationRegex: {
        type: String
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Compound index to ensure keys are unique per tenant
CustomFieldDefinitionSchema.index({ tenant: 1, key: 1 }, { unique: true });

module.exports = CustomFieldDefinitionSchema;
