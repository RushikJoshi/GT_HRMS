const SalaryCalculationEngine = require('../services/salaryCalculationEngine');
const mongoose = require('mongoose');

/**
 * ============================================
 * SALARY CONTROLLER (v9.0) - ARCHITECT GRADE
 * ============================================
 */

const safeNum = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;
};

/**
 * Mapper: Engine Result -> Database Snapshot Schema
 */
const mapToSnapshot = (result, req, extra = {}) => {
    const mapper = (list) => (list || []).map(item => ({
        code: item.code,
        name: item.name,
        calculationType: item.calculationType,
        value: item.value,
        basedOn: item.basedOn || 'NA',
        monthlyAmount: item.monthly,
        yearlyAmount: item.yearly
    }));

    return {
        tenant: req.user?.tenantId || req.tenantId,
        ctc: result.annualCTC,
        monthlyCTC: result.annualCTC / 12,
        earnings: mapper(result.earnings),
        employeeDeductions: mapper(result.deductions),
        benefits: mapper(result.benefits),
        summary: {
            grossEarnings: result.totals.grossYearly,
            totalDeductions: result.totals.deductionYearly,
            totalBenefits: result.benefits?.reduce((s, b) => s + b.yearly, 0) || 0,
            netPay: result.totals.netYearly
        },
        breakdown: {
            totalEarnings: result.totals.grossMonthly,
            totalDeductions: result.totals.deductionMonthly,
            totalBenefits: result.benefits?.reduce((s, b) => s + b.monthly, 0) || 0,
            netPay: result.totals.netMonthly
        },
        effectiveFrom: new Date(),
        locked: false,
        createdBy: req.user?.id || req.user?._id,
        ...extra
    };
};

/**
 * Mapper: Database Snapshot -> API Contract (Frontend)
 */
const mapToContract = (snapshot) => {
    if (!snapshot) return null;
    const doc = snapshot.toObject ? snapshot.toObject() : snapshot;

    const mapper = (list) => (list || []).map(item => ({
        code: item.code,
        name: item.name,
        calculationType: item.calculationType,
        value: item.value,
        basedOn: item.basedOn,
        monthly: item.monthlyAmount,
        yearly: item.yearlyAmount
    }));

    return {
        id: doc._id,
        annualCTC: doc.ctc,
        monthlyCTC: doc.monthlyCTC,
        locked: !!doc.locked,
        earnings: mapper(doc.earnings),
        deductions: mapper(doc.employeeDeductions),
        benefits: mapper(doc.benefits),
        totals: {
            grossMonthly: doc.breakdown?.totalEarnings || 0,
            grossYearly: doc.summary?.grossEarnings || 0,
            deductionMonthly: doc.breakdown?.totalDeductions || 0,
            deductionYearly: doc.summary?.totalDeductions || 0,
            netMonthly: doc.breakdown?.netPay || 0,
            netYearly: doc.summary?.netPay || 0,
            ctcYearly: doc.ctc || 0
        }
    };
};

const SalaryController = {
    /**
 * Preview Salary
 */
    async preview(req, res) {
        try {
            const { annualCTC, selectedEarnings, selectedDeductions, selectedBenefits } = req.body;
            console.log(`[SALARY_CONTROLLER] Preview requested: CTC=${annualCTC}`);

            // Fetch actual component configurations from database
            const tenantId = req.user?.tenant || req.user?.tenantId;
            if (!tenantId) {
                return res.status(400).json({ success: false, message: "Tenant ID missing" });
            }

            if (!req.tenantDB) {
                return res.status(400).json({ success: false, message: "Tenant database not resolved" });
            }

            const SalaryComponent = req.tenantDB.model('SalaryComponent');
            const DeductionMaster = req.tenantDB.model('DeductionMaster');
            const BenefitComponent = req.tenantDB.model('BenefitComponent');

            // Fetch all active components from database
            const [dbEarnings, dbDeductions, dbBenefits] = await Promise.all([
                SalaryComponent.find({ tenantId, isActive: true }).lean(),
                DeductionMaster.find({ tenantId, isActive: true }).lean(),
                BenefitComponent.find({ tenantId, isActive: true }).lean()
            ]);


            console.log(`🔍 DEBUG: Fetched ${dbEarnings.length} earnings, ${dbDeductions.length} deductions, ${dbBenefits.length} benefits from DB`);

            // Helper to merge selected components with DB configurations
            const mergeWithDB = (selectedList, dbList) => {
                const normalize = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, '');

                return (selectedList || []).map(selected => {
                    // Find matching DB component
                    const dbComp = dbList.find(db =>
                        (db._id && selected._id && db._id.toString() === selected._id.toString()) ||
                        (db.name && selected.name && normalize(db.name) === normalize(selected.name)) ||
                        (db.code && selected.code && db.code.toUpperCase() === selected.code.toUpperCase())
                    );

                    if (dbComp) {
                        return {
                            ...selected,
                            ...dbComp,
                            _id: dbComp._id,
                            calculationType: dbComp.calculationType || selected.calculationType,
                            percentage: dbComp.percentage || selected.percentage,
                            amount: dbComp.amount || selected.amount,
                            // Ensure 'value' is set for the engine
                            value: dbComp.percentage || dbComp.amount || selected.value || 0
                        };
                    }

                    console.warn(`[SALARY_CONTROLLER] No DB config found for ${selected.name}, using selected data`);
                    return selected;
                });
            };

            // Merge selected components with actual DB configurations
            const mergedEarnings = mergeWithDB(selectedEarnings, dbEarnings);
            const mergedDeductions = mergeWithDB(selectedDeductions, dbDeductions);
            const mergedBenefits = mergeWithDB(selectedBenefits, dbBenefits);

            console.log(`🔍 DEBUG: Merged earnings:`, mergedEarnings.map(e => ({
                name: e.name,
                calculationType: e.calculationType,
                percentage: e.percentage,
                amount: e.amount
            })));

            const result = SalaryCalculationEngine.calculateSalary({
                annualCTC,
                earnings: mergedEarnings,
                deductions: mergedDeductions,
                benefits: mergedBenefits
            });
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('[SALARY_CONTROLLER] Preview Error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    /**
     * Get Current
     */
    async getCurrent(req, res) {
        try {
            const { applicantId, employeeId } = req.query;
            console.log(`[SALARY_CONTROLLER] getCurrent called: applicantId=${applicantId}, employeeId=${employeeId}`);

            if (!req.tenantDB) {
                console.error('[SALARY_CONTROLLER] tenantDB missing in request');
                return res.status(400).json({ success: false, message: "Tenant database not resolved" });
            }

            // Ensure schema is registered (Defensive)
            if (!req.tenantDB.models.EmployeeSalarySnapshot) {
                req.tenantDB.model('EmployeeSalarySnapshot', require('../models/EmployeeSalarySnapshot'));
            }

            const Snapshot = req.tenantDB.model('EmployeeSalarySnapshot');
            let query = {};

            if (applicantId && mongoose.Types.ObjectId.isValid(applicantId)) {
                query.applicant = applicantId;
            } else if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
                query.employee = employeeId;
            } else {
                // Return empty instead of crashing on bad ID
                console.log('[SALARY_CONTROLLER] Invalid ID provided, returning default');
                const result = SalaryCalculationEngine.calculateSalary({ annualCTC: 0 });
                return res.json({ success: true, data: result, source: 'DEFAULT' });
            }

            console.log(`[SALARY_CONTROLLER] Querying snapshot with:`, query);
            const snapshot = await Snapshot.findOne(query).sort({ createdAt: -1 });

            if (snapshot) {
                console.log(`[SALARY_CONTROLLER] Snapshot found`);
                return res.json({ success: true, data: mapToContract(snapshot), source: 'SNAPSHOT' });
            }

            console.log(`[SALARY_CONTROLLER] No snapshot found, returning default zero-CTC calculation`);
            const result = SalaryCalculationEngine.calculateSalary({ annualCTC: 0 });
            res.json({ success: true, data: result, source: 'DEFAULT' });
        } catch (error) {
            console.error('[SALARY_CONTROLLER] getCurrent Fatal Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Get Specific Snapshot by ID
     */
    async getSnapshot(req, res) {
        try {
            const { id } = req.params;
            if (!req.tenantDB) {
                return res.status(400).json({ success: false, message: "Tenant database not resolved" });
            }

            const Snapshot = req.tenantDB.model('EmployeeSalarySnapshot');
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "Invalid Snapshot ID" });
            }

            const snapshot = await Snapshot.findById(id);

            if (!snapshot) {
                return res.status(404).json({ success: false, message: "Snapshot not found" });
            }

            return res.json({ success: true, data: mapToContract(snapshot), source: 'SNAPSHOT_ID' });

        } catch (error) {
            console.error('[SALARY_CONTROLLER] getSnapshot Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Assign (Save Draft)
     */
    async assign(req, res) {
        try {
            const { applicantId, employeeId, annualCTC, earnings, deductions, benefits } = req.body;
            const Snapshot = req.tenantDB.model('EmployeeSalarySnapshot');

            // 1. Strict Recalculation
            const result = SalaryCalculationEngine.calculateSalary({
                annualCTC, earnings, deductions, benefits
            });

            // 2. Transact: Remove old drafts, create new
            const query = applicantId ? { applicant: applicantId } : { employee: employeeId };
            await Snapshot.deleteMany({ ...query, locked: false });

            const payload = mapToSnapshot(result, req, {
                applicant: applicantId || null,
                employee: employeeId || null
            });

            const snapshot = await Snapshot.create(payload);

            // 3. Link to target
            const TargetModel = applicantId ? req.tenantDB.model('Applicant') : req.tenantDB.model('Employee');
            await TargetModel.findByIdAndUpdate(applicantId || employeeId, {
                $set: { salaryAssigned: true, salaryLocked: false, salarySnapshotId: snapshot._id }
            });

            res.json({ success: true, message: "Draft saved", data: mapToContract(snapshot) });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Finalize & Lock
     */
    async confirm(req, res) {
        try {
            const { applicantId, employeeId } = req.body;
            const Snapshot = req.tenantDB.model('EmployeeSalarySnapshot');
            const query = applicantId ? { applicant: applicantId } : { employee: employeeId };

            const snapshot = await Snapshot.findOne(query).sort({ createdAt: -1 });
            if (!snapshot) throw new Error("No draft found");

            // Final Cross Check: Sum of components must match CTC exactly
            const totalComps = snapshot.earnings.reduce((s, e) => s + e.yearlyAmount, 0) +
                snapshot.benefits.reduce((s, b) => s + b.yearlyAmount, 0);

            if (Math.abs(totalComps - snapshot.ctc) > 1) { // 1 rupee tolerance for rounding
                throw new Error("CTC Mismatch. Please recalculate and save draft again.");
            }

            snapshot.locked = true;
            snapshot.lockedAt = new Date();
            await snapshot.save();

            const TargetModel = applicantId ? req.tenantDB.model('Applicant') : req.tenantDB.model('Employee');
            await TargetModel.findByIdAndUpdate(applicantId || employeeId, { $set: { salaryLocked: true } });

            res.json({ success: true, message: "Finalized", data: mapToContract(snapshot) });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    /**
     * Unlock
     */
    async unlock(req, res) {
        try {
            const { applicantId, employeeId } = req.body;
            const Snapshot = req.tenantDB.model('EmployeeSalarySnapshot');
            const TargetModel = applicantId ? req.tenantDB.model('Applicant') : req.tenantDB.model('Employee');

            const query = applicantId ? { applicant: applicantId } : { employee: employeeId };
            await Snapshot.updateMany(query, { $set: { locked: false } });
            await TargetModel.findByIdAndUpdate(applicantId || employeeId, { $set: { salaryLocked: false } });

            res.json({ success: true, message: "Unlocked" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = SalaryController;
