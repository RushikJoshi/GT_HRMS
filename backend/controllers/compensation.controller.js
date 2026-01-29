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
 */
exports.createIncrement = async (req, res) => {
    try {
        const { Employee, EmployeeCtcVersion, EmployeeSalarySnapshot } = getModels(req);
        const { employeeId, effectiveFrom, totalCTC, components, grossA, grossB, grossC } = req.body;

        if (!employeeId) return res.status(400).json({ success: false, message: "Employee ID is required" });

        // 1. Deactivate old versions
        await EmployeeCtcVersion.updateMany(
            { employeeId, isActive: true },
            { $set: { isActive: false } }
        );

        // 2. Find latest version number
        const lastVersion = await EmployeeCtcVersion.findOne({ employeeId }).sort({ version: -1 });
        const newVersionNum = lastVersion ? lastVersion.version + 1 : 1;

        // 3. Create new version
        const newVersion = new EmployeeCtcVersion({
            companyId: req.user.tenantId,
            employeeId,
            version: newVersionNum,
            effectiveFrom: effectiveFrom || new Date(),
            grossA: grossA || 0,
            grossB: grossB || 0,
            grossC: grossC || 0,
            totalCTC,
            components,
            isActive: true,
            createdBy: req.user.id || req.user._id
        });

        await newVersion.save();

        res.json({
            success: true,
            message: "Compensation version created successfully",
            data: newVersion
        });

    } catch (error) {
        console.error("Create Increment Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/compensation/history/:employeeId
 */
exports.getCompensationHistory = async (req, res) => {
    try {
        const { EmployeeCtcVersion } = getModels(req);
        const { employeeId } = req.params;

        const history = await EmployeeCtcVersion.find({ employeeId })
            .sort({ version: -1 })
            .populate('createdBy', 'firstName lastName');

        res.json({
            success: true,
            data: history
        });

    } catch (error) {
        console.error("Get Compensation History Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
