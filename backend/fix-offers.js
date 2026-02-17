const mongoose = require('mongoose');
require('dotenv').config();
const OfferSchema = require('./models/Offer');

async function fixOffers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected');

        const GlobalOfferModel = mongoose.model('GlobalOffer', OfferSchema, 'offers');

        // Find all offers where candidateId is missing but applicantId exists (in the raw doc)
        const offers = await GlobalOfferModel.find({});
        console.log(`Checking ${offers.length} offers...`);

        let fixedCount = 0;
        for (const offer of offers) {
            let changed = false;
            const raw = offer.toObject();

            // Fix candidateId from applicantId if missing
            if (!offer.candidateId && raw.applicantId) {
                offer.candidateId = raw.applicantId;
                changed = true;
            }

            // Fix salary from ctc if missing
            if (!offer.salary && raw.ctc) {
                offer.salary = raw.ctc;
                changed = true;
            }

            if (changed) {
                await offer.save();
                fixedCount++;
            }
        }

        console.log(`Fixed ${fixedCount} offers.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fixOffers();
