const express = require('express');
const router = express.Router();
const candidateCtrl = require('../controllers/candidate.controller');
const { authenticateCandidate } = require('../middleware/jobPortalAuthMiddleware');

// Public routes (Auth)
router.post('/register', candidateCtrl.registerCandidate);
router.post('/login', candidateCtrl.loginCandidate);

// Protected routes
router.get('/me', authenticateCandidate, candidateCtrl.getCandidateMe);
router.get('/dashboard', authenticateCandidate, candidateCtrl.getCandidateDashboard);
router.get('/check-status/:requirementId', authenticateCandidate, candidateCtrl.checkApplicationStatus);
router.get('/application/track/:applicationId', authenticateCandidate, candidateCtrl.trackApplication);

module.exports = router;
