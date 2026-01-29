const mongoose = require('mongoose');
const leavePolicyService = require('../services/leavePolicy.service');

// Helper to get models
const getModels = (req) => {
    if (!req.tenantDB) {
        throw new Error('Tenant database not initialized. Please ensure tenant middleware is running.');
    }
    try {
        return {
            LeavePolicy: req.tenantDB.model('LeavePolicy'),
            Employee: req.tenantDB.model('Employee'),
            LeaveBalance: req.tenantDB.model('LeaveBalance')
        };
    } catch (err) {
        console.error('Error in getModels (leavePolicy):', err);
        throw new Error('Failed to get models from tenant database');
    }
};

exports.createPolicy = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            console.error("createPolicy ERROR: Missing user or tenantId in request");
            return res.status(401).json({ error: "unauthorized", message: "User context or tenant not found" });
        }

        const tenantIdStr = req.user.tenantId || req.tenantId;
        if (!tenantIdStr) {
            console.error("createPolicy ERROR: tenantId not available");
            return res.status(400).json({ error: "tenant_missing", message: "Tenant ID is required" });
        }
        const tenantId = new mongoose.Types.ObjectId(tenantIdStr);

        // Ensure tenantDB is available
        if (!req.tenantDB) {
            console.error("createPolicy ERROR: Tenant database connection not available");
            return res.status(500).json({ error: "tenant_db_unavailable", message: "Tenant database connection not available" });
        }

        console.log('createPolicy called');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Tenant ID:', tenantId);

        const { LeavePolicy, Employee, LeaveBalance } = getModels(req);
        console.log('Models loaded successfully');

        // Determine leave-cycle-aware year for balances (matches getMyBalances logic)
        const AttendanceSettings = req.tenantDB.model('AttendanceSettings');
        const attendanceSettings = await AttendanceSettings.findOne({ tenant: tenantId }).catch(() => null);
        const startMonth = attendanceSettings?.leaveCycleStartMonth || 0;
        const now = new Date();
        let year = now.getFullYear();
        if (now.getMonth() < startMonth) year--;

        const { name, applicableTo, rules, departmentIds, roles, specificEmployeeId } = req.body;

        console.log('Creating policy document...');
        const policy = new LeavePolicy({
            tenant: tenantId,
            name,
            applicableTo,
            departmentIds,
            roles,
            rules
        });

        console.log('Saving policy...');
        await policy.save();
        console.log('Policy saved:', policy._id);

        // Use service layer to sync policy to all applicable employees
        // This handles All, Department, Role, and Specific employee assignments
        const models = { Employee, LeaveBalance };
        const syncResults = await leavePolicyService.syncPolicyToAllEmployees(
            policy,
            models,
            tenantId,
            year,
            startMonth
        );
        console.log(`[CREATE_POLICY] Synced to ${syncResults.length} employees`);

        res.status(201).json(policy);
    } catch (error) {
        console.error('createPolicy ERROR:', error);
        res.status(500).json({ error: error.message });
    }
};

// Helper to dry up policy assignment
async function syncPolicyToEmployees(employees, policy, LeaveBalance, tenantId) {
    const year = new Date().getFullYear();
    for (const employee of employees) {
        employee.leavePolicy = policy._id;
        await employee.save();

        // Delete old balances for current year
        await LeaveBalance.deleteMany({ employee: employee._id, year });

        // Create new balances
        for (const rule of policy.rules) {
            await new LeaveBalance({
                tenant: tenantId,
                employee: employee._id,
                policy: policy._id,
                leaveType: rule.leaveType,
                year,
                total: rule.totalPerYear,
                used: 0,
                pending: 0,
                available: rule.totalPerYear
            }).save();
        }
        console.log(`✓ Assigned to ${employee.firstName} ${employee.lastName}`);
    }
}


exports.getPolicies = async (req, res) => {
    try {
        // Validate tenant context
        if (!req.user || !req.user.tenantId) {
            console.error("getPolicies ERROR: Missing user or tenantId in request");
            return res.status(401).json({ error: "unauthorized", message: "User context or tenant not found" });
        }

        const tenantIdStr = req.user.tenantId || req.tenantId;
        if (!tenantIdStr) {
            console.error("getPolicies ERROR: tenantId not available");
            return res.status(400).json({ error: "tenant_missing", message: "Tenant ID is required" });
        }
        const tenantId = new mongoose.Types.ObjectId(tenantIdStr);

        // Ensure tenantDB is available
        if (!req.tenantDB) {
            console.error("getPolicies ERROR: Tenant database connection not available");
            return res.status(500).json({ error: "tenant_db_unavailable", message: "Tenant database connection not available" });
        }

        const { LeavePolicy } = getModels(req);
        const policies = await LeavePolicy.find({ tenant: tenantId }).sort({ createdAt: -1 });
        res.json(policies);
    } catch (error) {
        console.error("getPolicies ERROR:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: error.message || "Failed to fetch leave policies" });
    }
};

exports.getPolicyById = async (req, res) => {
    try {
        const { LeavePolicy } = getModels(req);
        const policyObjectId = new mongoose.Types.ObjectId(req.params.id);
        const tenantObjectId = new mongoose.Types.ObjectId(req.tenantId);
        const policy = await LeavePolicy.findOne({ _id: policyObjectId, tenant: tenantObjectId });
        if (!policy) return res.status(404).json({ error: 'Policy not found' });
        res.json(policy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updatePolicy = async (req, res) => {
    try {
        const tenantIdStr = req.user?.tenantId || req.tenantId;
        if (!tenantIdStr) {
            return res.status(400).json({ error: "tenant_missing", message: "Tenant ID is required" });
        }
        const tenantId = new mongoose.Types.ObjectId(tenantIdStr);

        if (!req.tenantDB) {
            return res.status(500).json({ error: "tenant_db_unavailable", message: "Tenant database connection not available" });
        }

        const { LeavePolicy, Employee, LeaveBalance } = getModels(req);

        // Get leave cycle settings
        const AttendanceSettings = req.tenantDB.model('AttendanceSettings');
        const attendanceSettings = await AttendanceSettings.findOne({ tenant: tenantId }).catch(() => null);
        const startMonth = attendanceSettings?.leaveCycleStartMonth || 0;
        const now = new Date();
        let year = now.getFullYear();
        if (now.getMonth() < startMonth) year--;

        // Find existing policy before update
        const existingPolicy = await LeavePolicy.findOne({ _id: req.params.id, tenant: tenantId });
        if (!existingPolicy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        // Update the policy document
        const policy = await LeavePolicy.findOneAndUpdate(
            { _id: req.params.id, tenant: tenantId },
            req.body,
            { new: true, runValidators: true }
        );

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        // CRITICAL: Sync updated policy to all employees who have this policy assigned
        // This ensures that when HR updates a policy, all employees see the changes immediately
        console.log(`[UPDATE_POLICY] Syncing updated policy ${policy._id} to all assigned employees...`);

        const models = { Employee, LeaveBalance };
        const syncResults = await leavePolicyService.syncPolicyToAllEmployees(
            policy,
            models,
            tenantId,
            year,
            startMonth
        );

        console.log(`[UPDATE_POLICY] Successfully synced to ${syncResults.length} employees`);

        res.json({
            ...policy.toObject(),
            syncResults: {
                employeesUpdated: syncResults.length,
                details: syncResults
            }
        });
    } catch (error) {
        console.error('[UPDATE_POLICY] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to update policy' });
    }
};

exports.togglePolicyStatus = async (req, res) => {
    try {
        const { LeavePolicy } = getModels(req);
        const { id } = req.params;
        const { isActive } = req.body;
        const policyObjectId = new mongoose.Types.ObjectId(id);
        const tenantObjectId = new mongoose.Types.ObjectId(req.tenantId);

        const policy = await LeavePolicy.findOneAndUpdate(
            { _id: policyObjectId, tenant: tenantObjectId },
            { isActive },
            { new: true }
        );
        res.json(policy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.deletePolicy = async (req, res) => {
    try {
        const { LeavePolicy, Employee, LeaveBalance } = getModels(req);
        const policyId = req.params.id;

        console.log(`Deleting policy: ${policyId}`);

        // Find the policy first
        const policy = await LeavePolicy.findOne({ _id: policyId, tenant: req.tenantId });
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        // 1. Remove policy reference from all employees
        const employeesUpdated = await Employee.updateMany(
            { leavePolicy: policyId, tenant: req.tenantId },
            { $unset: { leavePolicy: "" } }
        );
        console.log(`Removed policy from ${employeesUpdated.modifiedCount} employees`);

        // 2. Delete all leave balances associated with this policy
        const balancesDeleted = await LeaveBalance.deleteMany({
            policy: policyId,
            tenant: req.tenantId
        });
        console.log(`Deleted ${balancesDeleted.deletedCount} leave balances`);

        // 3. Delete the policy itself
        await LeavePolicy.findOneAndDelete({ _id: policyId, tenant: req.tenantId });
        console.log('Policy deleted successfully');

        res.json({
            message: 'Policy deleted successfully',
            employeesAffected: employeesUpdated.modifiedCount,
            balancesDeleted: balancesDeleted.deletedCount
        });
    } catch (error) {
        console.error('Delete policy error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Assign policy to employee and initialize balances
exports.assignPolicyToEmployee = async (req, res) => {
    try {
        const tenantIdStr = req.user?.tenantId || req.tenantId;
        if (!tenantIdStr) {
            return res.status(400).json({ error: "tenant_missing", message: "Tenant ID is required" });
        }
        const tenantId = new mongoose.Types.ObjectId(tenantIdStr);

        const { Employee, LeavePolicy, LeaveBalance } = getModels(req);
        const { employeeId, policyId } = req.body;

        if (!employeeId || !policyId) {
            return res.status(400).json({ error: 'employeeId and policyId are required' });
        }

        const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
        const policyObjectId = new mongoose.Types.ObjectId(policyId);
        const tenantObjectId = new mongoose.Types.ObjectId(req.tenantId);

        const employee = await Employee.findOne({ _id: employeeObjectId, tenant: tenantId });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const policy = await LeavePolicy.findOne({ _id: policyObjectId, tenant: tenantId });
        if (!policy) return res.status(404).json({ error: 'Policy not found' });

        // Get leave cycle settings
        const AttendanceSettings = req.tenantDB.model('AttendanceSettings');
        const attendanceSettings = await AttendanceSettings.findOne({ tenant: tenantId }).catch(() => null);
        const startMonth = attendanceSettings?.leaveCycleStartMonth || 0;
        const now = new Date();
        let year = now.getFullYear();
        if (now.getMonth() < startMonth) year--;

        // Use service layer to sync policy to employee
        const models = { Employee, LeaveBalance };
        await leavePolicyService.syncPolicyToEmployee(
            employee,
            policy,
            LeaveBalance,
            tenantId,
            year,
            startMonth
        );

        res.json({ message: 'Policy assigned and balances initialized', policy });
    } catch (error) {
        console.error('[ASSIGN_POLICY] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to assign policy' });
    }
};
