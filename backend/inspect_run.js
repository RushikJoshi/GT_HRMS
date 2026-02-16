const mongoose = require('mongoose');
require('dotenv').config();

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const tenantId = '698b2b52eaaf4b1b30688ff4';
        const db = mongoose.connection.useDb(`company_${tenantId}`);

        const PayrollRun = db.model('PayrollRun', new mongoose.Schema({}, { strict: false }));
        const run = await PayrollRun.findOne({ month: 2, year: 2026 });

        console.log('Payroll Run Obj:', JSON.stringify(run, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

inspect();
