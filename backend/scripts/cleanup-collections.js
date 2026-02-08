/**
 * MongoDB Collection Cleanup Script
 * 
 * This script helps identify and clean up unnecessary collections
 * to resolve the "500 collections limit" error in MongoDB Atlas.
 * 
 * Usage: node scripts/cleanup-collections.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function analyzeCollections() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;

        // Get all collections
        const collections = await db.listCollections().toArray();
        console.log(`📊 Total Collections: ${collections.length}/500\n`);

        // Categorize collections
        const categories = {
            tenant: [],
            system: [],
            test: [],
            temp: [],
            empty: [],
            other: []
        };

        console.log('📋 Analyzing collections...\n');

        for (const collection of collections) {
            const name = collection.name;

            // Get collection stats
            let count = 0;
            let size = 0;

            try {
                count = await db.collection(name).estimatedDocumentCount();
                // Size estimation (not exact, but good enough)
                const sampleDoc = await db.collection(name).findOne();
                if (sampleDoc) {
                    const docSize = JSON.stringify(sampleDoc).length;
                    size = docSize * count;
                }
            } catch (err) {
                // Skip system collections that might error
                continue;
            }

            const collectionInfo = {
                name,
                count,
                size: (size / 1024).toFixed(2) + ' KB'
            };

            // Categorize
            if (name.includes('tenant_') || name.includes('_tenant')) {
                categories.tenant.push(collectionInfo);
            } else if (name.startsWith('system.')) {
                categories.system.push(collectionInfo);
            } else if (name.includes('test') || name.includes('Test')) {
                categories.test.push(collectionInfo);
            } else if (name.includes('temp') || name.includes('Temp')) {
                categories.temp.push(collectionInfo);
            } else if (count === 0) {
                categories.empty.push(collectionInfo);
            } else {
                categories.other.push(collectionInfo);
            }
        }

        // Print analysis
        console.log('═══════════════════════════════════════════════════════');
        console.log('                  COLLECTION ANALYSIS                  ');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log(`🏢 Tenant Collections: ${categories.tenant.length}`);
        console.log(`⚙️  System Collections: ${categories.system.length}`);
        console.log(`🧪 Test Collections: ${categories.test.length}`);
        console.log(`📦 Temp Collections: ${categories.temp.length}`);
        console.log(`🗑️  Empty Collections: ${categories.empty.length}`);
        console.log(`📁 Other Collections: ${categories.other.length}\n`);

        // Show empty collections (candidates for deletion)
        if (categories.empty.length > 0) {
            console.log('═══════════════════════════════════════════════════════');
            console.log('           EMPTY COLLECTIONS (Safe to Delete)          ');
            console.log('═══════════════════════════════════════════════════════\n');
            categories.empty.forEach((col, idx) => {
                console.log(`${idx + 1}. ${col.name}`);
            });
            console.log(`\nTotal: ${categories.empty.length} empty collections\n`);
        }

        // Show test collections
        if (categories.test.length > 0) {
            console.log('═══════════════════════════════════════════════════════');
            console.log('          TEST COLLECTIONS (Review for Deletion)       ');
            console.log('═══════════════════════════════════════════════════════\n');
            categories.test.forEach((col, idx) => {
                console.log(`${idx + 1}. ${col.name} (${col.count} docs, ${col.size})`);
            });
            console.log(`\nTotal: ${categories.test.length} test collections\n`);
        }

        // Show temp collections
        if (categories.temp.length > 0) {
            console.log('═══════════════════════════════════════════════════════');
            console.log('          TEMP COLLECTIONS (Review for Deletion)       ');
            console.log('═══════════════════════════════════════════════════════\n');
            categories.temp.forEach((col, idx) => {
                console.log(`${idx + 1}. ${col.name} (${col.count} docs, ${col.size})`);
            });
            console.log(`\nTotal: ${categories.temp.length} temp collections\n`);
        }

        // Calculate potential savings
        const potentialDeletion = categories.empty.length + categories.test.length + categories.temp.length;
        const remainingAfterCleanup = collections.length - potentialDeletion;

        console.log('═══════════════════════════════════════════════════════');
        console.log('                  CLEANUP SUMMARY                      ');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log(`Current Collections: ${collections.length}/500`);
        console.log(`Potential Deletion: ${potentialDeletion}`);
        console.log(`After Cleanup: ${remainingAfterCleanup}/500`);
        console.log(`Space Freed: ${500 - remainingAfterCleanup} collections available\n`);

        if (remainingAfterCleanup >= 450) {
            console.log('⚠️  WARNING: Still close to limit after cleanup!');
            console.log('Consider upgrading to a paid tier or optimizing tenant architecture.\n');
        } else {
            console.log('✅ Cleanup should resolve the issue!\n');
        }

        console.log('═══════════════════════════════════════════════════════\n');

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

async function cleanupCollections(options = {}) {
    try {
        console.log('🧹 Starting cleanup...\n');
        await mongoose.connect(MONGO_URI);

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        let deletedCount = 0;

        for (const collection of collections) {
            const name = collection.name;

            let count = 0;
            try {
                count = await db.collection(name).estimatedDocumentCount();
            } catch (err) {
                continue;
            }

            let shouldDelete = false;

            // Delete empty collections
            if (options.deleteEmpty && count === 0) {
                shouldDelete = true;
            }

            // Delete test collections
            if (options.deleteTest && (name.includes('test') || name.includes('Test'))) {
                shouldDelete = true;
            }

            // Delete temp collections
            if (options.deleteTemp && (name.includes('temp') || name.includes('Temp'))) {
                shouldDelete = true;
            }

            if (shouldDelete) {
                console.log(`🗑️  Deleting: ${name} (${count} docs)`);
                await db.collection(name).drop();
                deletedCount++;
            }
        }

        console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} collections.\n`);

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--cleanup')) {
    const options = {
        deleteEmpty: args.includes('--empty') || args.includes('--all'),
        deleteTest: args.includes('--test') || args.includes('--all'),
        deleteTemp: args.includes('--temp') || args.includes('--all')
    };

    console.log('⚠️  WARNING: This will DELETE collections!\n');
    console.log('Options:', options, '\n');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    setTimeout(() => {
        cleanupCollections(options);
    }, 5000);

} else {
    // Just analyze, don't delete
    analyzeCollections();
}
