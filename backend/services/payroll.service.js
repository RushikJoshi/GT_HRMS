const mongoose = require('mongoose');
/**
 * Payroll Service
 * Core payroll calculation engine
 * 
 * IMPORTANT RULES:
 * 1. All calculations are server-side only (never in frontend)
 * 2. Payslip data is stored as immutable snapshots
 * 3. Past payslips are never recalculated
 * 4. Follows mandatory calculation order
 * 5. Multi-tenant safe: ALWAYS use db.model(), NEVER use mongoose.model()
 * 6. Graceful fallbacks: Never crash on missing compensation
 */

const tdsService = require('./tds.service');
const { normalizeCompensation, ensureGrossTotals, getComponentValue } = require('./componentNormalizer.service');

/**
 * Safe model loader for multi-tenant DB access
 * Prevents "Schema not registered" errors by using db.model() pattern
 */
function getSafeModel(db, modelName, schema) {
    try {
        return db.model(modelName, schema);
    } catch (e) {
        // Already registered on this db connection
        return db.model(modelName);
    }
}

/**
 * Run payroll for a specific month/year
 * @param {Object} db - Tenant database connection
 * @param {ObjectId} tenantId - Tenant ID
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @param {ObjectId} initiatedBy - Employee ID who initiated
 * @returns {Object} Payroll run result
 */
async function runPayroll(db, tenantId, month, year, initiatedBy) {
    const PayrollRun = db.model('PayrollRun');
    const Payslip = db.model('Payslip');
    const Employee = db.model('Employee');
    const SalaryTemplate = db.model('SalaryTemplate');
    const Attendance = db.model('Attendance');
    const EmployeeDeduction = db.model('EmployeeDeduction');
    const DeductionMaster = db.model('DeductionMaster');
    const Holiday = db.model('Holiday');

    // Create or get payroll run
    let payrollRun = await PayrollRun.findOne({ tenantId, month, year });
    if (payrollRun && payrollRun.status !== 'INITIATED') {
        throw new Error(`Payroll for ${month}/${year} is already ${payrollRun.status}. Cannot recalculate.`);
    }

    if (!payrollRun) {
        payrollRun = new PayrollRun({
            tenantId,
            month,
            year,
            status: 'INITIATED',
            initiatedBy
        });
        await payrollRun.save();
    }

    // Get all active employees with salary templates
    const employees = await Employee.find({
        tenant: tenantId,
        status: 'Active'
    });

    payrollRun.totalEmployees = employees.length;
    payrollRun.processedEmployees = 0;
    payrollRun.failedEmployees = 0;
    payrollRun.errors = [];
    payrollRun.totalGross = 0;
    payrollRun.totalDeductions = 0;
    payrollRun.totalNetPay = 0;

    // Date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    const daysInMonth = endDate.getDate();

    // Get holidays for the month
    const holidays = await Holiday.find({
        tenant: tenantId,
        date: {
            $gte: startDate,
            $lte: endDate
        }
    });
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

    // Process each employee
    for (const employee of employees) {
        try {
            const payslip = await calculateEmployeePayroll(
                db,
                tenantId,
                employee,
                month,
                year,
                startDate,
                endDate,
                daysInMonth,
                holidayDates,
                payrollRun._id
            );

            payrollRun.processedEmployees++;
            payrollRun.totalGross += payslip.grossEarnings;
            payrollRun.totalDeductions += (payslip.preTaxDeductionsTotal + payslip.postTaxDeductionsTotal + payslip.incomeTax);
            payrollRun.totalNetPay += payslip.netPay;

        } catch (error) {
            console.error(`[PAYROLL] Error processing employee ${employee._id}:`, error);
            payrollRun.failedEmployees++;
            payrollRun.errors.push({
                employeeId: employee._id,
                message: error.message,
                stack: error.stack
            });
        }
    }

    // Update payroll run status
    payrollRun.status = 'CALCULATED';
    payrollRun.calculatedBy = initiatedBy;
    payrollRun.calculatedAt = new Date();
    await payrollRun.save();

    // Lock attendance records for the month
    await Attendance.updateMany(
        {
            tenant: tenantId,
            date: { $gte: startDate, $lte: endDate }
        },
        { $set: { locked: true } }
    );

    return payrollRun;
}

/**
 * Calculate payroll for a single employee
 */
async function calculateEmployeePayroll(
    db,
    tenantId,
    employee,
    month,
    year,
    startDate,
    endDate,
    daysInMonth,
    holidayDates,
    payrollRunId,
    explicitTemplateId = null,
    dryRun = false
) {
    const Payslip = db.model('Payslip');
    const Attendance = db.model('Attendance');
    const EmployeeDeduction = db.model('EmployeeDeduction');
    const DeductionMaster = db.model('DeductionMaster');
    const EmployeeCompensation = db.model('EmployeeCompensation');
    const EmployeeSalarySnapshot = db.model('EmployeeSalarySnapshot');

    // 🔥 PRIMARY SOURCE: EmployeeCompensation
    let comp = await EmployeeCompensation.findOne({
        employeeId: employee._id,
        isActive: true,
        status: 'ACTIVE'
    }).lean();

    let salaryTemplate;
    let compensationSource = 'EMPLOYEE_COMPENSATION';
    let isLegacyFallback = false;

    if (!comp) {
        // 🔄 FALLBACK: Try to use Employee's salarySnapshot
        console.warn(`⚠️ [PAYROLL] No EmployeeCompensation found for ${employee.firstName} ${employee.lastName}, trying salarySnapshot fallback...`);

        // Populate the employee's salarySnapshotId if it exists
        const Employee = db.model('Employee');
        const employeeWithSnapshot = await Employee.findById(employee._id).populate('salarySnapshotId').lean();

        if (employeeWithSnapshot && employeeWithSnapshot.salarySnapshotId) {
            const snapshot = employeeWithSnapshot.salarySnapshotId;
            console.log(`✅ [PAYROLL] Using salarySnapshot fallback for ${employee.firstName} ${employee.lastName}`);

            // Convert snapshot to compensation format
            salaryTemplate = {
                _id: snapshot._id,
                templateName: `Legacy Snapshot`,
                annualCTC: snapshot.annualCTC || 0,
                monthlyCTC: snapshot.monthlyCTC || Math.round((snapshot.annualCTC || 0) / 12),
                earnings: (snapshot.earnings || []).map(e => ({
                    name: e.name || 'Unknown Earning',
                    monthlyAmount: e.monthlyAmount || 0,
                    annualAmount: e.annualAmount || 0,
                    proRata: e.proRata !== false,
                    taxable: e.taxable !== false
                })),
                employerDeductions: (snapshot.employerDeductions || []).map(b => ({
                    name: b.name || 'Unknown Benefit',
                    monthlyAmount: b.monthlyAmount || 0
                })),
                settings: {
                    includePensionScheme: true,
                    pfWageRestriction: true,
                    includeESI: true
                },
                _compensationSource: 'SALARY_SNAPSHOT_FALLBACK'
            };
            compensationSource = 'SALARY_SNAPSHOT_FALLBACK';
            isLegacyFallback = true;
        } else {
            // No compensation AND no snapshot - this is an error
            throw new Error(`Employee ${employee._id} (${employee.firstName} ${employee.lastName}) has no active Employee Compensation record and no salary snapshot. Please set up compensation in Payroll -> Employee Compensation.`);
        }
    } else {
        // ✅ EmployeeCompensation found - convert to salary template
        console.log(`✅ [PAYROLL] EmployeeCompensation found for ${employee.firstName} ${employee.lastName}`);
        console.log(`📊 [PAYROLL] Raw compensation components count: ${comp.components?.length || 0}`);

        // Normalize and validate compensation
        const normalizedComp = normalizeCompensation(comp);
        const grossTotals = ensureGrossTotals(normalizedComp);

        console.log(`📊 [PAYROLL] Normalized components count: ${normalizedComp.components?.length || 0}`);
        console.log(`💰 [PAYROLL] Total CTC: ${grossTotals.totalCTC}`);

        // Build salary template from EmployeeCompensation
        salaryTemplate = {
            _id: comp._id,
            templateName: `Compensation`,
            annualCTC: grossTotals.totalCTC || 0,
            monthlyCTC: Math.max(0, Math.round((grossTotals.totalCTC || 0) / 12)),
            earnings: (normalizedComp.components || [])
                .filter(c => c && c.type === 'EARNING')
                .map(e => ({
                    name: e.name || 'Unknown Earning',
                    monthlyAmount: e.monthlyAmount || 0,
                    annualAmount: e.annualAmount || 0,
                    proRata: e.isProRata !== false,  // Default true
                    taxable: e.isTaxable !== false   // Default true
                })),
            employerDeductions: (normalizedComp.components || [])
                .filter(c => c && c.type === 'BENEFIT')
                .map(b => ({
                    name: b.name || 'Unknown Benefit',
                    monthlyAmount: b.monthlyAmount || 0
                })),
            settings: {
                includePensionScheme: true,
                pfWageRestriction: true,
                includeESI: true
            },
            _compensationSource: 'EMPLOYEE_COMPENSATION'
        };

        console.log(`📊 [PAYROLL] Converted earnings count: ${salaryTemplate.earnings.length}`);

        // 🔥 CRITICAL VALIDATION: Ensure we have earnings
        if (!salaryTemplate.earnings || salaryTemplate.earnings.length === 0) {
            throw new Error(`Employee ${employee._id} (${employee.firstName} ${employee.lastName}) has EmployeeCompensation but NO EARNING components defined. Please add earnings in Payroll -> Employee Compensation.`);
        }

        // Log first earning for verification
        if (salaryTemplate.earnings.length > 0) {
            console.log(`📊 [PAYROLL] First earning: ${salaryTemplate.earnings[0].name} = ₹${salaryTemplate.earnings[0].monthlyAmount}`);
        }
    }

    // Get attendance for the month
    const attendanceRecords = await Attendance.find({
        tenant: tenantId,
        employee: employee._id,
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Calculate attendance summary
    const attendanceSummary = calculateAttendanceSummary(
        attendanceRecords,
        daysInMonth,
        holidayDates,
        employee.joiningDate ? new Date(employee.joiningDate) : null,
        startDate
    );

    // STEP 1: Calculate Gross Earnings (with pro-rata)
    const grossCalculation = calculateGrossEarnings(
        salaryTemplate.earnings,
        daysInMonth,
        attendanceSummary.presentDays,
        attendanceSummary.lopDays
    );

    console.log(`📊 [PAYROLL] Gross calculation result:`);
    console.log(`   - Earnings snapshot count: ${grossCalculation.earningsSnapshot?.length || 0}`);
    console.log(`   - Total Gross: ₹${grossCalculation.totalGross}`);
    console.log(`   - Original Basic Amount: ₹${grossCalculation.originalBasicAmount}`);
    console.log(`   - Pro-rated Basic Amount: ₹${grossCalculation.basicAmount}`);
    if (grossCalculation.earningsSnapshot && grossCalculation.earningsSnapshot.length > 0) {
        console.log(`   - First earning in snapshot: ${grossCalculation.earningsSnapshot[0].name} = ₹${grossCalculation.earningsSnapshot[0].amount}`);
    }

    // STEP 2: Calculate Pre-Tax Deductions
    const preTaxDeductions = await calculatePreTaxDeductions(
        db,
        tenantId,
        employee._id,
        grossCalculation.totalGross,
        grossCalculation.basicAmount,
        salaryTemplate.settings
    );

    // STEP 3: Calculate Taxable Income
    // Use only components marked `taxable` when computing taxable income
    let taxableIncome = (grossCalculation.taxableGross || grossCalculation.totalGross) - preTaxDeductions.total;

    // 🔒 SAFETY: Ensure taxable income is never negative (can't have negative tax)
    if (taxableIncome < 0) {
        console.warn(`⚠️ [PAYROLL] Taxable income is negative (₹${taxableIncome}). Setting to 0.`);
        console.warn(`   Gross: ₹${grossCalculation.totalGross}, Pre-Tax Deductions: ₹${preTaxDeductions.total}`);
        taxableIncome = 0;
    }

    // STEP 4: Calculate Income Tax (TDS)
    // Use the TDS service to compute monthly TDS based on annualized taxable income
    let incomeTax = 0;
    let tdsResult = { monthly: 0, annual: 0, regime: 'NEW' };  // Default snapshot

    try {
        tdsResult = await tdsService.calculateMonthlyTDS(taxableIncome, employee, { tenantId, month, year });
        incomeTax = tdsResult.monthly || 0;

        // 🔒 SAFETY: Validate TDS result
        if (isNaN(incomeTax) || !isFinite(incomeTax)) {
            console.warn(`⚠️ [PAYROLL] TDS calculation returned invalid value: ${incomeTax}. Setting to 0.`);
            incomeTax = 0;
            tdsResult = { monthly: 0, annual: 0, regime: 'NEW' };
        }
    } catch (tdsError) {
        console.error(`❌ [PAYROLL] TDS calculation failed:`, tdsError.message);
        incomeTax = 0;  // Fallback to 0 if TDS fails
        tdsResult = { monthly: 0, annual: 0, regime: 'NEW', error: tdsError.message };
    }

    // STEP 5: Calculate Post-Tax Deductions
    const postTaxDeductions = await calculatePostTaxDeductions(
        db,
        tenantId,
        employee._id,
        grossCalculation.totalGross,
        grossCalculation.basicAmount,
        attendanceSummary.lopDays,
        grossCalculation.basicAmount,
        daysInMonth
    );

    // STEP 6: Calculate Net Pay
    let netPay = (taxableIncome - incomeTax) - postTaxDeductions.total;

    // 🔒 SAFETY: Validate net pay
    if (isNaN(netPay) || !isFinite(netPay)) {
        console.error(`❌ [PAYROLL] Net pay calculation resulted in invalid value: ${netPay}`);
        console.error(`   Taxable Income: ₹${taxableIncome}, Income Tax: ₹${incomeTax}, Post-Tax Deductions: ₹${postTaxDeductions.total}`);
        netPay = 0;
    }

    // Ensure net pay is not negative
    if (netPay < 0) {
        console.warn(`⚠️ [PAYROLL] Net pay is negative (₹${netPay}). Setting to 0.`);
        netPay = 0;
    }

    // Prepare employer contributions snapshot (from template)
    const employerContributions = salaryTemplate.employerDeductions.map(contrib => ({
        name: contrib.name,
        amount: contrib.monthlyAmount
    }));

    // Create payslip snapshot
    const payslipData = {
        tenantId,
        employeeId: employee._id,
        payrollRunId: payrollRunId || new mongoose.Types.ObjectId(), // Mock ID for preview if null
        month,
        year,
        employeeInfo: {
            employeeId: employee.employeeId || '',
            name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            department: employee.department || '',
            designation: employee.role || '',
            bankAccountNumber: employee.bankDetails?.accountNumber || '',
            bankIFSC: employee.bankDetails?.ifsc || '',
            bankName: employee.bankDetails?.bankName || '',
            panNumber: employee.documents?.panCard || ''
        },
        earningsSnapshot: grossCalculation.earningsSnapshot,
        preTaxDeductionsSnapshot: preTaxDeductions.snapshot,
        postTaxDeductionsSnapshot: postTaxDeductions.snapshot,
        employerContributionsSnapshot: employerContributions,
        grossEarnings: grossCalculation.totalGross,
        preTaxDeductionsTotal: preTaxDeductions.total,
        taxableIncome,
        incomeTax,
        tdsSnapshot: tdsResult,
        postTaxDeductionsTotal: postTaxDeductions.total,
        netPay,
        attendanceSummary,
        salaryTemplateId: salaryTemplate._id,
        salaryTemplateSnapshot: {
            templateName: salaryTemplate.templateName,
            annualCTC: salaryTemplate.annualCTC,
            monthlyCTC: salaryTemplate.monthlyCTC
        },
        // ✅ Track compensation source
        compensationSource: compensationSource,
        isLegacyFallback: isLegacyFallback,
        generatedBy: payrollRunId // Can be updated with actual user ID
    };

    const payslip = new Payslip(payslipData);

    // Manually generate hash to avoid pre-validate hook issues
    if (!payslip.hash) {
        const crypto = require('crypto');
        const hashData = JSON.stringify({
            grossEarnings: payslip.grossEarnings || 0,
            preTaxDeductionsTotal: payslip.preTaxDeductionsTotal || 0,
            taxableIncome: payslip.taxableIncome || 0,
            incomeTax: payslip.incomeTax || 0,
            postTaxDeductionsTotal: payslip.postTaxDeductionsTotal || 0,
            netPay: payslip.netPay || 0
        });
        payslip.hash = crypto.createHash('sha256').update(hashData).digest('hex');
    }

    // 🔍 COMPREHENSIVE LOGGING BEFORE SAVE
    console.log(`\n🎯 [PAYROLL] Final Payslip Data for ${employee.firstName} ${employee.lastName}:`);
    console.log(`   📊 Earnings Snapshot: ${payslip.earningsSnapshot?.length || 0} items`);
    if (payslip.earningsSnapshot && payslip.earningsSnapshot.length > 0) {
        payslip.earningsSnapshot.forEach((e, idx) => {
            console.log(`      ${idx + 1}. ${e.name}: ₹${e.amount}`);
        });
    }
    console.log(`   💰 Gross Earnings: ₹${payslip.grossEarnings}`);
    console.log(`   📉 Pre-Tax Deductions: ₹${payslip.preTaxDeductionsTotal}`);
    console.log(`   💸 Taxable Income: ₹${payslip.taxableIncome}`);
    console.log(`   🏦 Income Tax: ₹${payslip.incomeTax}`);
    console.log(`   📉 Post-Tax Deductions: ₹${payslip.postTaxDeductionsTotal}`);
    console.log(`   ✅ Net Pay: ₹${payslip.netPay}`);
    console.log(`   🔒 Dry Run: ${dryRun ? 'YES (Preview)' : 'NO (Saving to DB)'}\n`);

    if (!dryRun) {
        await payslip.save();
        console.log(`✅ [PAYROLL] Payslip saved to DB with ID: ${payslip._id}`);
    }

    return payslip;
}

/**
 * Calculate attendance summary
 */
function calculateAttendanceSummary(attendanceRecords, daysInMonth, holidayDates, joiningDate, monthStartDate) {
    let presentDays = 0;
    let leaveDays = 0;
    let lopDays = 0;
    let holidayDays = 0;

    // Check if employee joined mid-month
    const actualStartDate = joiningDate && joiningDate > monthStartDate ? joiningDate : monthStartDate;
    const actualDaysInMonth = actualStartDate > monthStartDate
        ? daysInMonth - (actualStartDate.getDate() - 1)
        : daysInMonth;

    attendanceRecords.forEach(record => {
        const dateStr = record.date.toISOString().split('T')[0];
        if (holidayDates.has(dateStr)) {
            holidayDays++;
        } else if (record.status === 'present' || record.status === 'half_day') {
            presentDays += record.status === 'half_day' ? 0.5 : 1;
        } else if (record.status === 'leave') {
            // Check if paid leave or unpaid (LOP)
            if (record.leaveType && record.leaveType.toLowerCase().includes('lop')) {
                lopDays++;
            } else {
                leaveDays++;
            }
        } else if (record.status === 'absent') {
            lopDays++;
        }
    });

    return {
        totalDays: actualDaysInMonth,
        presentDays,
        leaveDays,
        lopDays,
        holidayDays
    };
}

/**
 * Calculate Gross Earnings with pro-rata
 */
function calculateGrossEarnings(earnings, daysInMonth, presentDays, lopDays) {
    const earningsSnapshot = [];
    let totalGross = 0;
    let basicAmount = 0;  // Pro-rated basic for deductions
    let originalBasicAmount = 0;  // Original monthly basic
    let taxableGross = 0;

    earnings.forEach(earning => {
        let amount = earning.monthlyAmount || 0;
        let originalAmount = amount;
        let isProRata = false;
        let daysWorked = presentDays;
        let totalDays = daysInMonth;

        // Apply pro-rata if enabled (typically for Basic and some allowances)
        // Determine pro-rata behaviour: explicit flag overrides legacy logic
        if (earning.proRata === true || (earning.proRata === undefined && earning.name.toLowerCase().includes('basic'))) {
            // Track original basic amount
            if (earning.name.toLowerCase().includes('basic')) {
                originalBasicAmount = originalAmount;
            }

            // Pro-rata calculation: (amount / daysInMonth) * presentDays
            amount = Math.round((amount / daysInMonth) * presentDays * 100) / 100;
            isProRata = true;

            // Set pro-rated basic amount for deductions
            if (earning.name.toLowerCase().includes('basic')) {
                basicAmount = amount;  // Use pro-rated amount
            }
        } else {
            // Non-pro-rated basic (if exists)
            if (earning.name.toLowerCase().includes('basic') && !basicAmount) {
                basicAmount = amount;
                originalBasicAmount = amount;
            }
        }

        earningsSnapshot.push({
            name: earning.name,
            amount: Math.round(amount * 100) / 100,
            isProRata,
            originalAmount: originalAmount,
            daysWorked: isProRata ? presentDays : null,
            totalDays: isProRata ? daysInMonth : null
        });

        totalGross += amount;
        // Accumulate taxable gross only for components marked taxable (default true)
        const isTaxable = earning.taxable === false ? false : true;
        if (isTaxable) taxableGross += amount;
    });

    return {
        earningsSnapshot,
        totalGross: Math.round(totalGross * 100) / 100,
        taxableGross: Math.round(taxableGross * 100) / 100,
        basicAmount,  // Pro-rated basic for deduction calculations
        originalBasicAmount  // Original monthly basic for reference
    };
}

/**
 * Calculate Pre-Tax Deductions (EPF, ESI, Professional Tax, TDS)
 */
async function calculatePreTaxDeductions(db, tenantId, employeeId, grossEarnings, basicAmount, templateSettings) {
    const EmployeeDeduction = db.model('EmployeeDeduction');
    const DeductionMaster = db.model('DeductionMaster');

    const snapshot = [];
    let total = 0;

    // Get active employee deductions
    const employeeDeductions = await EmployeeDeduction.find({
        tenantId,
        employeeId,
        status: 'ACTIVE',
        startDate: { $lte: new Date() },
        $or: [
            { endDate: null },
            { endDate: { $gte: new Date() } }
        ]
    }).populate('deductionId');

    // Filter pre-tax deductions
    const preTaxDeductions = employeeDeductions.filter(ed =>
        ed.deductionId && ed.deductionId.category === 'PRE_TAX'
    );

    // Calculate EPF (Employee Contribution)
    const epfDeduction = preTaxDeductions.find(d =>
        d.deductionId.name.toLowerCase().includes('pf') ||
        d.deductionId.name.toLowerCase().includes('epf')
    );

    if (epfDeduction || templateSettings?.includePensionScheme) {
        const pfWage = templateSettings?.pfWageRestriction
            ? Math.min(basicAmount, templateSettings.pfWageLimit || 15000)
            : basicAmount;
        const epfAmount = Math.round((pfWage * 0.12) * 100) / 100; // 12% of PF wage
        snapshot.push({
            name: 'Employee Provident Fund (EPF)',
            amount: epfAmount,
            category: 'EPF'
        });
        total += epfAmount;
    }

    // Calculate ESI (Employee Contribution) - 0.75% of Gross
    if (grossEarnings <= 21000 && templateSettings?.includeESI) {
        const esiAmount = Math.round((grossEarnings * 0.0075) * 100) / 100;
        snapshot.push({
            name: 'Employee State Insurance (ESI)',
            amount: esiAmount,
            category: 'ESI'
        });
        total += esiAmount;
    }

    // Calculate other pre-tax deductions from EmployeeDeduction
    for (const ed of preTaxDeductions) {
        const master = ed.deductionId;
        if (master.name.toLowerCase().includes('pf') || master.name.toLowerCase().includes('epf')) {
            continue; // Already calculated
        }
        if (master.name.toLowerCase().includes('esi')) {
            continue; // Already calculated
        }

        let amount = 0;
        const baseValue = ed.customValue !== null && ed.customValue !== undefined ? ed.customValue : master.amountValue;

        if (master.amountType === 'FIXED') {
            amount = baseValue;
        } else if (master.amountType === 'PERCENTAGE') {
            const baseAmount = master.calculationBase === 'BASIC' ? basicAmount : grossEarnings;
            amount = Math.round((baseAmount * baseValue / 100) * 100) / 100;
        }

        if (amount > 0) {
            snapshot.push({
                name: master.name,
                amount,
                category: 'OTHER'
            });
            total += amount;
        }
    }

    return {
        snapshot,
        total: Math.round(total * 100) / 100
    };
}

/**
 * Calculate Income Tax (TDS) - Placeholder implementation
 * TODO: Implement proper tax calculation based on:
 * - Tax regime (Old vs New)
 * - Annual income projection
 * - Investments and deductions
 * - Tax slabs
*/

/**
 * Calculate Post-Tax Deductions (Loans, LOP, Advances, Penalties)
 */
async function calculatePostTaxDeductions(
    db,
    tenantId,
    employeeId,
    grossEarnings,
    basicAmount,
    lopDays,
    monthlyBasic,
    daysInMonth
) {
    const EmployeeDeduction = db.model('EmployeeDeduction');
    const DeductionMaster = db.model('DeductionMaster');

    const snapshot = [];
    let total = 0;

    // Get active employee deductions
    const employeeDeductions = await EmployeeDeduction.find({
        tenantId,
        employeeId,
        status: 'ACTIVE',
        startDate: { $lte: new Date() },
        $or: [
            { endDate: null },
            { endDate: { $gte: new Date() } }
        ]
    }).populate('deductionId');

    // Filter post-tax deductions
    const postTaxDeductions = employeeDeductions.filter(ed =>
        ed.deductionId && ed.deductionId.category === 'POST_TAX'
    );

    // Calculate LOP (Loss of Pay)
    if (lopDays > 0) {
        const lopAmount = Math.round((monthlyBasic / daysInMonth) * lopDays * 100) / 100;
        snapshot.push({
            name: 'Loss of Pay (LOP)',
            amount: lopAmount,
            category: 'LOP'
        });
        total += lopAmount;
    }

    // Calculate other post-tax deductions
    for (const ed of postTaxDeductions) {
        const master = ed.deductionId;

        // Skip LOP if already calculated above
        if (master.name.toLowerCase().includes('lop') || master.name.toLowerCase().includes('loss of pay')) {
            continue;
        }

        let amount = 0;
        const baseValue = ed.customValue !== null && ed.customValue !== undefined ? ed.customValue : master.amountValue;

        if (master.amountType === 'FIXED') {
            amount = baseValue;
        } else if (master.amountType === 'PERCENTAGE') {
            const baseAmount = master.calculationBase === 'BASIC' ? basicAmount : grossEarnings;
            amount = Math.round((baseAmount * baseValue / 100) * 100) / 100;
        }

        if (amount > 0) {
            snapshot.push({
                name: master.name,
                amount,
                category: 'OTHER'
            });
            total += amount;
        }
    }

    return {
        snapshot,
        total: Math.round(total * 100) / 100
    };
}

module.exports = {
    runPayroll,
    // Exported for controllers to perform previews and single-employee calculations
    calculateEmployeePayroll
};

