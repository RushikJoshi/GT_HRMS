const express = require('express');
const router = express.Router();
const letterCtrl = require('../controllers/letter.controller');
const { authenticate, requireHr } = require('../middleware/auth.jwt');

console.log('Letter routes loaded');
console.log('uploadWordTemplate type:', typeof letterCtrl.uploadWordTemplate);
console.log('deleteTemplate type:', typeof letterCtrl.deleteTemplate); // DEBUG CHECK

// --- Specific Letter Generation Routes (Must be before wildcard :id routes) ---
router.post('/generate-offer', authenticate, requireHr, letterCtrl.generateOfferLetter);
router.post('/generate-joining', authenticate, requireHr, letterCtrl.generateJoiningLetter);
// router.post('/generate-professional-joining', authenticate, requireHr, letterCtrl.generateProfessionalJoiningLetter); // DISABLED - function doesn't exist
router.post('/preview-joining', authenticate, requireHr, letterCtrl.previewJoiningLetter);
router.post('/upload-word-template', authenticate, requireHr, letterCtrl.uploadWordTemplate);

// --- Company Profile (Branding) ---
router.get('/company-profile', authenticate, requireHr, letterCtrl.getCompanyProfile);
router.post('/company-profile', authenticate, requireHr, letterCtrl.updateCompanyProfile);

// --- Templates Management ---
router.get('/templates', letterCtrl.getTemplates);     // List all
router.post('/templates', authenticate, requireHr, letterCtrl.createTemplate);
router.get('/templates', letterCtrl.getTemplates);     // List all
router.get('/templates/:id', letterCtrl.getTemplateById); // Get One
router.put('/templates/:id', letterCtrl.updateTemplate);  // Update
router.delete('/templates/:id', authenticate, requireHr, letterCtrl.deleteTemplate); // Delete

// --- Word Template Upload (Joining Letters) ---
// IMPORTANT: uploadWordTemplate is an array [multer, handler]
router.post('/upload-word-template', authenticate, requireHr, letterCtrl.uploadWordTemplate);

// --- Word Template Preview (Convert to PDF) ---
router.get('/templates/:templateId/preview-pdf', letterCtrl.previewWordTemplatePDF);
router.get('/templates/:templateId/download-word', authenticate, requireHr, letterCtrl.downloadWordTemplate); // Download original .docx file
router.get('/templates/:templateId/download-pdf', letterCtrl.downloadWordTemplatePDF); // Download as PDF

// --- PDF Generate & Download ---
router.post('/templates/:templateId/download-pdf', authenticate, requireHr, letterCtrl.downloadLetterPDF);

// Generate Official Offer Letter (HTML/Image based)
router.post('/generate-offer', authenticate, requireHr, letterCtrl.generateOfferLetter);

// Generate Official Joining Letter (Word template based)
router.post('/generate-joining', authenticate, requireHr, letterCtrl.generateJoiningLetter);

// Preview Joining Letter with Applicant Data
router.post('/preview-joining', authenticate, requireHr, letterCtrl.previewJoiningLetter);

// --- Generic Letter Generation & Workflow ---
router.post('/generate-generic', authenticate, requireHr, letterCtrl.generateGenericLetter);
router.get('/generated-letters', authenticate, requireHr, letterCtrl.getGeneratedLetters);
router.get('/generated-letters/:id', authenticate, requireHr, letterCtrl.getLetterById);
router.patch('/generated-letters/:id/status', authenticate, requireHr, letterCtrl.updateGeneratedLetterStatus);
router.post('/generated-letters/:id/approval', authenticate, requireHr, letterCtrl.actionLetterApproval);

// --- Dynamic PDF, Sign & Accept (MERN Architect Flow) ---
const { authenticateCandidate } = require('../middleware/jobPortalAuthMiddleware');

// Get Dynamic PDF (Centralized tenant middleware handles query-based auth for iframes)
router.get('/:id/pdf', letterCtrl.generateDynamicPDF);

// Candidate Actions
router.post('/:id/accept', authenticateCandidate, letterCtrl.acceptLetter);

// --- History / Audit ---
router.get('/history', letterCtrl.getHistory);


// Ensure export
if (!module.exports) {
    module.exports = router;
} else {
    module.exports = router;
}
