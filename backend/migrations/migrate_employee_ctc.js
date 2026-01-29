/**
 * Migration Script: Sync EmployeeCompensation → EmployeeCtcVersion
 * 
 * PURPOSE:
 * Creates EmployeeCtcVersion records from existing EmployeeCompensation records
 * Ensures payroll can access compensation data even if EmployeeCtcVersion not created
 * 
 * USAGE:
 * node backend/migrations/migrate_employee_ctc.js
 * 
 * EXPECTED OUTPUT:
 * ✅ Connected to MongoDB
 * ✅ Found X EmployeeCompensation records
 * ✅ Created Y new EmployeeCtcVersion records
 * ✅ Migration complete - Z records already existed
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Load schemas
const EmployeeCompensationSchema = require('../models/EmployeeCompensation');
const EmployeeCtcVersionSchema = require('../models/EmployeeCtcVersion');

async function migrateEmployeeCtc() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI environment variable is not set');
        }

        console.log(`🔗 Connecting to MongoDB: ${mongoUri.split('@')[1]}`);
        await mongoose.connect(mongoUri);
        console.log(`✅ Connected to MongoDB\n`);

        // Get all tenant databases from the connection
        const adminDb = mongoose.connection.getClient().db('admin');
        const dbList = await adminDb.admin().listDatabases();
        
        const tenantDatabases = dbList.databases
            .filter(db => db.name.startsWith('company_'))
            .map(db => db.name);

        console.log(`📊 Found ${tenantDatabases.length} tenant databases\n`);

        let globalCreated = 0;
        let globalSkipped = 0;
        let globalErrors = 0;

        // Process each tenant database
        for (const tenantDbName of tenantDatabases) {
            console.log(`\n═══════════════════════════════════════════════════════`);
            console.log(`🏢 Processing Tenant: ${tenantDbName}`);
            console.log(`═══════════════════════════════════════════════════════`);

            try {
                // Get tenant-specific connection
                const tenantDb = mongoose.connection.useDb(tenantDbName, { useCache: false });

                // Register models on tenant connection
                const EmployeeCompensation = tenantDb.model('EmployeeCompensation', EmployeeCompensationSchema);
                const EmployeeCtcVersion = tenantDb.model('EmployeeCtcVersion', EmployeeCtcVersionSchema);

                // Fetch all active EmployeeCompensation records
                const compensations = await EmployeeCompensation.find({
                    isActive: true
                }).lean();

                console.log(`   📋 Found ${compensations.length} active EmployeeCompensation records`);

                if (compensations.length === 0) {
                    console.log(`   ℹ️  No compensation records to migrate`);
                    continue;
                }

                let tenantCreated = 0;
                let tenantSkipped = 0;
                let tenantErrors = 0;

                // Process each compensation record
                for (const comp of compensations) {
                    try {
                        // Check if EmployeeCtcVersion already exists for this employee
                        const existing = await EmployeeCtcVersion.findOne({
                            employeeId: comp.employeeId,
                            status: 'ACTIVE'
                        });

                        if (existing) {
                            console.log(`   ⏭️  Skipped: EmployeeCtcVersion already exists for employee ${comp.employeeId}`);
                            tenantSkipped++;
                            globalSkipped++;
                            continue;
                        }

                        // Create EmployeeCtcVersion from EmployeeCompensation
                        const newCtcVersion = await EmployeeCtcVersion.create({
                            companyId: comp.companyId,
                            employeeId: comp.employeeId,
                            version: 1,
                            effectiveFrom: comp.effectiveFrom || new Date(),
                            effectiveTo: comp.effectiveTo,
                            grossA: comp.grossA || 0,
                            grossB: comp.grossB || 0,
                            grossC: comp.grossC || 0,
                            totalCTC: comp.totalCTC || 0,
                            components: comp.components || [],
                            isActive: true,
                            status: 'ACTIVE',
                            createdBy: comp.createdBy || 'MIGRATION_SCRIPT',
                            updatedBy: comp.updatedBy || 'MIGRATION_SCRIPT',
                            _syncSource: 'EMPLOYEE_COMPENSATION',
                            _migrationTimestamp: new Date()
                        });

                        console.log(`   ✅ Created: ${newCtcVersion._id} for employee ${comp.employeeId}`);
                        tenantCreated++;
                        globalCreated++;

                    } catch (itemError) {
                        console.error(`   ❌ Error creating EmployeeCtcVersion for ${comp.employeeId}:`, itemError.message);
                        tenantErrors++;
                        globalErrors++;
                    }
                }

                console.log(`\n   📊 Tenant Results:`);
                console.log(`      ✅ Created: ${tenantCreated}`);
                console.log(`      ⏭️  Skipped: ${tenantSkipped}`);
                console.log(`      ❌ Errors: ${tenantErrors}`);

            } catch (tenantError) {
                console.error(`❌ Error processing tenant ${tenantDbName}:`, tenantError.message);
                globalErrors++;
            }
        }

        // Final summary
        console.log(`\n═══════════════════════════════════════════════════════`);
        console.log(`📊 MIGRATION SUMMARY`);
        console.log(`═══════════════════════════════════════════════════════`);
        console.log(`✅ Created: ${globalCreated} EmployeeCtcVersion records`);
        console.log(`⏭️  Skipped: ${globalSkipped} (already existed)`);
        console.log(`❌ Errors: ${globalErrors}`);
        console.log(`═══════════════════════════════════════════════════════\n`);

        if (globalErrors === 0) {
            console.log(`🎉 Migration completed successfully!\n`);
            console.log(`NEXT STEPS:`);
            console.log(`  1. Verify in MongoDB Atlas:`);
            console.log(`     - Check db.employeecompensations.find()`);
            console.log(`     - Check db.employeectcversions.find()`);
            console.log(`  2. Run payroll for affected employees`);
            console.log(`  3. Monitor console logs for "✅ CTC auto-synced from EmployeeCompensation"\n`);
        } else {
            console.log(`⚠️  Migration completed with ${globalErrors} error(s). Please review logs above.\n`);
            process.exit(1);
        }

        process.exit(0);

    } catch (error) {
        console.error(`❌ Fatal Error:`, error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run migration
migrateEmployeeCtc();
