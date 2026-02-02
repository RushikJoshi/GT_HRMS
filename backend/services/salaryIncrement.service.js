const mongoose = require('mongoose');

/**
 * ============================================
 * SALARY REVISION SERVICE (COLLECTION-FREE)
 * ============================================
 * This version stores history INSIDE the applicant/employee document
 * to avoid MongoDB Atlas collection limits.
 */

const getModels = (tenantDB) => {
    return {
        Applicant: tenantDB.model('Applicant', require('../models/Applicant'))
    };
};

/**
 * Calculate salary status
 */
const calculateStatus = (effectiveFrom) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effective = new Date(effectiveFrom);
    effective.setHours(0, 0, 0, 0);
    return effective > today ? 'SCHEDULED' : 'ACTIVE';
};

/**
 * Validate salary breakup
 */
const validateSalaryBreakup = (totalCTC, grossA, grossB, grossC) => {
    const sum = (Math.round(grossA || 0) * 12) + Math.round(grossB || 0) + Math.round(grossC || 0);
    const tolerance = 5; // Higher tolerance for rounding
    if (Math.abs(sum - totalCTC) > tolerance) {
        throw new Error(`Invalid Breakup: (Gross A x 12) + Gross B + Gross C = ${sum}, but Total CTC is ${totalCTC}`);
    }
    return true;
};

/**
 * Create salary increment/revision
 */
const createIncrement = async (tenantDB, data) => {
    const {
        employeeId,
        effectiveFrom,
        totalCTC,
        grossA,
        grossB,
        grossC,
        components,
        incrementType = 'INCREMENT',
        reason,
        notes,
        createdBy,
        companyId
    } = data;

    validateSalaryBreakup(totalCTC, grossA, grossB, grossC);

    const { Applicant } = getModels(tenantDB);
    const applicant = await Applicant.findById(employeeId);

    if (!applicant) throw new Error('Employee not found');

    // Initialize history if it doesn't exist
    if (!applicant.salaryHistory) applicant.salaryHistory = [];

    const status = calculateStatus(effectiveFrom);
    const versionNumber = (applicant.salaryHistory.length || 0) + 1;

    const newRevision = {
        version: versionNumber,
        effectiveFrom,
        totalCTC,
        grossA,
        grossB,
        grossC,
        components: components || [],
        incrementType,
        reason,
        notes,
        status,
        isActive: status === 'ACTIVE',
        createdAt: new Date(),
        createdBy
    };

    // If new revision is ACTIVE, deactivate others
    if (newRevision.isActive) {
        applicant.salaryHistory.forEach(rev => {
            rev.isActive = false;
            rev.status = 'INACTIVE';
        });
    }

    applicant.salaryHistory.push(newRevision);

    // Also update the main salarySnapshot for backward compatibility
    // but we keep the history for audit
    applicant.salarySnapshot = {
        ctc: totalCTC,
        monthlyCTC: grossA,
        breakdown: { components }
    };

    await applicant.save();

    return {
        success: true,
        status,
        newCtcVersion: newRevision,
        change: {
            absolute: totalCTC - (applicant.salaryHistory[applicant.salaryHistory.length - 2]?.totalCTC || 0),
            percentage: applicant.salaryHistory.length > 1
                ? (((totalCTC / applicant.salaryHistory[applicant.salaryHistory.length - 2].totalCTC) - 1) * 100).toFixed(2)
                : "100.00"
        }
    };
};

module.exports = {
    createIncrement,
    calculateStatus,
    validateSalaryBreakup
};
