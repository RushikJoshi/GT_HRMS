const mongoose = require('mongoose');
require('dotenv').config();

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hrms_tenants_data');
        console.log("Connected to Main DB");

        const tenantId = '696b2e33265b093e28c2419b';
        const userId = '696b308d265b093e28c2430c';

        // When run from backend folder
        const getTenantDB = require('./utils/tenantDB');
        const db = await getTenantDB(tenantId);
        console.log("Connected to Tenant DB");

        const Employee = db.model('Employee');
        const user = await Employee.findById(userId);

        if (user) {
            console.log("--- USER DIAGNOSTIC ---");
            console.log("Name:       ", user.firstName, user.lastName);
            console.log("Email:      ", user.email);
            console.log("Role in DB: ", user.role);
            console.log("Manager:    ", user.manager);
            console.log("-----------------------");
        } else {
            console.log("USER NOT FOUND IN TENANT DB (ID: " + userId + ")");
        }
    } catch (err) {
        console.error("DIAGNOSTIC FAILED:", err);
    }
    process.exit(0);
}

diagnose();
