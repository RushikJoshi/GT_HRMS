// Load environment variables
require('dotenv').config();

// Core imports
const express = require('express');
// CORE APP REFRESH - FORCED RELOAD
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Express app
const app = express();

/* ===============================
   CORS
================================ */
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5176', // Vite dev server used in this workspace
    'http://localhost:3000',
    'http://localhost:5000',
    'https://hrms.gitakshmi.com',
    'https://hrms.dev.gitakshmi.com'
];

// Configure CORS strictly to allow only expected origins in production
app.use(cors({
    origin: function (origin, callback) {
        // Allow non-browser or same-origin (no origin) requests
        if (!origin) return callback(null, true);

        // Allow explicit origins
        if (allowedOrigins.includes(origin)) return callback(null, true);

        // Allow any localhost origin during development (different dev ports)
        try {
            const u = new URL(origin);
            if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return callback(null, true);
        } catch (e) {
            // ignore parsing errors
        }

        // Otherwise block
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
    credentials: true
}));

// Handle OPTIONS requests explicitly (fine-grained control kept for preflight responses)
app.options('*', cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        try {
            const u = new URL(origin);
            if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return callback(null, true);
        } catch (e) { }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
    credentials: true
}));

/* ===============================
   BODY PARSERS
================================ */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ===============================
   REGISTER MODELS (Global)
================================ */
// Register models for main DB
// We require them to ensure they are registered with mongoose.model
try {
    mongoose.model('Notification', require('./models/Notification'));
    mongoose.model('LeaveRequest', require('./models/LeaveRequest'));
    mongoose.model('Regularization', require('./models/Regularization'));
    mongoose.model('Applicant', require('./models/Applicant'));
    mongoose.model('Requirement', require('./models/Requirement'));
    mongoose.model('Position', require('./models/Position'));
    mongoose.model('Candidate', require('./models/Candidate'));
    mongoose.model('Interview', require('./models/Interview'));
    mongoose.model('TrackerCandidate', require('./models/TrackerCandidate'));
    mongoose.model('CandidateStatusLog', require('./models/CandidateStatusLog'));
    mongoose.model('PayrollAdjustment', require('./models/PayrollAdjustment'));

    // BGV Models
    mongoose.model('BGVCase', require('./models/BGVCase'));
    mongoose.model('BGVCheck', require('./models/BGVCheck'));
    mongoose.model('BGVDocument', require('./models/BGVDocument'));
    mongoose.model('BGVTimeline', require('./models/BGVTimeline'));
    mongoose.model('BGVReport', require('./models/BGVReport'));
} catch (e) {
    console.warn("Model registration warning:", e.message);
}

/* ===============================
   ROUTES IMPORT
================================ */
const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const companyRoutes = require('./routes/company.routes');
const activityRoutes = require('./routes/activity.routes');
const uploadRoutes = require('./routes/upload.routes');
const hrRoutes = require('./routes/hr.routes');
const psaHrRoutes = require('./routes/psa.hr.routes');
const employeeRoutes = require('./routes/employee.routes');
const requirementRoutes = require('./routes/requirement.routes');
const publicRoutes = require('./routes/public.routes');
const notificationRoutes = require('./routes/notification.routes');
const commentRoutes = require('./routes/comment.routes');
const entityRoutes = require('./routes/entity.routes');
const holidayRoutes = require('./routes/holiday.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const attendancePolicyRoutes = require('./routes/attendancePolicy.routes');
const letterRoutes = require('./routes/letter.routes');
const offerTemplateRoutes = require('./routes/offerTemplate.routes');
const payslipTemplateRoutes = require('./routes/payslipTemplate.routes');

// Payroll
const payrollRoutes = require('./routes/payroll.routes');
const deductionRoutes = require('./routes/deduction.routes');
const salaryStructureRoutes = require('./routes/salaryStructure.routes');
const payrollRuleRoutes = require('./routes/payrollRule.routes');
const salaryRevisionRoutes = require('./routes/salaryRevision.routes');
const compensationRoutes = require('./routes/compensation.routes');
const payrollAdjustmentRoutes = require('./routes/payrollAdjustment.routes');


// Company ID Configuration
const companyIdConfigRoutes = require('./routes/companyIdConfig.routes');
const positionRoutes = require('./routes/position.routes');
const vendorRoutes = require('./routes/vendor.routes');

// Career Page (Optimized for 16MB limit fix)
const careerOptimizedRoutes = require('./routes/career-optimized.routes');

/* ===============================
   ROUTES (NO TENANT)
================================ */
app.use('/api/public', publicRoutes);
app.use('/api/candidate', require('./routes/candidate.routes'));
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/company-id-config', companyIdConfigRoutes);

/* ===============================
   TENANT MIDDLEWARE
================================ */
const tenantMiddleware = require('./middleware/tenant.middleware');
const wrapAsync = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

app.use('/api', wrapAsync(tenantMiddleware));

/* ===============================
   TENANT SCOPED ROUTES
================================ */
app.use('/api/salary', (req, res, next) => {
    console.log(`[DEBUG_ROUTING] Salary Route accessed: ${req.path}`);
    next();
}, require('./routes/salary.routes'));

// Force Restart Tracker: v9.2
app.get('/api/salary/ping', (req, res) => res.json({ message: 'Salary Pong', time: new Date() }));

app.use('/api/letters', letterRoutes);
app.use('/api/offer-templates', offerTemplateRoutes);
app.use('/api/payslip-templates', payslipTemplateRoutes);
app.use('/api', hrRoutes);
app.use('/api/psa', psaHrRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/attendance-policy', attendancePolicyRoutes);
app.use('/api/salary-structure', salaryStructureRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/payroll/corrections', payrollAdjustmentRoutes);
app.use('/api/compensation', compensationRoutes);
app.use('/api/bgv', require('./routes/bgv.routes'));
app.use('/api/vendor', vendorRoutes);

app.use('/api/career', careerOptimizedRoutes);
app.use('/api/social-media', require('./routes/socialMedia.routes'));


app.use('/api/positions', positionRoutes);

/* ===============================
   HRMS ALIAS ROUTES (For Frontend Inconsistencies)
================================ */
// Mount all main routers under /api/hrms as well (for frontend calls like /requirements)
const hrmsPrefix = '/api/hrms';
app.use(hrmsPrefix + '/requirements', requirementRoutes);
app.use(hrmsPrefix + '/holidays', holidayRoutes);
app.use(hrmsPrefix + '/letters', letterRoutes);
app.use(hrmsPrefix + '/offer-templates', offerTemplateRoutes);
app.use(hrmsPrefix + '/payslip-templates', payslipTemplateRoutes);
app.use(hrmsPrefix + '/attendance', attendanceRoutes);
app.use(hrmsPrefix + '/attendance-policy', attendancePolicyRoutes);
app.use(hrmsPrefix + '/payroll', payrollRoutes);
app.use(hrmsPrefix + '/payroll/corrections', payrollAdjustmentRoutes);
app.use(hrmsPrefix + '/compensation', compensationRoutes);
app.use(hrmsPrefix + '/entities', entityRoutes);
app.use(hrmsPrefix + '/notifications', notificationRoutes);
app.use(hrmsPrefix + '/comments', commentRoutes);
app.use(hrmsPrefix + '/positions', positionRoutes);
app.use(hrmsPrefix + '/employee', employeeRoutes);
app.use(hrmsPrefix + '/vendor', vendorRoutes);

// Special case for letter_templates (plural vs singular)
app.use(hrmsPrefix + '/letter_templates', (req, res, next) => {
    req.url = '/templates' + req.url;
    return letterRoutes(req, res, next);
});


app.use(hrmsPrefix + '/interviews', require('./routes/interview.routes'));

// Alias /hrms/hr/ -> hrRoutes (handles /hrms/hr/employees etc)

// Since hrRoutes already prefixes routes with /hr, we mount it at the root of /api/hrms
app.use(hrmsPrefix, hrRoutes);

// Alias employee routes under /api/hrms for frontend compatibility
app.use(hrmsPrefix + '/employee', employeeRoutes);

// Optional modules - handle if missing/failing
try {
    app.use('/api/payroll-engine', require('./routes/payrollEngine.routes'));
    app.use(hrmsPrefix + '/payroll-engine', require('./routes/payrollEngine.routes'));
} catch (e) {
    console.warn("Payroll Engine routes skipped:", e.message);
}

app.use('/api/payroll-rules', payrollRuleRoutes);
app.use(hrmsPrefix + '/payroll-rules', payrollRuleRoutes);
app.use('/api/hr', salaryRevisionRoutes);
app.use(hrmsPrefix + '/hr', salaryRevisionRoutes);

try {
    app.use('/api/tracker', require('./routes/tracker.routes'));
    app.use('/api/tracker', require('./routes/tracker.routes'));
    app.use('/api/hr/candidate-status', require('./routes/tracker.routes'));
} catch (e) {
    console.warn("Tracker routes skipped:", e.message);
}

app.use('/api', deductionRoutes);
app.use('/api/hrms', deductionRoutes);

/* ===============================
   STATIC FILE SERVING
================================ */
const uploadsDir = path.join(__dirname, 'uploads');
const offersDir = path.join(uploadsDir, 'offers');
const profilePicsDir = path.join(uploadsDir, 'profile-pics');

try {
    [uploadsDir, offersDir, profilePicsDir].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
} catch (e) {
    console.warn("Could not create upload dirs:", e.message);
}

app.use('/uploads', express.static(uploadsDir));

/* ===============================
   HEALTH CHECK
================================ */
app.get('/', (_req, res) => {
    res.send('HRMS Backend Running (Refactored)');
});

app.get('/api/health', (_req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ===============================
   ERROR HANDLING
================================ */
const errorMiddleware = require('./middleware/error.middleware');

app.use((err, req, res, next) => {
    next(err);
});
app.use(errorMiddleware);

module.exports = app;
