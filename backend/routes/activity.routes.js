const express = require('express');
const router = express.Router();
const activityCtrl = require('../controllers/activity.controller');
const auth = require('../middleware/auth.jwt');

// Regular activity endpoints (Tenant context)
router.get('/', auth.authenticate, activityCtrl.getRecent);
router.post('/', auth.authenticate, activityCtrl.create);
router.delete('/:id', auth.authenticate, activityCtrl.delete);

// PSA endpoint (Across all tenants)
router.get('/psa/all', auth.authenticate, auth.requirePsa, activityCtrl.getAllActivities);

module.exports = router;
