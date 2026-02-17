/**
 * ═══════════════════════════════════════════════════════════════════════
 * RECRUITMENT WORKFLOW ROUTES
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * API endpoints for the complete recruitment workflow
 * 
 * @version 2.0
 */

const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/recruitment.workflow.controller');
const { authenticate } = require('../middleware/auth.jwt');

// Apply authentication middleware to all routes
router.use(authenticate);
// Tenant DB binding is handled by global tenantMiddleware in app.js

// ═══════════════════════════════════════════════════════════════════
// APPLICATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/recruitment/applications
 * @desc    Create new job application
 * @access  Public (Candidate) / Private (HR)
 */
router.post('/applications', workflowController.createApplication);

/**
 * @route   PATCH /api/recruitment/applications/:applicationId/status
 * @desc    Update application status
 * @access  Private (HR)
 */
router.patch('/applications/:applicationId/status', workflowController.updateApplicationStatus);

/**
 * @route   GET /api/recruitment/pipeline
 * @desc    Get recruitment pipeline statistics
 * @access  Private (HR)
 * @query   jobId (optional) - Filter by specific job
 */
router.get('/pipeline', workflowController.getRecruitmentPipeline);

// ═══════════════════════════════════════════════════════════════════
// INTERVIEW MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/recruitment/applications/:applicationId/interviews
 * @desc    Schedule interview for application
 * @access  Private (HR)
 */
router.post('/applications/:applicationId/interviews', workflowController.scheduleInterview);

// ═══════════════════════════════════════════════════════════════════
// OFFER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/recruitment/applications/:applicationId/offer
 * @desc    Create offer letter for selected candidate
 * @access  Private (HR)
 */
router.post('/applications/:applicationId/offer', workflowController.createOffer);

/**
 * @route   POST /api/recruitment/offers/:offerId/send
 * @desc    Send offer letter to candidate
 * @access  Private (HR)
 */
router.post('/offers/:offerId/send', workflowController.sendOffer);

/**
 * @route   POST /api/recruitment/offers/:offerId/accept
 * @desc    Candidate accepts offer
 * @access  Public (Candidate with token) / Private (HR on behalf)
 */
router.post('/offers/:offerId/accept', workflowController.acceptOffer);

// ═══════════════════════════════════════════════════════════════════
// EMPLOYEE CONVERSION
// ═══════════════════════════════════════════════════════════════════

/**
 * @route   POST /api/recruitment/offers/:offerId/convert-to-employee
 * @desc    Convert accepted offer to employee
 * @access  Private (HR)
 */
router.post('/offers/:offerId/convert-to-employee', workflowController.convertToEmployee);

module.exports = router;
