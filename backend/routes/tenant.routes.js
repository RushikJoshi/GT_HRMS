const router = require('express').Router();
const ctrl = require('../controllers/tenant.controller');
const auth = require('../middleware/auth.jwt');
// TODO: protect routes with auth/role middleware later (e.g., isSuperAdmin)

console.log('[DEBUG] Loading Tenant Routes...');

// Only register routes if the corresponding controller method exists
// Register PSA stats route
router.get('/psa/stats', ctrl.psaStats);

// tenant self info for HR users
console.log('[DEBUG] Registering /me route...');
router.get('/me', auth.authenticate, auth.requireHr, ctrl.getMyTenant);

router.get('/', ctrl.listTenants);
router.post('/', ctrl.createTenant);
router.get('/:id', ctrl.getTenant);

// Send activation email with credentials and activation link
router.post('/:id/send-activation', ctrl.sendActivationEmail);

// Send activation via SMS
router.post('/:id/send-activation-sms', ctrl.sendActivationSms);

// Activation link handler
router.get('/activate', ctrl.activateTenant);

router.put('/:id', ctrl.updateTenant);

router.delete('/:id', ctrl.deleteTenant);

// modules
router.put('/:id/modules', ctrl.updateModules);

module.exports = router;