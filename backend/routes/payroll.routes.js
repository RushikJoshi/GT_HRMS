const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');

const benefitController = require('../controllers/benefit.controller');
const payrollRunController = require('../controllers/payrollRun.controller');
const payslipController = require('../controllers/payslip.controller');
const auth = require('../middleware/auth.jwt');
const tenantMiddleware = require('../middleware/tenant.middleware');

const payrollProcessController = require('../controllers/payrollProcess.controller');
const payrollDashboardController = require('../controllers/payrollDashboard.controller');

// Apply auth and tenant middleware to all payroll routes
router.use(auth.authenticate);
router.use(tenantMiddleware);

// Admin-only setup: seed default components (safe to run multiple times)
router.post('/setup/default-components', auth.authorize('admin'), (req, res, next) => {
	// delegate to controller
	const payrollController = require('../controllers/payroll.controller');
	return payrollController.seedDefaultComponents(req, res, next);
});

// Earnings Routes (HR Only)
router.use('/earnings', auth.requireHr);
router.post('/earnings', payrollController.createEarning);
router.get('/earnings', payrollController.getEarnings);
router.put('/earnings/:id', payrollController.updateEarning);
router.delete('/earnings/:id', payrollController.deleteEarning);

// Benefits Routes (HR Only)
router.use('/benefits', auth.requireHr);
router.post('/benefits', benefitController.createBenefit);
router.get('/benefits', benefitController.getBenefits);
router.get('/benefits/:id', benefitController.getBenefitById);
router.put('/benefits/:id', benefitController.updateBenefit);
router.delete('/benefits/:id', benefitController.deleteBenefit);
router.patch('/benefits/:id/status', benefitController.toggleStatus);








// Payroll Run Routes (HR Only)
router.use('/runs', auth.requireHr);
router.get('/filteredEmployees', auth.requireHr, payrollRunController.getFilteredEmployees);
router.post('/runs', payrollRunController.initiatePayrollRun);
router.get('/runs', payrollRunController.getPayrollRuns);
router.get('/runs/:id', payrollRunController.getPayrollRunById);
router.post('/runs/:id/calculate', payrollRunController.calculatePayroll);
router.post('/runs/:id/approve', payrollRunController.approvePayroll);
router.post('/runs/:id/mark-paid', payrollRunController.markPayrollPaid);
router.post('/runs/:id/cancel', payrollRunController.cancelPayrollRun);

// Payslip Routes - Employee self-service
router.get('/payslips/my', payslipController.getMyPayslips);

// Payslip Preview Route (HR Only)
router.get('/payslips/:employeeId', auth.requireHr, payslipController.getPayslipByEmployeeAndMonth);

// Payslip Routes - HR routes (full access)
router.get('/payslips', auth.requireHr, payslipController.getPayslips);
router.post('/payslips/:id/generate-pdf', payslipController.generatePayslipPDF);
// router.get('/payslips/:id/download', auth.requireHr, payslipController.downloadPayslipPDF); 




// Dashboard Routes (HR Only) - Analytics and Metrics
router.get('/dashboard', auth.requireHr, payrollDashboardController.getDashboardData);
router.get('/dashboard/stats', auth.requireHr, payrollDashboardController.getQuickStats);

// Setup for payroll process
router.get('/process/employees', auth.requireHr, payrollProcessController.getProcessEmployees);
router.post('/process/preview', auth.requireHr, payrollProcessController.previewPreview);
router.post('/process/run', auth.requireHr, payrollProcessController.runPayroll);

module.exports = router;
