const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.jwt');
const reportCtrl = require('../controllers/report.controller');

router.get('/existing-employees', auth.authenticate, auth.requireHr, reportCtrl.existingEmployeeReport);
router.get('/replacements', auth.authenticate, auth.requireHr, reportCtrl.replacementReport);
router.get('/analytics', auth.authenticate, auth.requireHr, reportCtrl.headcountAnalytics);
router.get('/sla', auth.authenticate, auth.requireHr, reportCtrl.slaReport);
router.get('/dashboard-summary', auth.authenticate, auth.requireHr, reportCtrl.dashboardSummary);

module.exports = router;
