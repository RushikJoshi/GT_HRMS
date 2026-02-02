const mongoose = require('mongoose');
const crypto = require('crypto');
const OfferSchema = require('../models/Offer');

// Use SHARED Global Collection to bypass "500 collections" limit.
const GlobalOfferModel = mongoose.models.GlobalOffer || mongoose.model('GlobalOffer', OfferSchema, 'offers');

async function syncOffers(req, res) {
    try {
        console.log('🔄 [SYNC OFFERS] Starting synchronization...');

        if (!req.tenantDB.models.Applicant) req.tenantDB.model('Applicant', require('../models/Applicant'));
        const ApplicantModel = req.tenantDB.model('Applicant');

        // Find candidates where offerId is null but they have some offer data
        const applicants = await ApplicantModel.find({
            offerId: null,
            $or: [
                { offerLetterPath: { $exists: true, $ne: '' } },
                { status: { $in: ['Offer Issued', 'Selected', 'Offer Accepted', 'Joined', 'Offer Rejected', 'Finalized'] } }
            ]
        }).populate('requirementId');

        console.log(`🔍 Found ${applicants.length} candidates needing sync.`);

        let syncedCount = 0;
        let errorCount = 0;
        let details = [];

        for (const app of applicants) {
            try {
                // Check if an offer already exists for this app in Global Collection (Double check)
                const existing = await GlobalOfferModel.findOne({
                    candidateId: app._id,
                    tenantId: req.user.tenantId
                });

                if (existing) {
                    app.offerId = existing._id;
                    await app.save();
                    details.push(`Linked existing offer for ${app.name}`);
                    continue;
                }

                // Legacy Mapping
                const nestedOffer = (app.toObject && app.toObject().offer) || {};

                let status = nestedOffer.status || app.status;
                if (status === 'Offer Issued') status = 'Sent';
                if (status === 'Selected') status = 'Sent';
                if (status === 'Offer Accepted') status = 'Accepted';
                if (status === 'Offer Rejected') status = 'Rejected';
                if (status === 'Joined') status = 'Accepted';
                if (status === 'Finalized') status = 'Sent';
                if (!['Sent', 'Accepted', 'ReOffered', 'Expired', 'Rejected'].includes(status)) {
                    status = 'Sent';
                }

                let offerDate = nestedOffer.offerDate || app.createdAt || new Date();
                let expiryDate = nestedOffer.expiryDate;
                if (!expiryDate) {
                    expiryDate = new Date(offerDate);
                    expiryDate.setHours(expiryDate.getHours() + 48);
                }

                let salary = nestedOffer.salary || 0;
                if (!salary) {
                    if (app.salarySnapshot && app.salarySnapshot.ctcMonthly) salary = app.salarySnapshot.ctcMonthly * 12;
                    else if (app.currentCTC) salary = parseFloat(String(app.currentCTC).replace(/,/g, '')) || 0;
                }

                const newOffer = new GlobalOfferModel({
                    tenantId: req.user.tenantId,
                    candidateId: app._id,
                    candidateName: app.name,
                    candidateEmail: app.email,
                    jobId: app.requirementId?._id || new mongoose.Types.ObjectId(), // Fallback if no requirement
                    jobTitle: app.requirementId?.jobTitle || app.currentDesignation || 'Unknown Role',
                    salary: salary,
                    status: status,
                    offerDate: offerDate,
                    expiryDate: expiryDate,
                    pdfUrl: nestedOffer.pdfUrl || app.offerLetterPath || '',
                    token: crypto.randomBytes(32).toString('hex'),
                    isLatest: true,
                    reofferCount: 0
                });

                await newOffer.save();

                // Save back to Applicant
                app.offerId = newOffer._id;
                await app.save();

                syncedCount++;
                details.push(`Created: ${app.name}`);

            } catch (err) {
                errorCount++;
                console.error(`Error syncing ${app.name}:`, err.message);
                details.push(`Error ${app.name}: ${err.message}`);
            }
        }

        const result = {
            Found: applicants.length,
            Created: syncedCount,
            Errors: errorCount,
            details: details
        };

        console.log('Sync Result:', result);

        if (res) {
            res.json(result);
        }

    } catch (e) {
        console.error('Sync Engine Fatal Error:', e);
        if (res) res.status(500).json({ error: e.message });
    }
}

module.exports = syncOffers;
