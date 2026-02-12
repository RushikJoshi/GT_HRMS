const { getTenantDB } = require('../config/dbManager');

// Get configuration
exports.getConfig = async (req, res) => {
    try {
        const { formType } = req.params;
        const tenantId = req.tenantId;
        const db = getTenantDB(tenantId);
        const VendorFormConfig = db.model('VendorFormConfig');

        const config = await VendorFormConfig.findOne({ formType, tenantId });
        if (!config) {
            return res.json({ success: true, data: null });
        }
        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Get config error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const mongoose = require('mongoose');

// Save configuration
exports.saveConfig = async (req, res) => {
    try {
        const { formType } = req.params;
        const tenantId = req.tenantId;

        if (!tenantId) {
            console.error('[VENDOR_CONFIG] Save failed: No tenantId found in request');
            return res.status(400).json({ success: false, error: "Tenant ID missing" });
        }

        const db = getTenantDB(tenantId);
        const VendorFormConfig = db.model('VendorFormConfig');

        let configData = { ...req.body };

        // Clean up root data
        delete configData._id;
        delete configData.__v;
        configData.formType = formType;
        configData.tenantId = new mongoose.Types.ObjectId(tenantId);
        configData.lastUpdated = Date.now();

        // Recursively clean fields and sections to prevent sub-document ID conflicts
        if (Array.isArray(configData.fields)) {
            configData.fields = configData.fields.map(f => {
                const { _id, ...rest } = f;
                return rest;
            });
        }
        if (Array.isArray(configData.sections)) {
            configData.sections = configData.sections.map(s => {
                const { _id, ...rest } = s;
                return rest;
            });
        }

        console.log(`[VENDOR_CONFIG] Saving config for tenant ${tenantId}, form ${formType}`);

        const updatedConfig = await VendorFormConfig.findOneAndUpdate(
            { formType, tenantId: configData.tenantId },
            { $set: configData },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ success: true, data: updatedConfig });
    } catch (error) {
        console.error('[VENDOR_CONFIG] Save config error:', error);
        res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
};
