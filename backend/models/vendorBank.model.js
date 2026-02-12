const mongoose = require('mongoose');

const VendorBankDetailsSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorRegistration',
        required: true,
        index: true
    },
    // Screenshot 1 Fields
    vendorCode: { type: String },
    coCode: { type: String },
    purOrg: { type: String },
    vendorAccount: { type: String },
    title: { type: String },
    vendorName: { type: String },
    vendorNameShort: { type: String },
    address1: { type: String },
    address2: { type: String },
    address3: { type: String },
    houseNo: { type: String },
    location1: { type: String },
    location2: { type: String },
    city2: { type: String },
    pinCode: { type: String },
    city: { type: String },
    country: { type: String },
    regionState: { type: String },
    language: { type: String },
    telephone: { type: String },
    faxNo: { type: String },
    mobileNo: { type: String },
    email: { type: String },
    customerCode: { type: String },
    industryCategory: { type: String },

    // Screenshot 2 Fields
    bankCountry: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    accountHolderName: { type: String },
    personRespCode: { type: String },
    personRespName: { type: String },
    reconciliation: { type: String },
    previousAccountNo: { type: String },
    paymentTerms: { type: String },
    checkForDoubleInvoice: { type: String },
    paymentMethod: { type: String },
    withholdingCountry: { type: String },
    withholdingTaxType: { type: String },
    withholdingTaxCode: { type: String },
    liable: { type: String },
    typeOfRecipient: { type: String },
    cst: { type: String },
    vat: { type: String },
    serviceTaxNo: { type: String },
    ecc: { type: String },
    exciseReg: { type: String },
    exciseRange: { type: String },
    exciseDivision: { type: String },
    commissionerate: { type: String },
    exciseIndicator: { type: String },

    // Screenshot 3 Fields
    ssiRegistrationNo: { type: String },
    panNo: { type: String },
    currency: { type: String },
    incoTerms: { type: String },
    incoTerms2: { type: String },
    schemaGroup: { type: String },
    grBasedInd: { type: String },
    acknowledInd: { type: String },
    serviceBasedInvoiceeVer: { type: String },
    typeOfService: { type: String },
    emailSales: { type: String },
    emailDespatch: { type: String },
    emailFinance: { type: String },
    bankBranchName: { type: String },
    ifscCode: { type: String },
    accountType: { type: String },
    businessFormation: { type: String },
    complianceGstDetails: { type: String },
    provisionalGstNo: { type: String },
    permanentGstNo: { type: String },
    gstClassification: { type: String },

    // Legacy/Meta
    cancelledChequeUrl: { type: String }
}, {
    timestamps: true,
    collection: 'vendor_bank_details',
    strict: false
});

module.exports = VendorBankDetailsSchema;
