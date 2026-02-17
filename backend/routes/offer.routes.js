const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offer.controller');
const auth = require('../middleware/auth.jwt');

// Sync Old Offers (Migration)
router.post('/sync', auth.authenticate, auth.requireHr, require('../scripts/syncOffers'));

// HR Protected Routes
router.get('/', auth.authenticate, auth.requireHr, offerController.getOffers);
router.get('/:id', auth.authenticate, auth.requireHr, offerController.getOfferById);
router.post('/reoffer/:id', auth.authenticate, auth.requireHr, offerController.reOffer);
router.post('/cancel/:id', auth.authenticate, auth.requireHr, offerController.cancelOffer);
router.post('/create', auth.authenticate, auth.requireHr, offerController.createOfferRecord);

// Public Candidate Routes
// These use the token in the URL parameter for identification
router.post('/public/accept/:token', offerController.acceptOffer);
router.post('/public/reject/:token', offerController.rejectOffer);
router.get('/public/:token', offerController.getPublicOffer);

module.exports = router;
