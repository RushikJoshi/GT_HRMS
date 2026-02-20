const express = require('express');
const router = express.Router();
const candidateCtrl = require('../controllers/candidate.controller');
const { authenticateCandidate } = require('../middleware/jobPortalAuthMiddleware');

// Public routes (Auth)
router.post('/register', candidateCtrl.registerCandidate);
router.post('/login', candidateCtrl.loginCandidate);


// Profile update and photo upload
const { profilePicUpload } = require('../utils/upload');
router.get('/profile', authenticateCandidate, candidateCtrl.getCandidateProfile);
router.put('/profile', authenticateCandidate, profilePicUpload.single('profileImage'), candidateCtrl.updateCandidateProfile);

// Protected routes
router.get('/me', authenticateCandidate, candidateCtrl.getCandidateMe);
router.get('/dashboard', authenticateCandidate, candidateCtrl.getCandidateDashboard);
router.get('/check-status/:requirementId', authenticateCandidate, candidateCtrl.checkApplicationStatus);
router.get('/application/track/:applicationId', authenticateCandidate, candidateCtrl.trackApplication);


// Configure Multer for Document Uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');
if (!fs.existsSync('uploads/temp/')) {
    fs.mkdirSync('uploads/temp/', { recursive: true });
}
const upload = multer({
    dest: 'uploads/temp/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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

// Offer Acceptance
router.post('/application/accept-offer/:applicationId', authenticateCandidate, candidateCtrl.acceptOffer);

// BGV Documents
router.get('/application/bgv-documents/:applicationId', authenticateCandidate, candidateCtrl.getBGVDocuments);
router.post('/application/bgv-documents/:applicationId/upload', authenticateCandidate, upload.single('document'), candidateCtrl.uploadBGVDocument);

// Letter Signing
router.get('/letter/status/:letterId', authenticateCandidate, candidateCtrl.getLetterStatus);
router.post('/letter/sign/:letterId', authenticateCandidate, candidateCtrl.signLetter);

module.exports = router;
