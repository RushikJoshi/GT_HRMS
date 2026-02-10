const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function check() {
    console.log('Connecting to:', MONGO_URI);
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        const Tenant = mongoose.model('Tenant', new mongoose.Schema({}), 'tenants');
        const count = await Tenant.countDocuments();
        console.log('Tenant count:', count);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

check();
