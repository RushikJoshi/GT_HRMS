/**
 * MongoDB Cluster-Wide Analysis
 * 
 * This script analyzes ALL databases in the cluster to find the 500 collection issue
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function analyzeCluster() {
    try {
        console.log('🔍 Connecting to MongoDB Cluster...\n');
        await mongoose.connect(MONGO_URI);

        const adminDb = mongoose.connection.db.admin();

        // List all databases
        const { databases } = await adminDb.listDatabases();

        console.log('═══════════════════════════════════════════════════════');
        console.log('              CLUSTER-WIDE ANALYSIS                    ');
        console.log('═══════════════════════════════════════════════════════\n');

        let totalCollections = 0;
        const dbStats = [];

        for (const dbInfo of databases) {
            const dbName = dbInfo.name;

            // Skip system databases
            if (dbName === 'admin' || dbName === 'local' || dbName === 'config') {
                continue;
            }

            const db = mongoose.connection.client.db(dbName);
            const collections = await db.listCollections().toArray();
            const collectionCount = collections.length;
            totalCollections += collectionCount;

            dbStats.push({
                name: dbName,
                collections: collectionCount,
                size: (dbInfo.sizeOnDisk / (1024 * 1024)).toFixed(2) + ' MB',
                empty: dbInfo.empty || false
            });
        }

        // Sort by collection count (descending)
        dbStats.sort((a, b) => b.collections - a.collections);

        // Print database stats
        console.log('📊 DATABASES IN CLUSTER:\n');
        dbStats.forEach((db, idx) => {
            const emoji = db.collections > 100 ? '🔴' : db.collections > 50 ? '🟡' : '🟢';
            console.log(`${emoji} ${idx + 1}. ${db.name}`);
            console.log(`   Collections: ${db.collections}`);
            console.log(`   Size: ${db.size}`);
            console.log(`   Empty: ${db.empty ? 'Yes' : 'No'}\n`);
        });

        console.log('═══════════════════════════════════════════════════════');
        console.log('                    CLUSTER SUMMARY                    ');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log(`Total Databases: ${dbStats.length}`);
        console.log(`Total Collections: ${totalCollections}/500`);
        console.log(`Remaining Capacity: ${500 - totalCollections} collections\n`);

        if (totalCollections >= 500) {
            console.log('🔴 CRITICAL: You have reached the 500 collection limit!\n');
            console.log('SOLUTIONS:');
            console.log('1. Delete unused databases');
            console.log('2. Clean up empty collections');
            console.log('3. Upgrade to a paid tier (M10+)');
            console.log('4. Consolidate tenant data into fewer collections\n');
        } else if (totalCollections >= 450) {
            console.log('🟡 WARNING: Approaching the 500 collection limit!\n');
        } else {
            console.log('🟢 OK: You have plenty of space available.\n');
        }

        // Find databases with most collections
        const topDatabases = dbStats.slice(0, 5);
        if (topDatabases.length > 0) {
            console.log('═══════════════════════════════════════════════════════');
            console.log('           TOP DATABASES BY COLLECTION COUNT           ');
            console.log('═══════════════════════════════════════════════════════\n');
            topDatabases.forEach((db, idx) => {
                console.log(`${idx + 1}. ${db.name}: ${db.collections} collections`);
            });
            console.log();
        }

        await mongoose.disconnect();
        console.log('✅ Analysis complete!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

async function deleteDatabase(dbName) {
    try {
        console.log(`⚠️  WARNING: About to delete database: ${dbName}\n`);
        console.log('This action is IRREVERSIBLE!\n');
        console.log('Press Ctrl+C to cancel, or wait 10 seconds to continue...\n');

        await new Promise(resolve => setTimeout(resolve, 10000));

        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.client.db(dbName);
        await db.dropDatabase();

        console.log(`✅ Database "${dbName}" deleted successfully!\n`);

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--delete-db')) {
    const dbName = args[args.indexOf('--delete-db') + 1];
    if (!dbName) {
        console.error('❌ Error: Please specify a database name');
        console.log('Usage: node scripts/cluster-analysis.js --delete-db <database_name>');
        process.exit(1);
    }
    deleteDatabase(dbName);
} else {
    analyzeCluster();
}
