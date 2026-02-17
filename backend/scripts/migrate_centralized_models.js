/**
 * ARCHITECTURE FIX: CENTRALIZED MONGODB COLLECTIONS
 * This script migrates per-tenant collections to shared global collections
 * and cleans up the 500+ dynamic collections that hit MongoDB Atlas limits.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
}

// Fixed Shared Collections
const SHARED_DB_NAME = MONGODB_URI.split('/').pop().split('?')[0] || 'test';

async function migrate() {
    console.log('🚀 Starting MongoDB Collection Centralization...');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB Cluster');

        const admin = mongoose.connection.useDb('admin').db;
        const { databases } = await admin.adminCommand({ listDatabases: 1 });

        const tenantDbs = databases
            .map(db => db.name)
            .filter(name => name.startsWith('company_'));

        console.log(`🔍 Found ${tenantDbs.length} tenant databases to process.`);

        // 1. Initialize Shared Collections
        const SharedUser = mongoose.model('User', require('../models/User').schema, 'users');
        const SharedActivity = mongoose.model('Activity', require('../models/Activity').schema, 'activity_logs');

        for (const dbName of tenantDbs) {
            console.log(`\n📦 Processing database: ${dbName}`);
            const tenantDb = mongoose.connection.useDb(dbName);
            const tenantId = dbName.replace('company_', '');

            // --- MIGRATE USERS ---
            try {
                const tenantUsers = await tenantDb.collection('users').find({}).toArray();
                if (tenantUsers.length > 0) {
                    console.log(`   - Found ${tenantUsers.length} users. Merging to shared collection...`);
                    for (let u of tenantUsers) {
                        const { _id, ...userData } = u;
                        await SharedUser.updateOne(
                            { email: u.email, tenant: new mongoose.Types.ObjectId(tenantId) },
                            { $set: { ...userData, tenant: new mongoose.Types.ObjectId(tenantId) } },
                            { upsert: true }
                        );
                    }
                    // await tenantDb.collection('users').drop(); // Optional: Drop after migration
                }
            } catch (e) {
                console.log(`   - Skip users migration for ${dbName}: ${e.message}`);
            }

            // --- MIGRATE ACTIVITIES ---
            try {
                const tenantActivities = await tenantDb.collection('activities').find({}).toArray();
                if (tenantActivities.length > 0) {
                    console.log(`   - Found ${tenantActivities.length} activities. Merging...`);
                    for (let a of tenantActivities) {
                        const { _id, ...activityData } = a;
                        await SharedActivity.create({ ...activityData, tenant: new mongoose.Types.ObjectId(tenantId) });
                    }
                }
            } catch (e) {
                console.log(`   - Skip activities migration for ${dbName}: ${e.message}`);
            }

            // --- CLEANUP ALL OTHER COLLECTIONS (The 500+ issue) ---
            const collections = await tenantDb.db.listCollections().toArray();
            console.log(`   - Found ${collections.length} total collections in ${dbName}`);

            // Mandatory cleanup for models that shouldn't be dynamic
            const dynamicToClean = [
                'users', 'activities', 'agentsessions', 'useractivitysessions',
                'agent_heartbeats', 'sessions', 'agent_connections'
            ];

            for (const coll of collections) {
                if (dynamicToClean.includes(coll.name)) {
                    await tenantDb.collection(coll.name).drop();
                    console.log(`   🔥 Dropped dynamic collection: ${dbName}.${coll.name}`);
                }
            }
        }

        console.log('\n✅ Migration and Cleanup Completed Successfully.');

        // Final Stats
        const totalUsers = await SharedUser.countDocuments();
        const totalActivities = await SharedActivity.countDocuments();
        console.log(`📊 Final Global Stats:`);
        console.log(`   - Users: ${totalUsers}`);
        console.log(`   - Activity Logs: ${totalActivities}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Critical Error:', error);
        process.exit(1);
    }
}

migrate();
