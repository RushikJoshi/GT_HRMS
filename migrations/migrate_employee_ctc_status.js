/**
 * MongoDB Migration Script
 * Purpose: Normalize EmployeeCtcVersion records with status field
 * 
 * This script ensures all employee_ctc_versions records have:
 * 1. status field set to 'ACTIVE' (uppercase)
 * 2. isActive field set to true
 * 
 * Run this after deploying the EmployeeCtcVersion schema changes
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateCompensationStatus() {
    try {
        // Connect to MongoDB
        const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/hrms_default';
        await mongoose.connect(mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('employee_ctc_versions');

        // 1. Ensure all records have status field
        console.log('\n📋 Starting migration...');
        
        // Get statistics before migration
        const stats = await collection.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        console.log('📊 Records by status before migration:', stats);

        // 2. Update records without status field
        const updateNoStatus = await collection.updateMany(
            { status: { $exists: false } },
            { 
                $set: { 
                    status: 'ACTIVE'
                }
            }
        );
        console.log(`✅ Updated ${updateNoStatus.modifiedCount} records without status field`);

        // 3. Update records with null or empty status
        const updateEmptyStatus = await collection.updateMany(
            { $or: [{ status: null }, { status: '' }] },
            { 
                $set: { 
                    status: 'ACTIVE'
                }
            }
        );
        console.log(`✅ Updated ${updateEmptyStatus.modifiedCount} records with null/empty status`);

        // 4. Normalize status to uppercase (in case there are lowercase values)
        const updateLowercaseStatus = await collection.updateMany(
            { status: { $regex: '^active$', $options: 'i' } },
            [
                {
                    $set: {
                        status: { $toUpper: '$status' }
                    }
                }
            ]
        );
        console.log(`✅ Normalized ${updateLowercaseStatus.modifiedCount} records to uppercase status`);

        // 5. Ensure all ACTIVE records have isActive: true
        const updateIsActive = await collection.updateMany(
            { status: 'ACTIVE', isActive: { $ne: true } },
            { 
                $set: { 
                    isActive: true
                }
            }
        );
        console.log(`✅ Updated ${updateIsActive.modifiedCount} ACTIVE records to isActive: true`);

        // 6. Ensure all INACTIVE records have isActive: false
        const updateInactiveStatus = await collection.updateMany(
            { status: 'INACTIVE', isActive: { $ne: false } },
            { 
                $set: { 
                    isActive: false
                }
            }
        );
        console.log(`✅ Updated ${updateInactiveStatus.modifiedCount} INACTIVE records to isActive: false`);

        // 7. Get statistics after migration
        const statsAfter = await collection.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        console.log('📊 Records by status after migration:', statsAfter);

        // 8. Verify all records now have valid status
        const invalidRecords = await collection.countDocuments({
            $or: [
                { status: { $exists: false } },
                { status: null },
                { status: '' },
                { status: { $nin: ['ACTIVE', 'INACTIVE'] } }
            ]
        });
        console.log(`✅ Invalid status records remaining: ${invalidRecords}`);

        // 9. Sample a few records to confirm
        const samples = await collection.find().limit(5).toArray();
        console.log('\n📌 Sample records after migration:');
        samples.forEach(record => {
            console.log(`   - Employee ${record.employeeId}: status='${record.status}', isActive=${record.isActive}`);
        });

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 Next steps:');
        console.log('   1. Verify payroll calculations: npm run dev (backend)');
        console.log('   2. Test Process Payroll with an employee');
        console.log('   3. Check console logs for compensation source');
        console.log('   4. Verify payslip status badge shows ACTIVE (CTC)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateCompensationStatus();
