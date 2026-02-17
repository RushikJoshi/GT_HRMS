const mongoose = require('mongoose');
require('dotenv').config();

async function countAll() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();

        let totalCollections = 0;
        console.log('Database List:');
        for (const dbInfo of dbs.databases) {
            const db = mongoose.connection.useDb(dbInfo.name);
            const collections = await db.db.listCollections().toArray();
            console.log(`- ${dbInfo.name}: ${collections.length} collections`);
            totalCollections += collections.length;
        }

        console.log('----------------------------');
        console.log('Total Collections in Cluster:', totalCollections);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
countAll();
