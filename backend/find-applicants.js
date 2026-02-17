const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);

    // Since it's a multi-tenant app, we need to find the tenant DB
    const tenantId = '6965dccaf2f3f4f7c6893557';
    const requirementId = '699218a136d06ba12cbacadf';

    // The tenant DB name is usually prefixed or stored in a way the getTenantDB utility knows.
    // Let's check how getTenantDB works.

    console.log("Searching for applicants in all databases...");
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();

    for (const dbInfo of dbs.databases) {
        if (dbInfo.name.startsWith('tenant_') || dbInfo.name === 'hrms') {
            const db = mongoose.connection.useDb(dbInfo.name);
            const collections = await db.db.listCollections().toArray();
            if (collections.some(c => c.name === 'applicants')) {
                const applicants = await db.collection('applicants').find({
                    requirementId: new mongoose.Types.ObjectId(requirementId)
                }).toArray();

                if (applicants.length > 0) {
                    console.log(`Found ${applicants.length} applicants in ${dbInfo.name}:`);
                    applicants.forEach(a => console.log(` - ${a.email} (${a.name})`));
                }
            }
        }
    }

    await mongoose.disconnect();
}

run().catch(console.error);
