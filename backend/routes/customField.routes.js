const express = require('express');
const router = express.Router();
const customFieldCtrl = require('../controllers/customField.controller');
const auth = require('../middleware/auth.jwt');

// All routes are protected by default (auth + tenant)
router.use(auth.authenticate);
router.use(auth.requireHr); // Only HR can manage custom fields

router.get('/', customFieldCtrl.getAll); // Fetch all active fields
router.post('/', customFieldCtrl.create); // Create new
router.put('/:id', customFieldCtrl.update); // Update (label, required, etc)
router.delete('/:id', customFieldCtrl.delete); // Soft delete

module.exports = router;
