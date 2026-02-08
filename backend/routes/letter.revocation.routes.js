/**
 * LETTER DOCUMENT REVOCATION ROUTES
 * 
 * Enterprise document management endpoints for:
 * - Revoking offers/letters
 * - Reinstating revoked documents
 * - Audit trail tracking
 * - Access control enforcement
 * 
 * ✅ Role-based access control
 * ✅ Full audit logging
 * ✅ Non-destructive operations
 * ✅ Production-ready error handling
 */

const express = require('express');
const router = express.Router();
const letterCtrl = require('../controllers/letter.controller');
const { authenticate, requireHr, requireAdmin } = require('../middleware/auth.jwt');

console.log('📋 Letter Document Management routes loaded');

// =========================================================================
// DOCUMENT STATUS & ACCESS CONTROL
// =========================================================================

/**
 * GET /api/letters/documents/:documentId/status
 * Check current status of a document (revoked, viewed, expired, etc.)
 * Public read access - check if document is accessible
 */
router.get('/documents/:documentId/status', letterCtrl.getDocumentStatus);

/**
 * GET /api/letters/documents/:documentId/enforce-access
 * Validate if user has access to document before serving
 * Called by frontend before attempting download/view
 */
router.get('/documents/:documentId/enforce-access', authenticate, letterCtrl.enforceDocumentAccess);

// =========================================================================
// REVOCATION & REINSTATEMENT
// =========================================================================

/**
 * POST /api/letters/documents/:documentId/revoke
 * Revoke an offer/letter (HR/Admin only)
 * 
 * Request body:
 * {
 *   "reason": "duplicate_offer" | "candidate_rejected" | "position_cancelled" | "business_decision" | "process_error" | "compliance_issue" | "other",
 *   "reasonDetails": "Optional detailed reason for audit trail"
 * }
 * 
 * Returns:
 * {
 *   "success": true,
 *   "data": {
 *     "revocationId": "...",
 *     "documentId": "...",
 *     "revokedAt": "2026-02-07T...",
 *     "reason": "...",
 *     "notificationSent": true/false
 *   }
 * }
 */
router.post('/documents/:documentId/revoke', authenticate, requireHr, letterCtrl.revokeLetter);

/**
 * POST /api/letters/revocations/:revocationId/reinstate
 * Reinstate a revoked offer/letter (Super-Admin only)
 * Reversible - maintains full audit trail
 * 
 * Request body:
 * {
 *   "reinstatedReason": "Optional reason for reinstatement"
 * }
 * 
 * Returns:
 * {
 *   "success": true,
 *   "data": {
 *     "revocationId": "...",
 *     "documentId": "...",
 *     "reinstatedAt": "2026-02-07T..."
 *   }
 * }
 */
router.post('/revocations/:revocationId/reinstate', authenticate, requireAdmin, letterCtrl.reinstateLetter);

// =========================================================================
// AUDIT & COMPLIANCE
// =========================================================================

/**
 * GET /api/letters/documents/:documentId/audit-trail
 * Get complete audit history of a document
 * Who created, accessed, downloaded, revoked, etc.
 * HR/Admin only - sensitive information
 * 
 * Query params:
 * - limit: maximum number of records to return (default: 100)
 * 
 * Returns:
 * {
 *   "success": true,
 *   "data": {
 *     "documentId": "...",
 *     "auditTrail": [ {...}, ... ],
 *     "count": 42
 *   }
 * }
 */
router.get('/documents/:documentId/audit-trail', authenticate, requireHr, letterCtrl.getDocumentAuditTrail);

/**
 * GET /api/letters/documents/:documentId/revocation-history
 * Get all revocation and reinstatement events for a document
 * HR/Admin only
 * 
 * Returns:
 * {
 *   "success": true,
 *   "data": {
 *     "documentId": "...",
 *     "revocationHistory": [ {...}, ... ],
 *     "count": 5
 *   }
 * }
 */
router.get('/documents/:documentId/revocation-history', authenticate, requireHr, letterCtrl.getRevocationHistory);

// =========================================================================
// ERROR HANDLING
// =========================================================================

// Catch-all for undefined routes in this router
router.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error handler
router.use((err, req, res, next) => {
    console.error('❌ [LETTER ROUTES] Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        code: err.code
    });
});

module.exports = router;
