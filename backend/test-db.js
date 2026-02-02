const mongoose = require('mongoose');
require('dotenv').config();
const OfferSchema = require('./models/Offer');

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected');
        const GlobalOfferModel = mongoose.model('GlobalOffer', OfferSchema, 'offers');
        const count = await GlobalOfferModel.countDocuments();
        console.log('Offer Count:', count);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in Primary DB:', collections.map(c => c.name));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
