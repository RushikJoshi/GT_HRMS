const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const tenantId = '6965dccaf2f3f4f7c6893557';
    const requirementId = '699218a136d06ba12cbacadf';

    console.log(`Clearing ALL applicants for job: ${requirementId} in tenant: ${tenantId}...`);

    const dbName = `company_${tenantId}`;
    const db = mongoose.connection.useDb(dbName);

    const delResult = await db.collection('applicants').deleteMany({
        requirementId: new mongoose.Types.ObjectId(requirementId)
    });

    console.log(`Successfully deleted ${delResult.deletedCount} applicants.`);
    console.log("✅ You can now submit your application again.");

    await mongoose.disconnect();
}

run().catch(console.error);
