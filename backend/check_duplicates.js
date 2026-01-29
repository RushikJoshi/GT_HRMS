const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms';

async function checkDuplicates() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.useDb('hrms_tenants_data');
        const Employees = db.collection('employees');

        const results = await Employees.find({
            $or: [{ firstName: /Harsh/i }, { lastName: /Shah/i }]
        }).toArray();

        console.log(`Found ${results.length} records matching "Harsh" or "Shah":`);
        results.forEach(r => {
            console.log(`- [${r._id}] Name: ${r.firstName} ${r.lastName} | Email: ${r.email} | Tenant: ${r.tenant} | Policy: ${r.leavePolicy}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDuplicates();
