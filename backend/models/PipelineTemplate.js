const mongoose = require('mongoose');

const TemplateStageSchema = new mongoose.Schema({
    stageName: { type: String, required: true },
    stageType: {
        type: String,
        enum: ['Screening', 'Interview', 'Assessment', 'HR', 'Discussion', 'Finalized', 'Applied', 'Rejected'],
        default: 'Interview'
    },
    durationMinutes: { type: Number, default: 30 },
    description: { type: String },
    isMandatory: { type: Boolean, default: false }
});

const PipelineTemplateSchema = new mongoose.Schema({
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    stages: [TemplateStageSchema],
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, collection: 'pipeline_templates' });

module.exports = PipelineTemplateSchema;
