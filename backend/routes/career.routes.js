const express = require('express');
const router = express.Router();
const careerController = require('../controllers/career.controller');
const { authenticate, requireHr } = require('../middleware/auth.jwt');

router.get('/customize', authenticate, requireHr, careerController.getCustomization);
router.post('/customize', authenticate, requireHr, careerController.saveCustomization);
router.post('/publish', authenticate, requireHr, careerController.publishCustomization);

module.exports = router;
