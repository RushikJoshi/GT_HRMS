const mongoose = require('mongoose');

/**
 * Leave Policy Service Layer
 * Handles all business logic for leave policies and balance synchronization
 */

/**
 * Calculate leave balance for an employee based on joining date and policy rules
 * Handles partial year joining cases
 */
function calculateProRatedBalance(rule, joiningDate, year, leaveCycleStartMonth = 0) {
    const { totalPerYear, monthlyAccrual, accrualType } = rule;
    
    // If no accrual or yearly, return full amount
    if (!monthlyAccrual && accrualType !== 'monthly') {
        return totalPerYear;
    }

    // Calculate leave cycle start date for the year
    const cycleStart = new Date(year, leaveCycleStartMonth, 1);
    const cycleEnd = new Date(year + 1, leaveCycleStartMonth, 0);
    
    // If employee joined after cycle start, calculate pro-rated balance
    if (joiningDate && joiningDate > cycleStart) {
        const monthsRemaining = Math.max(1, Math.ceil((cycleEnd - joiningDate) / (1000 * 60 * 60 * 24 * 30)));
        const totalMonths = 12;
        return Math.ceil((totalPerYear / totalMonths) * monthsRemaining);
    }
    
    return totalPerYear;
}

/**
 * Sync policy rules to employee leave balances
 * Preserves existing used/pending leaves and only updates totals
 */
async function syncPolicyToEmployee(employee, policy, LeaveBalance, tenantId, year, leaveCycleStartMonth = 0) {
    if (!employee || !policy || !policy.rules || !Array.isArray(policy.rules)) {
        throw new Error('Invalid employee, policy, or rules');
    }

    // Ensure employee has policy assigned
    if (!employee.leavePolicy || employee.leavePolicy.toString() !== policy._id.toString()) {
        employee.leavePolicy = policy._id;
        await employee.save();
    }

    // Get existing balances for this employee and year
    const existingBalances = await LeaveBalance.find({
        employee: employee._id,
        tenant: tenantId,
        year
    });

    // Create a map of existing balances by leaveType
    const balanceMap = new Map();
    existingBalances.forEach(b => {
        balanceMap.set(b.leaveType, b);
    });

    // Process each rule in the policy
    // Defensive check: ensure rules is an array
    if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
        console.warn(`[SYNC_POLICY] Policy ${policy._id} has no valid rules array`);
        return {
            employeeId: employee._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            balancesUpdated: 0,
            balancesRemoved: 0,
            warning: 'Policy has no rules'
        };
    }

    const balancePromises = [];
    
    for (const rule of policy.rules) {
        if (!rule || typeof rule !== 'object' || !rule.leaveType || rule.totalPerYear === undefined) {
            console.warn(`[SYNC_POLICY] Skipping invalid rule:`, rule);
            continue;
        }

        const existingBalance = balanceMap.get(rule.leaveType);
        
        // Calculate pro-rated balance if needed
        const calculatedTotal = calculateProRatedBalance(
            rule,
            employee.joiningDate,
            year,
            leaveCycleStartMonth
        );

        if (existingBalance) {
            // Update existing balance - preserve used/pending, update total
            const oldTotal = existingBalance.total || 0;
            const used = existingBalance.used || 0;
            const pending = existingBalance.pending || 0;
            
            // If total changed, adjust available balance proportionally
            // But never reduce below used + pending
            const newTotal = Math.max(calculatedTotal, used + pending);
            
            existingBalance.total = newTotal;
            existingBalance.policy = policy._id;
            existingBalance.available = newTotal - used - pending;
            
            balancePromises.push(existingBalance.save());
        } else {
            // Create new balance
            const newBalance = new LeaveBalance({
                tenant: tenantId,
                employee: employee._id,
                policy: policy._id,
                leaveType: rule.leaveType,
                year,
                total: calculatedTotal,
                used: 0,
                pending: 0,
                available: calculatedTotal
            });
            balancePromises.push(newBalance.save());
        }
    }

    // Remove balances for leave types that no longer exist in policy
    // Defensive: ensure rules is array before mapping
    const currentLeaveTypes = new Set(
        (Array.isArray(policy.rules) ? policy.rules : [])
            .filter(r => r && r.leaveType)
            .map(r => r.leaveType)
    );
    const balancesToRemove = existingBalances.filter(b => !currentLeaveTypes.has(b.leaveType));
    
    if (balancesToRemove.length > 0) {
        const idsToRemove = balancesToRemove.map(b => b._id);
        await LeaveBalance.deleteMany({ _id: { $in: idsToRemove } });
    }

    await Promise.all(balancePromises);
    
    return {
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        balancesUpdated: balancePromises.length,
        balancesRemoved: balancesToRemove.length
    };
}

/**
 * Sync policy to all applicable employees
 * Handles All, Department, Role, and Specific employee assignments
 */
async function syncPolicyToAllEmployees(policy, models, tenantId, year, leaveCycleStartMonth = 0) {
    const { Employee, LeaveBalance } = models;
    const results = [];

    // Find all employees who should have this policy
    let employees = [];

    if (policy.applicableTo === 'All') {
        employees = await Employee.find({ tenant: tenantId, status: 'Active' });
    } else if (policy.applicableTo === 'Department' && policy.departmentIds && policy.departmentIds.length > 0) {
        const deptObjectIds = policy.departmentIds.map(id => 
            mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
        );
        employees = await Employee.find({
            departmentId: { $in: deptObjectIds },
            tenant: tenantId,
            status: 'Active'
        });
    } else if (policy.applicableTo === 'Role' && policy.roles && policy.roles.length > 0) {
        employees = await Employee.find({
            role: { $in: policy.roles },
            tenant: tenantId,
            status: 'Active'
        });
    } else if (policy.applicableTo === 'Specific') {
        // For specific employees, check if policy has specificEmployeeIds field
        // or find employees already assigned to this policy
        if (policy.specificEmployeeIds && Array.isArray(policy.specificEmployeeIds) && policy.specificEmployeeIds.length > 0) {
            const empObjectIds = policy.specificEmployeeIds.map(id => 
                mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
            );
            employees = await Employee.find({
                _id: { $in: empObjectIds },
                tenant: tenantId,
                status: 'Active'
            });
        } else {
            // Fallback: find employees already assigned to this policy
            employees = await Employee.find({
                leavePolicy: policy._id,
                tenant: tenantId,
                status: 'Active'
            });
        }
    }

    // Sync policy to each employee
    for (const employee of employees) {
        try {
            const result = await syncPolicyToEmployee(
                employee,
                policy,
                LeaveBalance,
                tenantId,
                year,
                leaveCycleStartMonth
            );
            results.push(result);
        } catch (error) {
            console.error(`[SYNC_POLICY] Error syncing to ${employee.firstName} ${employee.lastName}:`, error);
            results.push({
                employeeId: employee._id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                error: error.message
            });
        }
    }

    return results;
}

/**
 * Recalculate balances for an employee when policy is updated
 * Uses MongoDB transaction for atomicity
 */
async function recalculateEmployeeBalances(employeeId, policyId, models, tenantId, year, leaveCycleStartMonth = 0) {
    const { Employee, LeaveBalance, LeavePolicy } = models;
    
    const session = await models.LeaveBalance.db.startSession();
    
    try {
        await session.withTransaction(async () => {
            const employee = await Employee.findById(employeeId).session(session);
            if (!employee) throw new Error('Employee not found');

            const policy = await LeavePolicy.findById(policyId).session(session);
            if (!policy || !policy.rules) throw new Error('Policy not found or has no rules');

            await syncPolicyToEmployee(
                employee,
                policy,
                LeaveBalance,
                tenantId,
                year,
                leaveCycleStartMonth
            );
        });
    } finally {
        await session.endSession();
    }
}

module.exports = {
    calculateProRatedBalance,
    syncPolicyToEmployee,
    syncPolicyToAllEmployees,
    recalculateEmployeeBalances
};
