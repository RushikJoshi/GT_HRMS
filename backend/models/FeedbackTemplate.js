const mongoose = require('mongoose');

const FeedbackFieldSchema = new mongoose.Schema({
    label: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'paragraph', 'rating', 'yes_no', 'dropdown'],
        required: true
    },
    required: { type: Boolean, default: false },
    options: [String], // For dropdown
    placeholder: String
});

const FeedbackTemplateSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: String,

    // Linking
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement' },
    stageId: { type: String }, // Can be the internal ID of the stage in the pipeline

    fields: [FeedbackFieldSchema],

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, collection: 'feedback_templates' });

module.exports = FeedbackTemplateSchema;
