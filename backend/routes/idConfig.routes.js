/**
 * ═══════════════════════════════════════════════════════════════════════
 * COMPANY ID CONFIGURATION ROUTES
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * API endpoints for managing company ID format configurations.
 * 
 * @version 2.0
 */

const express = require('express');
const router = express.Router();
const idConfigController = require('../controllers/idConfig.controller');

// Middleware
const { authenticate, authorize } = require('../middleware/auth.jwt');

// Apply authentication
router.use(authenticate);
// Note: tenantMiddleware is applied globally in app.js, so DB binding happens there.

// ═══════════════════════════════════════════════════════════════════
// ID CONFIGURATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/id-config
 * @desc    Get company ID configuration
 * @access  Private (Admin, HR)
 */
router.get('/',
    authorize(['admin', 'hr', 'psa']),
    idConfigController.getIdConfiguration
);

/**
 * @route   GET /api/id-config/status
 * @desc    Get configuration status (locked/unlocked)
 * @access  Private (Admin, HR)
 */
router.get('/status',
    authorize(['admin', 'hr', 'psa']),
    idConfigController.getConfigurationStatus
);

/**
 * @route   GET /api/id-config/:entityType/preview
 * @desc    Preview ID format without generating
 * @access  Private (Admin, HR)
 * @query   department, year, month (optional)
 */
router.get('/:entityType/preview',
    authorize(['admin', 'hr', 'psa']),
    idConfigController.previewIdFormat
);

/**
 * @route   PATCH /api/id-config/:entityType
 * @desc    Update ID configuration for specific entity type
 * @access  Private (Admin only)
 * @body    {
 *            prefix: String,
 *            separator: String,
 *            includeYear: Boolean,
 *            yearFormat: 'YYYY' | 'YY',
 *            includeMonth: Boolean,
 *            monthFormat: 'MM' | 'M',
 *            includeDepartment: Boolean,
 *            departmentFormat: 'CODE' | 'FULL',
 *            paddingLength: Number,
 *            resetPolicy: 'YEARLY' | 'MONTHLY' | 'NEVER',
 *            startingNumber: Number
 *          }
 */
router.patch('/:entityType',
    authorize(['admin', 'psa']),
    idConfigController.updateIdConfiguration
);

/**
 * @route   POST /api/id-config/:entityType/reset
 * @desc    Reset configuration to defaults (only if not locked)
 * @access  Private (Admin only)
 */
router.post('/:entityType/reset',
    authorize(['admin', 'psa']),
    idConfigController.resetIdConfiguration
);

module.exports = router;
