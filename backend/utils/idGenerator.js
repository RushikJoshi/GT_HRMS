const mongoose = require('mongoose');

// Helper to get companyIdConfig controller safely (avoiding circular dependency)
const getCompanyIdConfig = () => require('../controllers/companyIdConfig.controller');

/**
 * Generate unique ID via the centralized CompanyIdConfig system
 */
async function generateIdUnified(db, entityType, extraReplacements = {}) {
    try {
        const tenantId = db.tenantId || db.id; // Fallback to db.id if tenantId is not set
        if (!tenantId) {
            console.warn(`[ID Generator] tenantId not found on db connection for ${entityType}, falling back to legacy generation`);
            return null; // Signals to use fallback
        }

        const controller = getCompanyIdConfig();
        const result = await controller.generateIdInternal({
            tenantId,
            entityType,
            increment: true,
            extraReplacements
        });

        return result.id;
    } catch (err) {
        console.error(`[ID Generator] Unified generation failed for ${entityType}:`, err.message);
        return null;
    }
}

/**
 * Legacy Fallback: Generate unique ID using the Counter collection
 */
async function generateIdLegacy(db, prefix, year = null, department = null, padding = 4) {
    const CounterSchema = require('../models/Counter');
    const Counter = db.models.Counter || db.model('Counter', CounterSchema);
    const targetYear = year || new Date().getFullYear();

    let counterKey = department ? `${prefix}_${department}_${targetYear}` : `${prefix}_${targetYear}`;

    const counter = await Counter.findOneAndUpdate(
        { key: counterKey },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const paddedSeq = String(counter.seq).padStart(padding, '0');
    return department
        ? `${prefix}-${department.toUpperCase()}-${paddedSeq}`
        : `${prefix}-${targetYear}-${paddedSeq}`;
}

/**
 * Main generateId function (Unified with Fallback)
 */
async function generateId(db, prefix, year = null, department = null, padding = 4) {
    // Map legacy prefix to new entityType
    const mapping = {
        'JOB': 'JOB',
        'CAN': 'CANDIDATE',
        'APP': 'APPLICATION',
        'INT': 'INTERVIEW',
        'OFF': 'OFFER',
        'EMP': 'EMPLOYEE',
        'POS': 'POS',
        'APPT': 'APPOINTMENT'
    };

    const entityType = mapping[prefix] || 'CUSTOM';
    const deptCode = department ? department.toUpperCase() : 'GEN';

    // Try new system
    const unifiedId = await generateIdUnified(db, entityType, { '{{DEPT}}': deptCode });
    if (unifiedId) return unifiedId;

    // Fallback to legacy
    return generateIdLegacy(db, prefix, year, department, padding);
}

async function generateJobId(db, year = null) {
    return generateId(db, 'JOB', year);
}

async function generateCandidateId(db, year = null) {
    return generateId(db, 'CAN', year);
}

async function generateApplicationId(db, year = null) {
    return generateId(db, 'APP', year);
}

async function generateInterviewId(db, year = null) {
    return generateId(db, 'INT', year);
}

async function generateOfferId(db, year = null) {
    return generateId(db, 'OFF', year);
}

async function generatePositionId(db, year = null) {
    return generateId(db, 'POS', year);
}

async function generateEmployeeId(db, department = null, year = null) {
    return generateId(db, 'EMP', year, department);
}

async function generatePayslipId(db, employeeId, month, year) {
    const monthStr = String(month).padStart(2, '0');
    const yearMonth = `${year}${monthStr}`;
    const empNumber = employeeId.split('-').pop();
    return `PAY-${yearMonth}-${empNumber}`;
}

async function getCurrentCounter(db, prefix, year = null, department = null) {
    try {
        const tenantId = db.tenantId;
        if (tenantId) {
            const controller = getCompanyIdConfig();
            const result = await controller.generateIdInternal({
                tenantId,
                entityType: prefix === 'CAN' ? 'CANDIDATE' : (prefix === 'APP' ? 'APPLICATION' : prefix),
                increment: false
            });
            return result.sequence;
        }
    } catch (e) { }

    // Legacy fallback
    const CounterSchema = require('../models/Counter');
    const Counter = db.models.Counter || db.model('Counter', CounterSchema);
    const targetYear = year || new Date().getFullYear();
    const counterKey = department ? `${prefix}_${department}_${targetYear}` : `${prefix}_${targetYear}`;
    const counter = await Counter.findOne({ key: counterKey });
    return counter ? counter.seq : 0;
}

async function resetCounter(db, prefix, year = null, department = null) {
    return false; // Deprecated, use Company Settings UI
}

module.exports = {
    generateId,
    generateJobId,
    generateCandidateId,
    generateApplicationId,
    generateInterviewId,
    generateOfferId,
    generatePositionId,
    generateEmployeeId,
    generatePayslipId,
    getCurrentCounter,
    resetCounter
};
