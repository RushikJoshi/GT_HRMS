const cron = require('node-cron');
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const getTenantDB = require('../utils/tenantDB');
const OfferSchema = require('../models/Offer');

// GLOBAL MODEL for Shared Collection
const GlobalOfferModel = mongoose.models.GlobalOffer || mongoose.model('GlobalOffer', OfferSchema, 'offers');

/**
 * Offer Lifecycle Cron Service
 * Enterprise grade: Handles auto-expiry across all tenants using Global Collection.
 */
class OfferCronService {
    constructor() {
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;

        console.log('⏰ [CRON] Starting Offer Lifecycle Service');

        // Expiry Engine: Run every 5 minutes for rapid processing
        cron.schedule('*/5 * * * *', this.handleExpiry.bind(this));

        // Reminder Engine: Run every hour
        cron.schedule('0 * * * *', this.handleReminders.bind(this));

        this.isRunning = true;
    }

    async handleExpiry() {
        try {
            console.log('⏰ [CRON] Running Expiry Checks (Global)...');
            const now = new Date();

            // Find all "Sent" or "ReOffered" offers that have passed their expiry date
            const expiredOffers = await GlobalOfferModel.find({
                status: { $in: ['Sent', 'ReOffered'] },
                expiryDate: { $lt: now }
            });

            if (expiredOffers.length === 0) {
                console.log('⏰ [CRON] No expired offers found.');
                return;
            }

            console.log(`⏰ [CRON] Found ${expiredOffers.length} expired offers. Processing...`);

            for (const offer of expiredOffers) {
                try {
                    // 1. Update Offer Record
                    offer.status = 'Expired';
                    offer.history.push({
                        action: 'Expired',
                        by: 'System (Cron)',
                        timestamp: now,
                        metadata: { reason: 'Time Expiry' }
                    });
                    await offer.save();

                    // 2. Update Applicant in Tenant DB
                    const db = await getTenantDB(offer.tenantId);
                    if (db) {
                        if (!db.models.Applicant) try { db.model('Applicant', require('../models/Applicant')); } catch (e) { }
                        const Applicant = db.model('Applicant');
                        await Applicant.findByIdAndUpdate(offer.candidateId, { status: 'Offer Expired' });
                    }

                    console.log(`✅ [CRON] Offer ${offer._id} for ${offer.candidateName} marked as Expired.`);

                } catch (err) {
                    console.error(`❌ [CRON] Error processing expiry for offer ${offer._id}:`, err.message);
                }
            }

        } catch (err) {
            console.error('⏰ [CRON] Fatal Error in Expiry Job:', err);
        }
    }

    async handleReminders() {
        // Reminders logic can be added here (e.g. email candidates 24h before expiry)
        console.log('⏰ [CRON] Reminders check placeholder.');
    }
}

module.exports = new OfferCronService();
