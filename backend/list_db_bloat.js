const mongoose = require('mongoose');
require('dotenv').config();

async function listAll() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();

        console.log('Total Databases:', dbs.databases.length);

        let totalCollections = 0;
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            console.log(`${dbName}: ${collections.length} collections`);
            totalCollections += collections.length;
        }

        console.log('---');
        console.log('Grand Total Collections:', totalCollections);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

listAll();
