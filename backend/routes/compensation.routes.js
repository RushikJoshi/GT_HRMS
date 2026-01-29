const express = require('express');
const router = express.Router();
const compensationController = require('../controllers/compensation.controller');

router.get('/list', compensationController.getCompensationList);
router.post('/increment', compensationController.createIncrement);
router.get('/history/:employeeId', compensationController.getCompensationHistory);

module.exports = router;
