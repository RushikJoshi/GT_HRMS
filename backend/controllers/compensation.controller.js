const mongoose = require('mongoose');

// Helper to get models from tenant DB
const getModels = (req) => {
    return {
        Employee: req.tenantDB.model('Employee'),
        EmployeeCtcVersion: req.tenantDB.model('EmployeeCtcVersion', require('../models/EmployeeCtcVersion')),
        EmployeeSalarySnapshot: req.tenantDB.model('EmployeeSalarySnapshot', require('../models/EmployeeSalarySnapshot')),
        SalaryAssignment: req.tenantDB.model('SalaryAssignment', require('../models/SalaryAssignment'))
    };
};

/**
 * UNIVERSAL NORMALIZATION MAPPER
 * Converts various schemas into EmployeeCtcVersion components
 */
const normalizeComponents = (source, typeMap = {}) => {
    const list = [];

    // Auto-detect list based on common legacy keys
    const earnings = source.earnings || source.earningsSnapshot || [];
    const deductions = source.deductions || source.employeeDeductions || source.deductionsSnapshot || [];
    const benefits = source.benefits || source.employerBenefits || source.benefitsSnapshot || source.employerContributionsSnapshot || [];

    earnings.forEach(e => list.push({
        name: e.label || e.name || 'Basic',
        code: e.key || e.code || 'EARNING',
        monthlyAmount: e.monthly || e.monthlyAmount || 0,
        annualAmount: e.yearly || e.yearlyAmount || 0,
        type: 'EARNING',
        isTaxable: true,
        isProRata: true
    }));

    deductions.forEach(d => list.push({
        name: d.label || d.name || 'Deduction',
        code: d.key || d.code || 'DEDUCTION',
        monthlyAmount: d.monthly || d.monthlyAmount || 0,
        annualAmount: d.yearly || d.yearlyAmount || 0,
        type: 'DEDUCTION',
        isTaxable: true,
        isProRata: true
    }));

    benefits.forEach(b => list.push({
        name: b.label || b.name || 'Benefit',
        code: b.key || b.code || 'BENEFIT',
        monthlyAmount: b.monthly || b.monthlyAmount || 0,
        annualAmount: b.yearly || b.yearlyAmount || 0,
        type: 'BENEFIT',
        isTaxable: true,
        isProRata: true
    }));

    return list;
};

/**
 * AUTO-DETECT SALARY SOURCE BRIDGE
 * Checks SalaryStructure (Global), EmployeeSalarySnapshot (Tenant), and Applicant/Employee (Tenant)
 */
const syncDynamicCompensation = async (req, employees) => {
    try {
        const { EmployeeCtcVersion, EmployeeSalarySnapshot, Employee } = getModels(req);
        // Load Global SalaryStructure model
        const SalaryStructure = mongoose.models.SalaryStructure || require('../models/SalaryStructure');

        for (const emp of employees) {
            // Rule: Never overwrite active version
            const hasVersion = await EmployeeCtcVersion.exists({ employeeId: emp._id });
            if (hasVersion) continue;

            let sourceData = null;
            let detected = '';

            // 1. Try Global SalaryStructure (Highest priority for current modal)
            const globalStruct = await SalaryStructure.findOne({
                tenantId: req.user.tenantId,
                candidateId: emp._id
            }).lean();
            if (globalStruct) {
                sourceData = {
                    totalCTC: globalStruct.totals?.annualCTC || globalStruct.totals?.monthlyCTC * 12 || 0,
                    grossA: globalStruct.totals?.grossEarnings || 0,
                    grossB: globalStruct.totals?.employerBenefits || 0,
                    grossC: 0,
                    components: normalizeComponents(globalStruct),
                    effectiveFrom: globalStruct.updatedAt || emp.joiningDate
                };
                detected = 'SalaryStructure (Global)';
            }

            // 2. Fallback to Tenant EmployeeSalarySnapshot
            if (!sourceData) {
                const snapshot = await EmployeeSalarySnapshot.findOne({
                    employee: emp._id
                }).sort({ createdAt: -1 }).lean();
                if (snapshot) {
                    sourceData = {
                        totalCTC: snapshot.ctc || snapshot.annualCTC || 0,
                        grossA: snapshot.summary?.grossEarnings || snapshot.breakdown?.totalEarnings || 0,
                        grossB: snapshot.summary?.totalBenefits || snapshot.breakdown?.totalBenefits || 0,
                        grossC: 0,
                        components: normalizeComponents(snapshot),
                        effectiveFrom: snapshot.effectiveFrom || snapshot.createdAt
                    };
                    detected = 'EmployeeSalarySnapshot (Tenant)';
                }
            }

            // 3. Fallback to Applicant Snapshot (if promoted or new)
            if (!sourceData) {
                const Applicant = req.tenantDB.model('Applicant');
                const applicant = await Applicant.findOne({ _id: emp._id }).select('salarySnapshot ctc').lean();
                if (applicant && applicant.salarySnapshot) {
                    sourceData = {
                        totalCTC: applicant.ctc || applicant.salarySnapshot.totals?.annualCTC || 0,
                        grossA: applicant.salarySnapshot.totals?.grossEarnings || 0,
                        grossB: applicant.salarySnapshot.totals?.employerBenefits || 0,
                        grossC: 0,
                        components: normalizeComponents(applicant.salarySnapshot),
                        effectiveFrom: applicant.salarySnapshot.calculatedAt || emp.joiningDate
                    };
                    detected = 'ApplicantSnapshot (Tenant)';
                }
            }

            if (sourceData && sourceData.totalCTC > 0) {
                const v1 = new EmployeeCtcVersion({
                    companyId: req.user.tenantId,
                    employeeId: emp._id,
                    version: 1,
                    effectiveFrom: sourceData.effectiveFrom || emp.joiningDate || new Date(),
                    grossA: sourceData.grossA,
                    grossB: sourceData.grossB,
                    grossC: sourceData.grossC,
                    totalCTC: sourceData.totalCTC,
                    components: sourceData.components,
                    isActive: true,
                    createdBy: req.user.id || req.user._id
                });
                await v1.save();
                console.log(`[COMPENSATION_BRIDGE] Sync SUCCESS for ${emp.employeeId} via ${detected}. CTC: ₹${v1.totalCTC}`);
            }
        }
    } catch (err) {
        console.error("[COMPENSATION_BRIDGE] Sync Warning:", err.message);
    }
};

/**
 * GET /api/compensation/list
 * Shows each employee's ACTIVE CTC
 */
exports.getCompensationList = async (req, res) => {
    try {
        const { Employee, EmployeeCtcVersion } = getModels(req);
        const { search, status } = req.query;

        let query = {};
        if (status) {
            query.status = status;
        }

        const employees = await Employee.find(query)
            .select('firstName lastName employeeId department role status joiningDate')
            .lean();

        // RUN AUTO-DETECTION BRIDGE (NON-BLOCKING)
        syncDynamicCompensation(req, employees).catch(e => console.error("[FATAL] Sync failure:", e));

        const results = await Promise.all(employees.map(async (emp) => {
            const activeVersion = await EmployeeCtcVersion.findOne({
                employeeId: emp._id,
                isActive: true
            }).sort({ version: -1 });

            // Search filter (simple)
            if (search) {
                const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
                if (!fullName.includes(search.toLowerCase()) && !emp.employeeId.toLowerCase().includes(search.toLowerCase())) {
                    return null;
                }
            }

            return {
                ...emp,
                activeVersion: activeVersion || null,
                ctcStatus: activeVersion ? (activeVersion.isActive ? 'Active' : 'Blocked') : 'CTC Not Set'
            };
        }));

        res.json({
            success: true,
            data: results.filter(r => r !== null)
        });

    } catch (error) {
        console.error("Get Compensation List Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};



/**
 * POST /api/compensation/increment
 * Allows safe increments via versioning, never edits historical data
 * 
 * ENHANCED: Now uses salaryIncrement service for:
 * - Proper validation
 * - Status management (ACTIVE/SCHEDULED/EXPIRED)
 * - Audit trail
 * - Auto-activation based on effectiveFrom date
 */
exports.createIncrement = async (req, res) => {
    try {
        const salaryIncrementService = require('../services/salaryIncrement.service');

        const {
            employeeId,
            effectiveFrom,
            totalCTC,
            grossA,
            grossB,
            grossC,
            components,
            incrementType,
            reason,
            notes
        } = req.body;

        // Validation
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        if (!effectiveFrom) {
            return res.status(400).json({
                success: false,
                message: 'Effective From date is required'
            });
        }

        if (!totalCTC || totalCTC <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid Total CTC is required'
            });
        }

        // Validate user context
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        const userId = req.user.id || req.user._id;
        const tenantId = req.user.tenantId || req.user.companyId;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in request'
            });
        }

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Tenant ID not found in request'
            });
        }

        // Create increment using service
        const result = await salaryIncrementService.createIncrement(req.tenantDB, {
            employeeId,
            effectiveFrom,
            totalCTC,
            grossA,
            grossB,
            grossC,
            components,
            incrementType: incrementType || 'INCREMENT',
            reason,
            notes,
            createdBy: userId,
            companyId: tenantId
        });

        res.json({
            success: true,
            message: `Salary ${result.status === 'ACTIVE' ? 'increment activated' : 'increment scheduled'} successfully`,
            data: {
                newVersion: {
                    version: result.newCtcVersion.version,
                    totalCTC: result.newCtcVersion.totalCTC,
                    grossA: result.newCtcVersion.grossA,
                    effectiveFrom: result.newCtcVersion.effectiveFrom,
                    status: result.status,
                    isActive: result.newCtcVersion.isActive
                },
                change: {
                    absolute: result.change.absolute,
                    percentage: result.change.percentage
                },
                status: result.status,
                statusMessage: result.status === 'ACTIVE'
                    ? 'Increment is now active and will be used for payroll'
                    : `Increment scheduled for ${new Date(effectiveFrom).toLocaleDateString()}`
            }
        });

    } catch (error) {
        console.error("Create Increment Error:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            user: req.user ? { id: req.user.id || req.user._id, tenantId: req.user.tenantId } : 'No user',
            body: req.body
        });
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create increment',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * GET /api/compensation/history/:employeeId
 */
exports.getCompensationHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const Applicant = req.tenantDB.model('Applicant');

        const applicant = await Applicant.findById(employeeId).select('salaryHistory');

        if (!applicant) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            data: applicant.salaryHistory || []
        });

    } catch (error) {
        console.error("Get History Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch history'
        });
    }
};
