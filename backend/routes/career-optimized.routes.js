const express = require('express');
const router = express.Router();
const careerController = require('../controllers/career-optimized.controller');
const payloadValidator = require('../middleware/payloadValidator');

// Tenant detection middleware (gets tenantId from X-Tenant-ID header)
const tenantMiddleware = (req, res, next) => {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required (X-Tenant-ID header)' });
    }
    req.tenantId = tenantId;
    next();
};

// Apply tenant detection to all routes
router.use(tenantMiddleware);

// ============= DRAFT OPERATIONS =============

// Save SEO settings (small, separate document)
router.post('/seo/save', payloadValidator(10), careerController.saveSEOSettings);

// Save sections (each section separately, max 2MB each)
router.post('/sections/save', payloadValidator(10), careerController.saveSections);

// Get current draft data for editing
router.get('/draft', careerController.getDraftData);

// ============= PUBLISH OPERATIONS =============

// Publish all draft data to live (merges from 3 collections)
router.post('/publish', careerController.publishLive);

// ============= PUBLIC ENDPOINTS =============

// Get public published career page (for frontend display)
router.get('/public/:tenantId', careerController.getPublicPage);

// Keep old endpoint for backward compatibility
router.get('/public-customization/:tenantId', careerController.getPublicPage);

module.exports = router;
