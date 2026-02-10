const express = require('express');
const router = express.Router();
const bgvController = require('../controllers/bgv.controller');
const { authenticate, authorize } = require('../middleware/auth.jwt');
const multer = require('multer');
const path = require('path');

// Multer Config for document uploads
const upload = multer({
    dest: 'uploads/temp/',
    limits: { fileSize: 1024 * 1024 * 10 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and Word documents are allowed'));
        }
    }
});

// All routes require authentication
router.use(authenticate);

// ============================================
// HR ROUTES (Full Access)
// ============================================

// Dashboard & Statistics
router.get('/stats',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvController.getStats
);

// Case Management
router.post('/initiate',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvController.initiateBGV
);

router.get('/cases',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvController.getAllCases
);

router.get('/case/:id',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvController.getCaseDetail
);

router.post('/case/:id/close',
    authorize('hr', 'admin', 'company_admin'),
    bgvController.closeBGV
);

// Check Verification
router.post('/check/:checkId/verify',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvController.verifyCheck
);

// Report Generation
router.post('/case/:id/generate-report',
    authorize('hr', 'admin', 'company_admin'),
    bgvController.generateReport
);

// Report Download
router.get('/report/:reportId/download',
    authorize('hr', 'admin', 'company_admin'),
    bgvController.downloadReport
);

// Report Download by Case ID
router.get('/case/:caseId/report/download',
    authorize('hr', 'admin', 'company_admin'),
    bgvController.downloadReportByCase
);

// ============================================
// CANDIDATE ROUTES (Limited Access)
// ============================================

// Candidate can view their own BGV status
router.get('/candidate/:candidateId',
    bgvController.getBGVStatus
);

// Candidate can upload documents
router.post('/case/:caseId/upload-document',
    upload.single('document'),
    bgvController.uploadDocument
);

// ============================================
// SHARED ROUTES
// ============================================

// Document upload (can be used by HR or Candidate)
router.post('/check/:checkId/upload',
    upload.single('document'),
    bgvController.uploadDocument
);

// ============================================
// 🔐 EVIDENCE-DRIVEN VERIFICATION ROUTES (NEW)
// ============================================

const bgvEvidenceController = require('../controllers/bgv.evidence.controller');

// Evidence Status Management
router.post('/check/:checkId/update-evidence-status',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvEvidenceController.updateCheckEvidenceStatus
);

// 🔐 MAKER-CHECKER WORKFLOW ROUTES

// Step 1: Verifier starts verification (Maker)
router.post('/check/:checkId/start-verification',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvEvidenceController.startVerification
);

// Step 2: Verifier submits for approval (Maker)
router.post('/check/:checkId/submit-for-approval',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvEvidenceController.submitForApproval
);

// Step 3: Checker approves/rejects verification (Checker)
router.post('/check/:checkId/approve-verification',
    authorize('hr', 'admin', 'company_admin'), // Only admins can approve
    bgvEvidenceController.approveVerification
);

// Document Review
router.post('/document/:documentId/review',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvEvidenceController.reviewDocument
);

// ============================================
// 📧 BGV EMAIL ROUTES (NEW)
// ============================================

const bgvEmailController = require('../controllers/bgvEmail.controller');

// Send Email
router.post('/case/:caseId/send-email',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvEmailController.sendEmail
);

// Get Email History for Case
router.get('/case/:caseId/email-history',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvEmailController.getEmailHistory
);

// Get Global Email History for Tenant
router.get('/email-history-global',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvEmailController.getGlobalEmailHistory
);

// Get All Email Templates
router.get('/email-templates',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvEmailController.getEmailTemplates
);

// Get Email Template by Type
router.get('/email-template/:emailType',
    authorize('hr', 'admin', 'user', 'company_admin'),
    bgvEmailController.getEmailTemplateByType
);

// Create/Update Email Template (Admin only)
router.post('/email-template',
    authorize('admin', 'company_admin'),
    bgvEmailController.createOrUpdateEmailTemplate
);

// Initialize Default Email Templates (Admin/HR - run once)
router.post('/email-templates/initialize',
    authorize('hr', 'admin', 'company_admin'),
    bgvEmailController.initializeDefaultTemplates
);

module.exports = router;

