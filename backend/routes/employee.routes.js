const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.jwt');
const checkModuleAccess = require('../middleware/moduleAccess.middleware');
const leaveCheck = checkModuleAccess('leave');
const empCtrl = require('../controllers/employee.controller');
const employeeSalaryController = require('../controllers/employeeSalary.controller');
const requestCtrl = require('../controllers/leaveRequest.controller');
const leavePolicyCtrl = require('../controllers/leavePolicy.controller');
const attendCtrl = require('../controllers/attendance.controller'); // Import Attendance Controller

// profile
router.get('/profile', auth.authenticate, empCtrl.getProfile);
router.post('/profile/ensure-policy', auth.authenticate, empCtrl.ensureMyPolicy);

// attendance
router.post('/attendance/toggle', auth.authenticate, attendCtrl.punch); // Use robust punch controller
router.get('/attendance', auth.authenticate, attendCtrl.getMyAttendance);

// leaves
router.post('/leaves/apply', auth.authenticate, leaveCheck, requestCtrl.applyLeave);
router.put('/leaves/edit/:id', auth.authenticate, leaveCheck, requestCtrl.editLeave);
router.post('/leaves/cancel/:id', auth.authenticate, leaveCheck, requestCtrl.cancelLeave);
router.get('/leaves/history', auth.authenticate, leaveCheck, requestCtrl.getMyLeaves);
router.get('/leaves/balances', auth.authenticate, leaveCheck, requestCtrl.getMyBalances);
router.get('/leaves/approved-dates', auth.authenticate, leaveCheck, requestCtrl.getApprovedDates);

// leave policies applicable to the current employee
router.get('/leaves/policies', auth.authenticate, leaveCheck, leavePolicyCtrl.getMyPolicies);
// Regularization
const regCtrl = require('../controllers/regularization.controller');
router.post('/regularization', auth.authenticate, regCtrl.createRequest);
router.get('/regularization/my', auth.authenticate, regCtrl.getMyRequests);

// Team Lead routes
router.get('/leaves/team-requests', auth.authenticate, leaveCheck, requestCtrl.getTeamLeaves);
router.post('/leaves/requests/:id/approve', auth.authenticate, leaveCheck, requestCtrl.approveLeave);
router.post('/leaves/requests/:id/reject', auth.authenticate, leaveCheck, requestCtrl.rejectLeave);

router.get('/regularization/team-requests', auth.authenticate, regCtrl.getTeamRequests);
router.post('/regularization/requests/:id/approve', auth.authenticate, regCtrl.approveRequest);
router.post('/regularization/requests/:id/reject', auth.authenticate, regCtrl.rejectRequest);


// payslips (mock)
router.get('/payslips', auth.authenticate, empCtrl.getPayslips);
router.get('/reporting-tree', auth.authenticate, empCtrl.getReportingTree);

// Salary Assignment (New Requirement)
router.post('/:id/salary-assignment', auth.requireHr, employeeSalaryController.assignSalary);
router.get('/:id/salary-assignment', auth.requireHr, employeeSalaryController.getSalaryAssignment);

// Bulk Employee Upload Routes
router.get('/bulk/template', auth.requireHr, empCtrl.downloadEmployeeTemplate);
router.post('/bulk/upload', auth.requireHr, empCtrl.bulkUploadEmployees);

module.exports = router;
// exported above
