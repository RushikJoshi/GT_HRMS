const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

const { authenticate } = require('../middleware/auth.jwt');

// Multer error handler
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('❌ [MULTER ERROR]:', err.message);
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  next();
};

// Public job application route (no auth required)
// Public job application route (no auth required)
router.get('/jobs', publicController.getPublicJobs);
router.get('/resolve-code/:code', publicController.resolveCompanyCode);
router.get('/tenant/:tenantId', publicController.getTenantBasicDetails); // New endpoint
router.get('/jobs/:companyCode', publicController.getPublicJobsByCompanyCode);
router.get('/job/:id', publicController.getPublicJobById);
router.post('/apply-job', publicController.applyJob);

router.get('/career-customization/:tenantId', publicController.getCareerCustomization);

router.post('/resume/parse', publicController.parseResumePublic);
router.get('/test-ai', publicController.testGeminiAI);

const offerController = require('../controllers/offer.controller');

// Offer Management (Public)
router.get('/offer/:token', offerController.getPublicOffer);
router.post('/offer/:token/accept', offerController.acceptOffer);
router.post('/offer/:token/reject', offerController.rejectOffer);

module.exports = router;