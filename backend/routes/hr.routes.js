const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.jwt');

const empCtrl = require('../controllers/hr.employee.controller');
const deptCtrl = require('../controllers/hr.department.controller');
const policyCtrl = require('../controllers/leavePolicy.controller');
const requestCtrl = require('../controllers/leaveRequest.controller');
const applicantCtrl = require('../controllers/applicant.controller');
const trackerCtrl = require('../controllers/trackerController');

// Multer Config for Resume Parsing
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

/* -----------------------------------------
   EMPLOYEES
----------------------------------------- */
router.get('/hr/employees', auth.authenticate, auth.requireHr, empCtrl.list);
router.post('/hr/employees', auth.authenticate, auth.requireHr, empCtrl.create);

// APPLICANTS - RESUME PARSING
router.post('/hr/applicants/parse-resume', auth.authenticate, auth.requireHr, upload.single('resume'), applicantCtrl.parseResume);
router.get('/hr/resume/:filename', auth.authenticate, auth.requireHr, applicantCtrl.getResumeFile);

// ⚠️ SPECIFIC ROUTES BEFORE GENERIC :ID ROUTES (important for Express routing)
// Employee ID Preview (Auto-generate preview request)
router.post('/hr/employees/preview', auth.authenticate, auth.requireHr, empCtrl.preview);

router.get('/hr/employees/me', auth.authenticate, empCtrl.me);
router.get('/hr/employees/top-level', auth.authenticate, auth.requireHr, empCtrl.getTopLevelEmployees);
router.get('/hr/employees/hierarchy', auth.authenticate, auth.requireHr, empCtrl.getHierarchy);

// Generic :id routes
router.get('/hr/employees/:id', auth.authenticate, auth.requireHr, empCtrl.get);
router.put('/hr/employees/:id', auth.authenticate, auth.requireHr, empCtrl.update);
router.delete('/hr/employees/:id', auth.authenticate, auth.requireHr, empCtrl.remove);
router.post('/hr/employees/:id/set-manager', auth.authenticate, auth.requireHr, empCtrl.setManager);
router.delete('/hr/employees/:id/manager', auth.authenticate, auth.requireHr, empCtrl.removeManager);
router.get('/hr/employees/:id/direct-reports', auth.authenticate, auth.requireHr, empCtrl.directReports);
router.get('/hr/employees/:id/manager', auth.authenticate, auth.requireHr, empCtrl.getManager);
router.get('/hr/employees/:id/reporting-chain', auth.authenticate, auth.requireHr, empCtrl.reportingChain);
router.get('/hr/employees/:id/org-tree', auth.authenticate, auth.requireHr, empCtrl.orgTree);

/* -----------------------------------------
   ORG ROOT & COMPANY TREE
----------------------------------------- */
router.get('/hr/org/root', auth.authenticate, auth.requireHr, empCtrl.getOrgRoot);
router.post('/hr/org/root', auth.authenticate, auth.requireHr, empCtrl.setOrgRoot);
router.get('/hr/org/tree', auth.authenticate, auth.requireHr, empCtrl.companyOrgTree);

/* -----------------------------------------
   DEPARTMENTS
----------------------------------------- */
router.get('/hr/departments', auth.authenticate, auth.requireHr, deptCtrl.list);
router.post('/hr/departments', auth.authenticate, auth.requireHr, deptCtrl.create);
router.put('/hr/departments/:id', auth.authenticate, auth.requireHr, deptCtrl.update);
router.delete('/hr/departments/:id', auth.authenticate, auth.requireHr, deptCtrl.remove);
router.get('/hr/departments/hierarchy/full', auth.authenticate, auth.requireHr, deptCtrl.getFullOrgHierarchy);

/* -----------------------------------------
   LEAVES
----------------------------------------- */
/* -----------------------------------------
   LEAVE POLICIES
----------------------------------------- */
// Test route
router.get('/hr/leave-policies/test', auth.authenticate, auth.requireHr, (req, res) => {
   res.json({ message: 'Test route works', user: req.user, tenantId: req.tenantId });
});

router.post('/hr/leave-policies', auth.authenticate, auth.requireHr, policyCtrl.createPolicy);
router.get('/hr/leave-policies', auth.authenticate, auth.requireHr, policyCtrl.getPolicies);
router.get('/hr/leave-policies/:id', auth.authenticate, auth.requireHr, policyCtrl.getPolicyById);
router.put('/hr/leave-policies/:id', auth.authenticate, auth.requireHr, policyCtrl.updatePolicy);
router.post('/hr/leave-policies/:id/sync', auth.authenticate, auth.requireHr, policyCtrl.syncPolicy);
router.patch('/hr/leave-policies/:id/status', auth.authenticate, auth.requireHr, policyCtrl.togglePolicyStatus);
router.delete('/hr/leave-policies/:id', auth.authenticate, auth.requireHr, policyCtrl.deletePolicy);
router.post('/hr/assign-policy', auth.authenticate, auth.requireHr, policyCtrl.assignPolicyToEmployee);

// DEBUG: Create & assign default policy to all employees (HR only)
router.post('/hr/leave-policies/ensure-default', auth.authenticate, auth.requireHr, policyCtrl.ensureDefaultPolicyForTenant);

// Accrual Endpoints (HR only)
router.post('/hr/leave-policies/accrual/run-monthly', auth.authenticate, auth.requireHr, policyCtrl.accrueMonthly);
router.post('/hr/leave-policies/accrual/run-carryforward', auth.authenticate, auth.requireHr, policyCtrl.carryForward);

/* -----------------------------------------
   REGULARIZATION (Admin)
----------------------------------------- */
const regCtrl = require('../controllers/regularization.controller');
router.get('/hr/regularization', auth.authenticate, auth.requireHr, regCtrl.getAllRequests);
router.post('/hr/regularization/:id/approve', auth.authenticate, auth.requireHr, regCtrl.approveRequest);
router.post('/hr/regularization/:id/reject', auth.authenticate, auth.requireHr, regCtrl.rejectRequest);

/* -----------------------------------------
   LEAVE REQUESTS (HR APPROVALS)
----------------------------------------- */
router.get('/hr/leaves/requests', auth.authenticate, auth.requireHr, requestCtrl.getAllLeaves);
router.post('/hr/leaves/requests/:id/approve', auth.authenticate, auth.requireAdminOrHr, requestCtrl.approveLeave);
router.post('/hr/leaves/requests/:id/reject', auth.authenticate, auth.requireAdminOrHr, requestCtrl.rejectLeave);

// Calendar (HR) - Month overview and day detail
const calendarCtrl = require('../controllers/calendar.controller');
console.log('[ROUTES] calendarCtrl exports:', Object.keys(calendarCtrl || {}));
if (calendarCtrl && typeof calendarCtrl.getCalendar === 'function') {
   router.get('/hr/calendar', auth.authenticate, auth.requireHr, calendarCtrl.getCalendar);
} else {
   console.error('[ROUTES][WARN] calendarCtrl.getCalendar is missing - route /hr/calendar skipped');
}

if (calendarCtrl && typeof calendarCtrl.getCalendarDetail === 'function') {
   router.get('/hr/calendar/detail', auth.authenticate, auth.requireHr, calendarCtrl.getCalendarDetail);
} else {
   console.error('[ROUTES][WARN] calendarCtrl.getCalendarDetail is missing - route /hr/calendar/detail skipped');
}

// Production-grade Attendance Calendar endpoints
if (calendarCtrl && typeof calendarCtrl.getAttendanceCalendar === 'function') {
   router.get('/hr/attendance-calendar', auth.authenticate, auth.requireHr, calendarCtrl.getAttendanceCalendar);
} else {
   console.error('[ROUTES][WARN] calendarCtrl.getAttendanceCalendar is missing - route /hr/attendance-calendar skipped');
}

if (calendarCtrl && typeof calendarCtrl.getAttendanceCalendarDetail === 'function') {
   router.get('/hr/attendance-calendar/detail', auth.authenticate, auth.requireHr, calendarCtrl.getAttendanceCalendarDetail);
} else {
   console.error('[ROUTES][WARN] calendarCtrl.getAttendanceCalendarDetail is missing - route /hr/attendance-calendar/detail skipped');
}

// Offer Templates
router.use('/hr/offer-templates', require('./offerTemplate.routes'));

// Career Builder
router.use('/hr/career', require('./career.routes'));


// BULk Upload Template

router.get('/hr/bulk/template', auth.authenticate, auth.requireAdminOrHr, empCtrl.downloadBulkUploadTemp);
router.post('/hr/bulk/upload', auth.authenticate, auth.requireAdminOrHr, empCtrl.bulkUploadEmployees);
/* -----------------------------------------
   CANDIDATE STATUS TRACKER
----------------------------------------- */
router.get('/hr/candidate-status', trackerCtrl.getCandidates);
router.get('/hr/candidate-status/:id', trackerCtrl.getCandidateById);
router.get('/hr/candidate-status/:id/timeline', trackerCtrl.getTimeline);
router.get('/hr/candidate/:id/status', trackerCtrl.getStatus); // NEW ROUTE
router.post('/hr/candidate-status/:id/status', trackerCtrl.updateStatus);
router.post('/hr/candidate-status/seed', trackerCtrl.seedData);

module.exports = router;
