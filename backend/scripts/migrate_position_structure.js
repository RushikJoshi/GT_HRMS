const mongoose = require('mongoose');
const getTenantDB = require('../utils/tenantDB');

/**
 * MIGRATION TO FIX POSITIONS & JOB OPENINGS
 * Usage: node scripts/migratePositions.js --tenant=<tenantId>
 */

const migratePositions = async (tenantId) => {
    console.log(`[MIGRATION] Starting for tenant: ${tenantId}`);
    const db = await getTenantDB(tenantId);

    const Position = db.model('Position');
    const Requirement = db.model('Requirement');

    // 1. Position ID Backfill
    console.log('[MIGRATION] Checking Positions for missing IDs...');
    const positions = await Position.find({ positionId: { $exists: false } });

    if (positions.length > 0) {
        console.log(`[MIGRATION] Found ${positions.length} positions without IDs.`);
        const companyIdConfig = require('../controllers/companyIdConfig.controller');

        for (const pos of positions) {
            try {
                const idResult = await companyIdConfig.generateIdInternal({
                    tenantId,
                    entityType: 'POS',
                    increment: true
                });
                pos.positionId = idResult.id;
                await pos.save();
                console.log(`   -> Patched Position ${pos._id} with ID ${pos.positionId}`);
            } catch (e) {
                console.error(`   -> Failed to patch Position ${pos._id}`, e.message);
            }
        }
    } else {
        console.log('[MIGRATION] All Positions have IDs. Good.');
    }

    // 2. Job Opening Checks
    console.log('[MIGRATION] Checking Job Openings for missing Position Links...');
    const requirements = await Requirement.find({ positionId: { $exists: false } });

    if (requirements.length > 0) {
        console.log(`[MIGRATION] Found ${requirements.length} Job Openings without Position Links.`);
        console.log('[WARNING] These Job Openings need manual linking or auto-creation of positions.');

        for (const job of requirements) {
            // Strategy: Create a Position for this Job Opening automatically
            console.log(`   -> Auto-creating Position for Job: ${job.jobTitle}`);

            // Generate ID
            const companyIdConfig = require('../controllers/companyIdConfig.controller');
            const idResult = await companyIdConfig.generateIdInternal({
                tenantId,
                entityType: 'POS',
                increment: true
            });

            const newPos = new Position({
                tenant: tenantId,
                positionId: idResult.id,
                jobTitle: job.jobTitle,
                department: job.department,
                status: 'Vacant', // Default
                headCount: job.vacancy || 1
            });

            await newPos.save();

            job.positionId = newPos._id;
            job.position = newPos.jobTitle;
            job.jobOpeningId = job.jobOpeningId || `JOB-LEGACY-${job._id}`;

            // Check legacy jobOpeningId format if needed
            if (!job.jobOpeningId) {
                const jobIds = await companyIdConfig.generateIdInternal({
                    tenantId,
                    entityType: 'JOB_OPENING',
                    increment: true,
                    extraReplacements: {
                        '{{DEPT}}': job.department ? job.department.substring(0, 3).toUpperCase() : 'GEN'
                    }
                });
                job.jobOpeningId = jobIds.id;
            }

            await job.save();
            console.log(`      -> Created Position ${newPos.positionId} and linked to Job.`);
        }
    } else {
        console.log('[MIGRATION] All Job Openings linked. Good.');
    }

    console.log('[MIGRATION] Completed successfully.');
    // process.exit(0); // If run as script
};

module.exports = migratePositions;
