const express = require('express');
const router = express.Router();
const vendorRegistrationController = require('../controllers/vendorRegistration.controller');
const vendorBankController = require('../controllers/vendorBank.controller');
const auth = require('../middleware/auth.jwt');

// All routes require authentication
router.use(auth.authenticate);

// Step 1: Basic Registration
router.post('/register-step1', vendorRegistrationController.registerStep1);

// Step 2: Bank Details
router.post('/register-step2', vendorBankController.registerStep2);

// Form Configuration (Customization)
const vendorConfigController = require('../controllers/vendorConfig.controller');
router.get('/form-config/:formType', vendorConfigController.getConfig);
router.post('/form-config/:formType', auth.requireHr, vendorConfigController.saveConfig);

// Actions
router.get('/list', vendorRegistrationController.listVendors);
router.get('/:id', vendorRegistrationController.getVendor);

module.exports = router;
