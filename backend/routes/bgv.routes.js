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

module.exports = router;
