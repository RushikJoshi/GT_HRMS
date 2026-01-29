const express = require('express');
const router = express.Router();
const payslipTemplateController = require('../controllers/payslipTemplate.controller');
const auth = require('../middleware/auth.jwt');

// Apply protection to all routes
router.use(auth.authenticate);
router.use(auth.requireHr);
// tenantMiddleware is already applied globaly in app.js for /api routes

router.get('/', payslipTemplateController.getTemplates);
router.get('/:id', payslipTemplateController.getTemplateById);
router.post('/', payslipTemplateController.createTemplate);
router.post('/upload-word', payslipTemplateController.uploadWordTemplate);
router.put('/:id', payslipTemplateController.updateTemplate);
router.delete('/:id', payslipTemplateController.deleteTemplate);

// Specific actions
router.post('/preview', payslipTemplateController.previewTemplate);
router.post('/render/:payslipId', payslipTemplateController.renderPayslipPDF);

module.exports = router;
