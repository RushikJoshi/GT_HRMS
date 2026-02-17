const mongoose = require('mongoose');
require('dotenv').config();
const OfferSchema = require('./models/Offer');

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const GlobalOfferModel = mongoose.model('GlobalOffer', OfferSchema, 'offers');
        const offer = await GlobalOfferModel.findOne().lean();
        console.log('Sample Offer:', JSON.stringify(offer, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
inspect();
