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

        // Allow dynamic origins from env (Frontend, Ngrok, Backend)
        const envOrigins = [
            process.env.FRONTEND_URL,
            process.env.NGROK_URL,
            process.env.BACKEND_URL
        ].filter(Boolean); // Remove undefined/null/empty strings

        if (envOrigins.includes(origin)) return callback(null, true);

        // Allow any localhost origin during development (different dev ports)
        try {
            const u = new URL(origin);
            if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return callback(null, true);
        } catch (e) {
            // ignore parsing errors
        }

        // Otherwise block
        // Otherwise block (TEMPORARILY CHANGED TO ALLOW AND LOG)
        console.warn('⚠️ CORS DEBUG - WOULD BLOCK Origin:', origin);
        // return callback(new Error('Not allowed by CORS')); // DISABLED FOR DEBUGGING
        return callback(null, true); // ALLOW TEMPORARILY
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

        // Allow dynamic origins from env (Frontend, Ngrok, Backend)
        const envOrigins = [
            process.env.FRONTEND_URL,
            process.env.NGROK_URL,
            process.env.BACKEND_URL
        ].filter(Boolean);

        if (envOrigins.includes(origin)) return callback(null, true);

        try {
            const u = new URL(origin);
            if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return callback(null, true);
        } catch (e) { }
        // Otherwise block (TEMPORARILY CHANGED TO ALLOW AND LOG)
        console.warn('⚠️ CORS DEBUG - WOULD BLOCK Origin (OPTIONS):', origin);
        // return callback(new Error('Not allowed by CORS')); // DISABLED FOR DEBUGGING
        return callback(null, true); // ALLOW TEMPORARILY
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
    mongoose.model('SalaryStructure', require('./models/SalaryStructure'));

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

const checkModuleAccess = require('./middleware/moduleAccess.middleware');
const auth = require('./middleware/auth.jwt'); // Ensure auth is available for middleware sequence if needed, though most routes already use it internaly or we can add it here.


/* ===============================
   TENANT SCOPED ROUTES
================================ */
// --- PAYROLL MODULE ---
const payrollCheck = checkModuleAccess('payroll');
app.use('/api/salary', payrollCheck, require('./routes/salary.routes'));
app.use('/api/payroll', payrollCheck, payrollRoutes);
app.use('/api/payroll/corrections', payrollCheck, payrollAdjustmentRoutes);
app.use('/api/compensation', payrollCheck, compensationRoutes);
app.use('/api/salary-structure', payrollCheck, salaryStructureRoutes);
app.use('/api/payslip-templates', payrollCheck, payslipTemplateRoutes);
app.use('/api/payroll-rules', payrollCheck, payrollRuleRoutes);

// --- ATTENDANCE MODULE ---
const attendanceCheck = checkModuleAccess('attendance');
app.use('/api/attendance', attendanceCheck, attendanceRoutes);
app.use('/api/attendance-policy', attendanceCheck, attendancePolicyRoutes);
app.use('/api/holidays', attendanceCheck, holidayRoutes);

// --- HR MODULE ---
const hrCheck = checkModuleAccess('hr');
const leaveCheck = checkModuleAccess('leave');
const bgvCheck = checkModuleAccess('backgroundVerification');
const documentMgmtCheck = checkModuleAccess('documentManagement');
app.use('/api/letters', hrCheck, documentMgmtCheck, letterRoutes);
// Primary mount keeps hrRoutes paths like /hr/employees accessible at /api/hr/employees
app.use('/api', hrCheck, hrRoutes);
// Backward-compat alias for older frontend calls that used /api/hr/hr/*
app.use('/api/hr', hrCheck, hrRoutes);
app.use('/api/psa', hrCheck, psaHrRoutes);
app.use('/api/employee', hrCheck, employeeRoutes);
app.use('/api/bgv', hrCheck, bgvCheck, require('./routes/bgv.routes'));
app.use('/api/entities', hrCheck, entityRoutes);
app.use('/api/positions', hrCheck, positionRoutes);

// --- RECRUITMENT MODULE ---
const recruitmentCheck = checkModuleAccess('recruitment');
app.use('/api/requirements', recruitmentCheck, requirementRoutes);
app.use('/api/offer-templates', recruitmentCheck, offerTemplateRoutes);
app.use('/api/vendor', recruitmentCheck, vendorRoutes);
app.use('/api/career', recruitmentCheck, careerOptimizedRoutes);
app.use('/api/interviews', recruitmentCheck, require('./routes/interview.routes'));
app.use('/api/tracker', recruitmentCheck, require('./routes/tracker.routes'));

// --- OTHER ---
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/social-media', require('./routes/socialMedia.routes'));
app.use('/api/deductions', deductionRoutes);
app.use('/api/tracker', recruitmentCheck, require('./routes/tracker.routes'));


/* ===============================
   HRMS ALIAS ROUTES (For Frontend Inconsistencies)
================================ */
// Mount all main routers under /api/hrms as well (for frontend calls like /requirements)
const hrmsPrefix = '/api/hrms';
// Alias /hrms/hr/ -> hrRoutes
app.use(hrmsPrefix, hrCheck, hrRoutes);

// Alias payroll under /api/hrms
app.use(hrmsPrefix + '/payroll', payrollCheck, payrollRoutes);
app.use(hrmsPrefix + '/payroll/corrections', payrollCheck, payrollAdjustmentRoutes);
app.use(hrmsPrefix + '/compensation', payrollCheck, compensationRoutes);
app.use(hrmsPrefix + '/payroll-rules', payrollCheck, payrollRuleRoutes);

// Alias attendance under /api/hrms
app.use(hrmsPrefix + '/attendance', attendanceCheck, attendanceRoutes);
app.use(hrmsPrefix + '/attendance-policy', attendanceCheck, attendancePolicyRoutes);
app.use(hrmsPrefix + '/holidays', attendanceCheck, holidayRoutes);

// Alias recruitment under /api/hrms
app.use(hrmsPrefix + '/requirements', recruitmentCheck, requirementRoutes);
app.use(hrmsPrefix + '/interviews', recruitmentCheck, require('./routes/interview.routes'));
app.use(hrmsPrefix + '/offer-templates', recruitmentCheck, offerTemplateRoutes);

// Alias deduction routes
app.use(hrmsPrefix + '/deductions', deductionRoutes);

// Alias employee portal
app.use(hrmsPrefix + '/employee', checkModuleAccess('employeePortal'), employeeRoutes);

// Alias letter templates (Plural in frontend, singular in backend)
app.use(hrmsPrefix + '/letter_templates', hrCheck, (req, res, next) => {
    req.url = '/templates' + req.url;
    return letterRoutes(req, res, next);
});

try {
    app.use('/api/hr/candidate-status', recruitmentCheck, require('./routes/tracker.routes'));
} catch (e) {
    console.warn("Tracker routes skipped:", e.message);
}

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
