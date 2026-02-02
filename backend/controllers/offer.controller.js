const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const OfferSchema = require('../models/Offer');

// GLOBAL MODEL for Shared Collection (Fixes 500 collections limit)
const GlobalOfferModel = mongoose.models.GlobalOffer || mongoose.model('GlobalOffer', OfferSchema, 'offers');

/**
 * Create a New Offer
 */
exports.createOfferRecord = async (req, res) => {
    try {
        const { applicantId, jobTitle, ctc, joiningDate, department, location, expiryHours } = req.body;

        // Use Tenant DB for Applicant Read
        const Applicant = req.tenantDB.model('Applicant');
        const applicant = await Applicant.findById(applicantId);

        if (!applicant) return res.status(404).json({ error: 'Applicant not found' });

        // 1. Mark previous offers as non-latest (Global DB)
        await GlobalOfferModel.updateMany(
            { candidateId: applicantId, tenantId: req.user.tenantId, isLatest: true },
            { isLatest: false, status: 'Revoked' }
        );

        // 2. Calculate Expiry
        const validHours = expiryHours || 48;
        const now = new Date();
        const expiry = new Date(now.getTime() + (validHours * 60 * 60 * 1000));
        const token = uuidv4();

        // 3. Create Offer in Global DB
        const newOffer = new GlobalOfferModel({
            tenantId: req.user.tenantId,
            candidateId: applicantId,
            jobId: applicant.requirementId, // Store ID

            jobTitle: jobTitle || applicant.jobTitle || 'Role',
            salary: ctc || applicant.ctc || 0,
            joiningDate: joiningDate || applicant.joiningDate,
            expiryDate: expiry,
            location: location || applicant.location,
            department: department || applicant.department,
            token,
            tokenExpiry: expiry,
            status: 'Draft',
            history: [{ action: 'Created', by: req.user.email || req.user.userId, timestamp: new Date(), metadata: { validHours } }],
            createdBy: req.user.userId,
            isLatest: true,

            // Snapshot Fields (Since we can't cross-db populate)
            candidateName: applicant.name,
            candidateEmail: applicant.email,
            pdfUrl: '',
        });

        await newOffer.save();

        res.status(201).json({ success: true, offer: newOffer });

    } catch (err) {
        console.error("Create Offer Error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * HR: List All Offers
 */
exports.getOffers = async (req, res) => {
    try {
        // Find offers in Global Collection belonging to this Tenant
        const offers = await GlobalOfferModel.find({ tenantId: req.user.tenantId })
            .sort({ createdAt: -1 });

        // Note: 'applicantId' and 'jobId' are NOT populated because they live in a different DB.
        // Frontend must rely on 'candidateName' and 'jobTitle' snapshot fields.

        res.json(offers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * HR: Get Offer Detail
 */
exports.getOfferById = async (req, res) => {
    try {
        const offer = await GlobalOfferModel.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!offer) return res.status(404).json({ error: "Offer not found" });
        res.json(offer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * HR: Cancel/Revoke Offer
 */
exports.cancelOffer = async (req, res) => {
    try {
        const offer = await GlobalOfferModel.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

        if (!offer) return res.status(404).json({ error: "Offer not found" });
        if (offer.status === 'Accepted' || offer.status === 'Rejected') {
            return res.status(400).json({ error: "Cannot cancel a finalized offer" });
        }

        offer.status = 'Revoked';
        offer.history.push({
            action: 'Revoked',
            by: req.user.name || req.user.userId,
            timestamp: new Date()
        });

        await offer.save();
        res.json({ success: true, message: "Offer Revoked Successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * HR: Re-Offer (Clone and Create New)
 */
exports.reOffer = async (req, res) => {
    try {
        const oldOffer = await GlobalOfferModel.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

        if (!oldOffer) return res.status(404).json({ error: "Original Offer not found" });

        // Update Old
        oldOffer.status = 'ReOffered';
        oldOffer.isLatest = false;
        await oldOffer.save();

        // Create New (Clone)
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 48);

        const newOffer = new GlobalOfferModel({
            tenantId: req.user.tenantId,
            candidateId: oldOffer.candidateId,
            jobId: oldOffer.jobId,

            jobTitle: oldOffer.jobTitle,
            department: oldOffer.department,
            location: oldOffer.location,
            salary: oldOffer.salary,
            joiningDate: oldOffer.joiningDate,

            candidateName: oldOffer.candidateName,
            candidateEmail: oldOffer.candidateEmail,

            offerDate: new Date(),
            expiryDate: expiry,
            token: uuidv4(),
            status: 'Sent',
            isLatest: true,
            // Copy File Details
            letterPath: oldOffer.letterPath,
            letterUrl: oldOffer.letterUrl,
            pdfUrl: oldOffer.pdfUrl,
            offerCode: oldOffer.offerCode, // Reuse code? Or generatet new? Usually re-offer uses same code.
            reofferCount: (oldOffer.reofferCount || 0) + 1,
            history: [{ action: 'Re-Offered', by: req.user.email || req.user.id, timestamp: new Date(), metadata: { fromOfferId: oldOffer._id } }]
        });

        await newOffer.save();
        res.json({ success: true, offer: newOffer, message: "Re-Offer Record Created" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUBLIC: Get Offer Details by Token
 * Note: Simpler now because Global Search works across tenants.
 */
exports.getPublicOffer = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) return res.status(400).json({ error: "Token required" });

        // Global Search
        const offer = await GlobalOfferModel.findOne({ token, isLatest: true });

        if (!offer) return res.status(404).json({ error: "Offer not found or invalid link" });

        // Check Expiry
        if (new Date() > offer.expiryDate) {
            return res.status(410).json({ error: "Offer link has expired", expired: true });
        }

        // Return limited details
        res.json({
            jobTitle: offer.jobTitle,
            offerDate: offer.offerDate,
            expiryDate: offer.expiryDate,
            ctc: offer.ctc,
            status: offer.status
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUBLIC: Accept Offer
 */
exports.acceptOffer = async (req, res) => {
    try {
        const { token } = req.params;
        const { ip } = req.body; // tenantId not strictly needed for lookup now

        const offer = await GlobalOfferModel.findOne({ token });
        if (!offer) return res.status(404).json({ error: 'Offer not found' });

        if (offer.status !== 'Sent' && offer.status !== 'Viewed') {
            return res.status(400).json({ error: `Offer is currently ${offer.status}` });
        }

        if (new Date() > offer.expiryDate) {
            return res.status(410).json({ error: 'Offer expired' });
        }

        // Update Offer
        offer.status = 'Accepted';
        offer.acceptedAt = new Date();
        offer.ipAddress = ip;
        offer.history.push({ action: 'Accepted', by: 'Candidate', timestamp: new Date() });
        await offer.save();

        // Update Applicant (Need to connect to correct Tenant DB)
        // We have offer.tenantId, so we can get the DB connection!
        const getTenantDB = require('../utils/tenantDB');
        const db = await getTenantDB(offer.tenantId);
        const Applicant = db.model('Applicant');

        await Applicant.findByIdAndUpdate(offer.candidateId, {
            status: 'Offer Accepted',
            hasOtherOffer: false
        });

        res.json({ success: true, message: "Offer Accepted Successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUBLIC: Reject Offer
 */
exports.rejectOffer = async (req, res) => {
    try {
        const { token } = req.params;
        const { reason } = req.body;

        const offer = await GlobalOfferModel.findOne({ token });
        if (!offer) return res.status(404).json({ error: 'Offer not found' });

        offer.status = 'Rejected';
        offer.rejectedAt = new Date();
        offer.rejectionReason = reason;
        offer.history.push({ action: 'Rejected', by: 'Candidate', metadata: { reason } });
        await offer.save();

        // Update Applicant
        const getTenantDB = require('../utils/tenantDB');
        const db = await getTenantDB(offer.tenantId);
        const Applicant = db.model('Applicant');

        await Applicant.findByIdAndUpdate(offer.candidateId, { status: 'Offer Rejected' });

        res.json({ success: true, message: "Offer Rejected" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
