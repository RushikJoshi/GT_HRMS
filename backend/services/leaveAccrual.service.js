const mongoose = require('mongoose');

/**
 * Leave Accrual & Carry Forward Service
 * - runMonthlyAccrual: Add monthly accruals for policies with monthlyAccrual=true
 * - runCarryForwardForYear: Carry forward eligible balances from one year to next
 * 
 * The functions are tenant-aware and idempotent (use LeaveAccrualLog to avoid double accrual)
 */

async function runMonthlyAccrual(tenantDB, tenantId, year, month) {
    // month: 1-12
    const LeavePolicy = tenantDB.model('LeavePolicy');
    const Employee = tenantDB.model('Employee');
    const LeaveBalance = tenantDB.model('LeaveBalance');
    const LeaveAccrualLog = tenantDB.model('LeaveAccrualLog');

    // Idempotency: if log exists for (tenant, year, month) don't run again
    const existing = await LeaveAccrualLog.findOne({ tenant: tenantId, year, month });
    if (existing) return { message: 'Already executed for this month', year, month };

    const policies = await LeavePolicy.find({ tenant: tenantId, isActive: true });
    const results = [];

    for (const policy of policies) {
        for (const rule of (policy.rules || [])) {
            if (!rule.monthlyAccrual) continue;

            // accrual per month (allow decimals, round to 2 digits)
            const perMonth = Math.round(((rule.totalPerYear || 0) / 12) * 100) / 100;
            if (perMonth <= 0) continue;

            // Find employees applicable per policy logic
            let employees = [];
            if (policy.applicableTo === 'All') employees = await Employee.find({ tenant: tenantId, status: 'Active' });
            else if (policy.applicableTo === 'Department' && policy.departmentIds?.length) employees = await Employee.find({ departmentId: { $in: policy.departmentIds }, tenant: tenantId, status: 'Active' });
            else if (policy.applicableTo === 'Role' && policy.roles?.length) employees = await Employee.find({ role: { $in: policy.roles }, tenant: tenantId, status: 'Active' });
            else if (policy.applicableTo === 'Specific' && policy.specificEmployeeIds?.length) employees = await Employee.find({ _id: { $in: policy.specificEmployeeIds }, tenant: tenantId, status: 'Active' });

            for (const emp of employees) {
                // Eligibility checks: reuse existing basic eligibility logic
                const monthsSinceJoin = emp.joiningDate ? Math.floor((Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0;
                const minMonths = Math.max(policy.minimumTenureRequiredMonths || 0, rule.minimumTenureMonths || 0);
                if (minMonths > monthsSinceJoin) continue; // skip if not eligible yet

                // Determine year for balance (based on leave cycle) - keep using provided year
                const bal = await LeaveBalance.findOne({ tenant: tenantId, employee: emp._id, leaveType: rule.leaveType, year });
                if (bal) {
                    // Increase total and available proportionally but don't allow total > rule.totalPerYear if that is desired
                    // We will allow total to track cumulative accruals but keep a defensive cap of rule.totalPerYear
                    bal.total = Math.round(((bal.total || 0) + perMonth) * 100) / 100;
                    // ensure available increases by perMonth (used/pending unchanged)
                    bal.available = Math.round(((bal.available || 0) + perMonth) * 100) / 100;
                    await bal.save();
                } else {
                    // Create balance with perMonth as initial allocation
                    const newBal = new LeaveBalance({ tenant: tenantId, employee: emp._id, policy: policy._id, leaveType: rule.leaveType, year, total: perMonth, used: 0, pending: 0, available: perMonth });
                    await newBal.save();
                }
            }

            results.push({ policy: policy._id, leaveType: rule.leaveType, perMonth });
        }
    }

    // Log execution
    await LeaveAccrualLog.create({ tenant: tenantId, year, month, executedAt: new Date() });

    return { message: 'Monthly accrual executed', year, month, results };
}

async function runCarryForwardForYear(tenantDB, tenantId, fromYear, toYear) {
    const LeavePolicy = tenantDB.model('LeavePolicy');
    const LeaveBalance = tenantDB.model('LeaveBalance');
    const policies = await LeavePolicy.find({ tenant: tenantId, isActive: true });
    const carryResults = [];

    for (const policy of policies) {
        for (const rule of (policy.rules || [])) {
            if (!rule.carryForwardAllowed) continue;

            // All balances for fromYear with this leaveType
            const balances = await LeaveBalance.find({ tenant: tenantId, year: fromYear, leaveType: rule.leaveType });
            for (const bal of balances) {
                const available = Math.max(0, (bal.total || 0) - (bal.used || 0) - (bal.pending || 0));
                const carry = Math.min(available, rule.maxCarryForward || 0);

                if (carry > 0) {
                    // Create or update next year's balance
                    let nextBal = await LeaveBalance.findOne({ tenant: tenantId, employee: bal.employee, leaveType: bal.leaveType, year: toYear });
                    if (nextBal) {
                        nextBal.total = (nextBal.total || 0) + carry;
                        nextBal.available = (nextBal.available || 0) + carry;
                        await nextBal.save();
                    } else {
                        nextBal = new LeaveBalance({ tenant: tenantId, employee: bal.employee, policy: policy._id, leaveType: bal.leaveType, year: toYear, total: carry, used: 0, pending: 0, available: carry });
                        await nextBal.save();
                    }

                    carryResults.push({ employee: bal.employee, leaveType: bal.leaveType, carryAmount: carry });
                }
            }
        }
    }

    return { message: 'Carry forward executed', fromYear, toYear, carryResults };
}

module.exports = { runMonthlyAccrual, runCarryForwardForYear };
