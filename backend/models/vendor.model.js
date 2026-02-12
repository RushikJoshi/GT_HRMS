const mongoose = require('mongoose');

const VendorRegistrationSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    // Exact fields from Screenshot
    vendorName: { type: String, required: true, trim: true },
    pinCode: { type: String, required: true },
    city: { type: String, required: true },
    regionState: { type: String, required: true },

    bankCountry: { type: String, required: true },
    bankName: { type: String, required: true },
    bankBranchAndAddress: { type: String, required: true },
    accountHolderName: { type: String, required: true },
    micrCode: { type: String },
    ifscCode: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankAccountTitle: {
        type: String,
        enum: ['Cash Credit', 'Current', 'Saving', 'OD'],
        required: true
    },

    msmeStatus: { type: String, enum: ['Yes', 'No'], default: 'No' },
    msmeCertificateUrl: { type: String },

    contactPerson: { type: String, required: true },
    emailId: { type: String, required: true },
    mobileNo: { type: String, required: true },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    collection: 'vendor_registrations',
    strict: false
});

module.exports = VendorRegistrationSchema;
