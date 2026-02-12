const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
    id: String,
    label: String,
    placeholder: String,
    fieldType: String, // text, number, email, textarea, select, date, file, checkbox
    required: { type: Boolean, default: false },
    width: { type: String, default: 'full' },
    section: String,
    order: Number,
    isSystem: { type: Boolean, default: false },
    dbKey: String, // Maps to backend field
    dropdownOptions: [{ label: String, value: String }]
}, { strict: false });

const SectionSchema = new mongoose.Schema({
    id: String,
    title: String,
    order: Number
}, { strict: false });

const VendorFormConfigSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    formType: { type: String, required: true }, // 'step1' or 'step2'
    sections: [SectionSchema],
    fields: [FieldSchema],
    lastUpdated: { type: Date, default: Date.now }
}, { strict: false });

// Compound unique index: Each tenant has one config per formType
VendorFormConfigSchema.index({ tenantId: 1, formType: 1 }, { unique: true });

module.exports = VendorFormConfigSchema;
