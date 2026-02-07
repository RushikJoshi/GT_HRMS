/**
 * Quick Fix: Delete test database to free up 25 collections
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function deleteTestDatabase() {
    try {
        console.log('🗑️  Deleting "test" database...\n');

        await mongoose.connect(process.env.MONGO_URI);

        const db = mongoose.connection.client.db('test');
        await db.dropDatabase();

        console.log('✅ "test" database deleted successfully!\n');
        console.log('📊 Freed up: 25 collections');
        console.log('📊 New capacity: 475/500 collections\n');

        await mongoose.disconnect();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

deleteTestDatabase();
