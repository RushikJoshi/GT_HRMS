const { getTenantDB } = require('../config/dbManager');

exports.registerStep2 = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const db = getTenantDB(tenantId);
        const VendorBankDetails = db.model('VendorBankDetails');
        const VendorRegistration = db.model('VendorRegistration');

        const { vendorId } = req.body;

        // Verify vendor exists
        const vendor = await VendorRegistration.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ success: false, message: 'Invalid Vendor ID' });
        }

        const bankData = {
            ...req.body,
            tenantId
        };

        // Check if bank details already exist for this vendor, if so update, else create
        let bankDetails = await VendorBankDetails.findOne({ vendorId });
        if (bankDetails) {
            Object.assign(bankDetails, bankData);
            await bankDetails.save();
        } else {
            bankDetails = new VendorBankDetails(bankData);
            await bankDetails.save();
        }

        res.status(201).json({
            success: true,
            message: 'Vendor Bank Details saved successful',
            data: bankDetails
        });
    } catch (error) {
        console.error('Error in Vendor Step 2:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error occurred during bank details submission'
        });
    }
};
