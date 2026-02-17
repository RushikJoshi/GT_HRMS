const mongoose = require('mongoose');
require('dotenv').config();

const DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';

async function cleanup() {
    try {
        console.log('🚀 Starting Tracking System Cleanup...');
        await mongoose.connect(DB_URI);
        console.log('✅ Connected to MongoDB');

        const collectionsToDrop = [
            'agent_connections',
            'agent_heartbeats',
            'device_sessions',
            'tracking_logs',
            'sessions' // Centralized session collection
        ];

        const db = mongoose.connection.db;
        const currentCollections = await db.listCollections().toArray();
        const collectionNames = currentCollections.map(c => c.name);

        for (const target of collectionsToDrop) {
            if (collectionNames.includes(target)) {
                await db.dropCollection(target);
                console.log(`🗑️  Dropped collection: ${target}`);
            } else {
                console.log(`ℹ️  Collection ${target} not found, skipping.`);
            }
        }

        // Optional: activity_logs might contain general audit logs too.
        // If we want to keep audit logs but remove agent-specific tracks:
        if (collectionNames.includes('activity_logs')) {
            // We'll keep activity_logs for now as it might be used for general events
            console.log('ℹ️  Keeping activity_logs (may contain general audit data).');
        }

        console.log('🎉 Cleanup Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup Failed:', error.message);
        process.exit(1);
    }
}

cleanup();
