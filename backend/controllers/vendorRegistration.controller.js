const { getTenantDB } = require('../config/dbManager');

exports.registerStep1 = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const db = getTenantDB(tenantId);
        const VendorRegistration = db.model('VendorRegistration');

        const vendorData = {
            ...req.body,
            tenantId,
            createdBy: req.user?._id
        };

        const vendor = new VendorRegistration(vendorData);
        await vendor.save();

        res.status(201).json({
            success: true,
            message: 'Vendor Registration Step 1 successful',
            data: vendor
        });
    } catch (error) {
        console.error('Error in Vendor Step 1:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error occurred during registration'
        });
    }
};

exports.getVendor = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const db = getTenantDB(tenantId);
        const VendorRegistration = db.model('VendorRegistration');
        const VendorBankDetails = db.model('VendorBankDetails');

        const vendor = await VendorRegistration.findById(req.params.id);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        const bankDetails = await VendorBankDetails.findOne({ vendorId: vendor._id });

        res.json({
            success: true,
            data: {
                ...vendor.toObject(),
                bankDetails
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.listVendors = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const db = getTenantDB(tenantId);
        const VendorRegistration = db.model('VendorRegistration');

        const vendors = await VendorRegistration.find({ tenantId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: vendors
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
