const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const { authenticate, requireHr } = require('../middleware/auth.jwt');

router.get('/templates', authenticate, feedbackController.getTemplates);
router.post('/templates', authenticate, requireHr, feedbackController.createTemplate);
router.get('/stage/:candidateId/:stageId', authenticate, feedbackController.getStageFeedback);
router.post('/submit', authenticate, feedbackController.submitFeedback);

module.exports = router;
