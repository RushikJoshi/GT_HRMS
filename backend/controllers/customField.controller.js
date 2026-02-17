const mongoose = require('mongoose');
const CustomFieldDefinitionSchema = require('../models/CustomFieldDefinition'); // Assuming it's in models (it might be in index where you load all schemas, but we'll adapt)

// Create model on the fly if needed per multi-tenant structure, or as global model
const GlobalCustomFieldDef = mongoose.models.CustomFieldDefinition || mongoose.model('CustomFieldDefinition', CustomFieldDefinitionSchema);

exports.getAll = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const fields = await GlobalCustomFieldDef.find({
            tenant: tenantId,
            isActive: true
        }).sort({ order: 1 });

        res.json(fields);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const newField = new GlobalCustomFieldDef({
            ...req.body,
            tenant: tenantId,
            createdBy: req.user.id
        });

        await newField.save();
        res.status(201).json(newField);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await GlobalCustomFieldDef.findOneAndUpdate(
            { _id: req.params.id, tenant: tenantId },
            { $set: req.body },
            { new: true }
        );

        if (!result) return res.status(404).json({ message: 'Resource not found' });
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        // Soft delete
        const result = await GlobalCustomFieldDef.findOneAndUpdate(
            { _id: req.params.id, tenant: tenantId },
            { $set: { isActive: false } },
            { new: true }
        );
        res.json({ message: 'Deactivated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
