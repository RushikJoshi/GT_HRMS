const express = require('express');
const router = express.Router();
const aiCtrl = require('../controllers/ai.controller');
const auth = require('../middleware/auth.jwt');

router.post('/generate-job-description', auth.authenticate, auth.requireHr, aiCtrl.generateJobDescription);

module.exports = router;
