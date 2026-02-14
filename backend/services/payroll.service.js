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
const { normalizeCompensation, ensureGrossTotals, getComponentValue, normalizeComponentKey } = require('./componentNormalizer.service');

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

    // Get employees to process
    const filter = {
        tenant: tenantId,
        status: 'Active'
    };

    // Apply filters if provided
    if (payrollRun.isFiltered && payrollRun.filters) {
        const { department, designation, employeeTypes, workModes } = payrollRun.filters;

        if (department && department !== 'All Departments') {
            filter.department = department;
        }

        if (designation && designation !== 'All Designations') {
            filter.designation = designation;
        }

        if (employeeTypes && employeeTypes.length > 0) {
            filter.employeeType = { $in: employeeTypes };
        }

        if (workModes && workModes.length > 0) {
            filter.workMode = { $in: workModes };
        }
    }

    const employees = await Employee.find(filter);

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
    _unusedTemplateId = null,
    dryRun = false
) {

    const Payslip = db.model('Payslip');
    const Attendance = db.model('Attendance');
    const EmployeeDeduction = db.model('EmployeeDeduction');
    const DeductionMaster = db.model('DeductionMaster');
    const EmployeeCompensation = db.model('EmployeeCompensation');

    const PayrollAdjustment = db.model('PayrollAdjustment', require('../models/PayrollAdjustment'));

    // 🛡️ STEP 0A: Verify person exists (Employee OR Applicant)
    const Employee = db.model('Employee');
    const Applicant = db.model('Applicant');
    let person = await Employee.findById(employee._id).lean();
    if (!person) {
        person = await Applicant.findById(employee._id).lean();
    }
    if (!person) {
        console.error(`❌ [PAYROLL] Person with ID ${employee._id} not found in Employees or Applicants`);
        throw new Error(`Person with ID ${employee._id} not found`);
    }

    // 🎯 FETCH APPROVED ADJUSTMENTS for this month
    const mStr = `${year}-${String(month).padStart(2, '0')}`;
    const pendingAdjustments = await PayrollAdjustment.find({
        employeeId: employee._id,
        adjustmentMonth: mStr,
        status: 'APPROVED' // Maker-Checker: ONLY APPROVED are eligible
    }).lean();

    const adjustmentTotal = pendingAdjustments.reduce((sum, adj) => sum + adj.adjustmentAmount, 0);

    // 🔍 STEP 0: Select Salary Source (Graceful Fallback Implementation)
    let comp = await EmployeeCompensation.findOne({
        employeeId: employee._id,
        isActive: true,
        status: 'ACTIVE'
    }).lean();

    if (!comp) {
        console.warn(`⚠️ [PAYROLL] Active compensation not found for ${employee.firstName}. Checking fallbacks...`);

        // 1️⃣ Find Applicant linked to this employee (if applicable)
        const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
        let linkedApplicant = await Applicant.findOne({
            $or: [
                { employeeId: employee._id },
                { _id: employee._id }, // Case where the "employee" object IS the applicant
                { name: { $regex: new RegExp(`^${fullName}$`, 'i') } } // Case-insensitive name fallback
            ]
        }).lean();

        if (linkedApplicant) {
            console.log(`🔍 [PAYROLL] Found linked applicant: ${linkedApplicant._id}`);

            // 2️⃣ Check for EmployeeSalarySnapshot (via salarySnapshotId)
            if (linkedApplicant.salarySnapshotId) {
                const EmployeeSalarySnapshot = db.model('EmployeeSalarySnapshot');
                const snapshot = await EmployeeSalarySnapshot.findById(linkedApplicant.salarySnapshotId).lean();
                if (snapshot) {
                    console.log(`✅ [PAYROLL] Fallback: Using EmployeeSalarySnapshot for ${employee.firstName}`);
                    comp = {
                        _id: snapshot._id,
                        totalCTC: snapshot.ctc || snapshot.totalCTC || 0,
                        grossA: (snapshot.breakdown?.totalEarnings || snapshot.summary?.grossEarnings) || 0,
                        components: [
                            ...(snapshot.earnings || []).map(e => ({ ...e, type: 'EARNING' })),
                            ...(snapshot.employeeDeductions || snapshot.deductions || []).map(d => ({ ...d, type: 'DEDUCTION' })),
                            ...(snapshot.benefits || snapshot.employerBenefits || []).map(b => ({ ...b, type: 'BENEFIT' }))
                        ]
                    };
                }
            }

            // 3️⃣ Check for Applicant.salarySnapshot (Legacy fallback)
            if (!comp && linkedApplicant.salarySnapshot) {
                console.log(`✅ [PAYROLL] Fallback: Using Applicant.salarySnapshot for ${employee.firstName}`);
                const snap = linkedApplicant.salarySnapshot;
                comp = {
                    _id: linkedApplicant._id,
                    totalCTC: snap.totals?.annualCTC || snap.ctcYearly || 0,
                    grossA: snap.totals?.grossEarnings || snap.grossA || 0,
                    components: (snap.earnings || []).map(e => ({
                        name: e.label || e.name,
                        monthlyAmount: e.monthly || e.monthlyAmount,
                        type: 'EARNING'
                    }))
                };
            }
        }

        // 4️⃣ Check SalaryStructure (Global collection)
        if (!comp) {
            const SalaryStructure = mongoose.model('SalaryStructure');
            const structure = await SalaryStructure.findOne({
                candidateId: linkedApplicant ? linkedApplicant._id : employee._id
            }).lean();

            if (structure) {
                console.log(`✅ [PAYROLL] Fallback: Using SalaryStructure for ${employee.firstName}`);
                comp = {
                    _id: structure._id,
                    totalCTC: structure.totals?.annualCTC || 0,
                    grossA: structure.totals?.grossEarnings || 0,
                    components: [
                        ...(structure.earnings || []).map(e => ({ ...e, name: e.label, monthlyAmount: e.monthly, type: 'EARNING' })),
                        ...(structure.deductions || []).map(d => ({ ...d, name: d.label, monthlyAmount: d.monthly, type: 'DEDUCTION' })),
                        ...(structure.employerBenefits || []).map(b => ({ ...b, name: b.label, monthlyAmount: b.monthly, type: 'BENEFIT' }))
                    ]
                };
            }
        }
    }

    // FINAL FALLBACK: Zero Structure (Rule #6 - Never Crash)
    if (!comp) {
        console.warn(`❌ [PAYROLL] NO COMPENSATION DATA FOUND for ${employee.firstName}. Using ZERO fallback structure.`);
        comp = {
            _id: new mongoose.Types.ObjectId(),
            totalCTC: 0,
            components: [
                { name: 'Basic Salary', monthlyAmount: 0, type: 'EARNING', isProRata: true }
            ]
        };
    }

    console.log(`✅ [PAYROLL] Proceeding with compensation for ${employee.firstName}`);


    const normalizedComp = normalizeCompensation(comp);
    const grossTotals = ensureGrossTotals(normalizedComp);

    // 2️⃣ Build Earnings from Components
    const earnings = (normalizedComp.components || [])
        .filter(c => c && (c.type || '').toUpperCase() === 'EARNING')
        .map(e => {
            // 🛡️ Multi-field fallback for monthly amount
            const rawMonthly = e.monthlyAmount ?? e.amount ?? e.value ?? e.monthly ?? e.componentAmount;
            const monthlyAmount = parseFloat(String(rawMonthly || 0).replace(/[^0-9.-]+/g, '')) || 0;

            // 🛡️ Multi-field fallback for annual amount
            const rawAnnual = e.annualAmount ?? e.annual ?? e.yearlyAmount;
            let annualAmount = parseFloat(String(rawAnnual || 0).replace(/[^0-9.-]+/g, '')) || 0;

            // Auto-calculate annual if missing
            if (annualAmount === 0 && monthlyAmount > 0) {
                annualAmount = monthlyAmount * 12;
            }

            return {
                name: e.name || 'Unknown Earning',
                monthlyAmount: monthlyAmount,
                annualAmount: annualAmount,
                proRata: e.isProRata !== false,
                taxable: e.isTaxable !== false
            };
        });

    // 3️⃣ Strict Validation: Check for empty earnings
    if (!earnings || earnings.length === 0) {
        throw new Error(`No earning components configured for employee ${employee.firstName}`);
    }

    // 4️⃣ Construct Salary Template Object (Strictly from Compensation)
    const salaryTemplate = {
        _id: comp._id,
        templateName: `Active Compensation`,
        annualCTC: grossTotals.totalCTC || 0,
        monthlyCTC: Math.round((grossTotals.totalCTC || 0) / 12),
        earnings: earnings,
        employerDeductions: (normalizedComp.components || [])
            .filter(c => c && (c.type || '').toUpperCase() === 'BENEFIT')
            .map(b => ({
                name: b.name || 'Unknown Benefit',
                monthlyAmount: b.monthlyAmount || 0
            })),
        settings: comp.settings || {
            includePensionScheme: true,
            pfWageRestriction: true,
            includeESI: true
        }
    };

    // 📅 Get attendance for the month using date range filtering only
    // Date range: Start of month to end of month (inclusive with time)
    const attendanceStartDate = new Date(year, month - 1, 1);
    const attendanceEndDate = new Date(year, month, 0, 23, 59, 59);

    console.log(`🔍 [ATTENDANCE] Fetching records for employee ${employee._id}`);
    console.log(`   - Date Range: ${attendanceStartDate.toISOString()} to ${attendanceEndDate.toISOString()}`);
    console.log(`   - Month: ${month}, Year: ${year}`);

    const attendanceRecords = await Attendance.find({
        tenant: tenantId,
        employee: new mongoose.Types.ObjectId(employee._id),
        date: { $gte: attendanceStartDate, $lte: attendanceEndDate }
    }).sort({ date: 1 }).lean();

    console.log(`✅ [ATTENDANCE] Found ${attendanceRecords.length} attendance records`);
    console.log(`   - Total Days in Month: ${daysInMonth}`);
    console.log(`   - Employee: ${employee.firstName} ${employee.lastName}`);

    // Debug: Log first few records
    if (attendanceRecords.length > 0) {
        console.log(`   - Sample Records (first 3):`);
        attendanceRecords.slice(0, 3).forEach((rec, idx) => {
            console.log(`     ${idx + 1}. Date: ${rec.date?.toISOString()?.split('T')[0]}, Status: ${rec.status}`);
        });
    }

    // Calculate attendance summary
    const attendanceSummary = calculateAttendanceSummary(
        attendanceRecords,
        daysInMonth,
        holidayDates,
        employee.joiningDate ? new Date(employee.joiningDate) : null,
        startDate,
        employee._id // For logging
    );

    // 🛡️ SAFETY: If no attendance records or presentDays is 0, assume full month present
    // This prevents zero salary when attendance is not tracked
    if (attendanceRecords.length === 0) {
        console.warn(`⚠️ [ATTENDANCE] No attendance records found for ${employee.firstName}. Assuming full month present.`);
        attendanceSummary.presentDays = attendanceSummary.totalDays;
    } else if (attendanceSummary.presentDays === 0) {
        console.warn(`⚠️ [ATTENDANCE] Present days is 0 for ${employee.firstName}. Assuming full month present.`);
        attendanceSummary.presentDays = attendanceSummary.totalDays;
    }

    console.log(`📊 [FINAL ATTENDANCE] Using Present Days: ${attendanceSummary.presentDays} / ${attendanceSummary.totalDays}`);

    // STEP 1: Calculate Gross Earnings (with pro-rata)
    const grossCalculation = calculateGrossEarnings(
        salaryTemplate.earnings || [],
        attendanceSummary.totalDays || daysInMonth,
        attendanceSummary.presentDays || 0,
        attendanceSummary.lopDays || 0
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

    // 🔥 APPLY PAYROLL ADJUSTMENTS (Corrections/Arrears)
    netPay += adjustmentTotal;
    console.log(`💡 [PAYROLL] Applying adjustments for ${employee.firstName}: ₹${adjustmentTotal} (New Net: ₹${netPay})`);

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
            department: employee.departmentId?.name || employee.department || 'General',
            designation: employee.designation || employee.role || 'N/A',
            bankAccountNumber: employee.bankDetails?.accountNumber || '',
            bankIFSC: employee.bankDetails?.ifsc || '',
            bankName: employee.bankDetails?.bankName || '',
            branchName: employee.bankDetails?.branchName || '',
            accountHolderName: employee.bankDetails?.accountHolderName || '',
            panNumber: employee.documents?.panCard || employee.panCard || '',
            pfNumber: employee.meta?.pfNo || employee.pfNo || '',
            uanNumber: employee.meta?.uanNo || employee.uanNo || '',
            gender: employee.gender || 'N/A',
            dob: employee.dob || null,
            joiningDate: employee.joiningDate || null
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
        adjustmentsSnapshot: pendingAdjustments.map(adj => ({
            adjustmentId: adj._id,
            type: adj.adjustmentType,
            amount: adj.adjustmentAmount,
            reason: adj.reason
        })),
        attendanceSummary,

        salaryTemplateId: salaryTemplate._id,
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
            netPay: payslip.netPay || 0,
            adjustments: payslip.adjustmentsSnapshot?.map(a => ({ id: a.adjustmentId, amt: a.amount }))
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

        // 🎯 MARK ADJUSTMENTS AS APPLIED
        if (pendingAdjustments.length > 0) {
            await PayrollAdjustment.updateMany(
                { _id: { $in: pendingAdjustments.map(a => a._id) } },
                {
                    $set: {
                        status: 'APPLIED',
                        appliedInPayslipId: payslip._id
                    }
                }
            );
            console.log(`📝 [PAYROLL] Marked ${pendingAdjustments.length} adjustments as APPLIED`);
        }
    }

    return payslip;
}

/**
 * Calculate attendance summary
 */
function calculateAttendanceSummary(attendanceRecords, daysInMonth, holidayDates, joiningDate, monthStartDate, empIdForLog) {
    let presentDays = 0;
    let leaveDays = 0;
    let lopDays = 0;
    let holidayDays = 0;

    console.log(`\n📊 [ATTENDANCE SUMMARY] Processing ${attendanceRecords.length} records for employee ${empIdForLog}`);
    console.log(`   - Total Days in Month: ${daysInMonth}`);
    console.log(`   - Holiday Dates Count: ${holidayDates.size}`);

    // Validate joining date
    const isValidJoinDate = joiningDate instanceof Date && !isNaN(joiningDate.getTime());

    // Check if employee joined mid-month
    const actualStartDate = isValidJoinDate && joiningDate > monthStartDate ? joiningDate : monthStartDate;

    let actualDaysInMonth = daysInMonth;
    if (isValidJoinDate && joiningDate > monthStartDate) {
        actualDaysInMonth = Math.max(0, daysInMonth - (joiningDate.getDate() - 1));
    }

    // Guard against invalid days
    if (isNaN(actualDaysInMonth) || actualDaysInMonth <= 0) {
        actualDaysInMonth = daysInMonth;
    }

    attendanceRecords.forEach(record => {
        const dateStr = record.date.toISOString().split('T')[0];

        // Status normalization (case-insensitive)
        const status = (record.status || '').toLowerCase();
        const isWFH = record.isWFH === true || status === 'work_from_home' || status === 'wfh';
        const isOnDuty = record.isOnDuty === true || status === 'on_duty' || status === 'od';

        // ✅ Primary check: status === 'present' (case-insensitive)
        const isPresent = status === 'present';

        // Accumulate explicit LOP (from penalty rules) for reporting
        if (record.lopDays && typeof record.lopDays === 'number') {
            lopDays += record.lopDays;
        }

        if (holidayDates.has(dateStr)) {
            holidayDays++;
        } else if (isPresent || status === 'half_day' || isWFH || isOnDuty) {
            // Count as present (isPresent = status === 'present')
            const dayWeight = status === 'half_day' ? 0.5 : 1;
            presentDays += dayWeight;
        } else if (status === 'leave') {
            // Check if paid leave or unpaid (LOP)
            if (record.leaveType && record.leaveType.toLowerCase().includes('lop')) {
                // Check if we haven't already counted this via record.lopDays
                if (!record.lopDays) {
                    lopDays++;
                }
            } else {
                leaveDays++;
            }
        } else if (status === 'absent') {
            // Check if we haven't already counted this via record.lopDays
            if (!record.lopDays) {
                lopDays++;
            }
        }
    });

    console.log(`\n✅ [ATTENDANCE SUMMARY] Results:`);
    console.log(`   - Total Days: ${actualDaysInMonth}`);
    console.log(`   - Present Days: ${presentDays}`);
    console.log(`   - Leave Days (Paid): ${leaveDays}`);
    console.log(`   - LOP Days: ${lopDays}`);
    console.log(`   - Holiday Days: ${holidayDays}`);
    console.log(`   - Pro-rata Formula: (basic / ${actualDaysInMonth}) * ${presentDays}\n`);

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

        // Use ComponentKey Normalizer for robust matching
        const normalizedName = normalizeComponentKey(earning.name);
        const isBasic = normalizedName === 'basic' || earning.name.toLowerCase().includes('basic');

        // Apply pro-rata if enabled (typically for Basic and some allowances)
        // Determine pro-rata behaviour: explicit flag overrides legacy logic
        if (earning.proRata === true || (earning.proRata === undefined && isBasic)) {
            // Track original basic amount
            if (isBasic) {
                originalBasicAmount = originalAmount;
            }

            // Pro-rata calculation: (amount / daysInMonth) * presentDays
            // Formula: (basic / totalDays) * presentDays
            const calculatedAmount = (amount / daysInMonth) * presentDays;

            // 🔍 Debug log for pro-rata calculation
            if (isBasic) {
                console.log(`\n💰 [PRO-RATA DEBUG] Basic Salary Calculation:`);
                console.log(`   - Component: ${earning.name}`);
                console.log(`   - Original Monthly Amount: ₹${originalAmount}`);
                console.log(`   - Total Days in Month: ${daysInMonth}`);
                console.log(`   - Present Days: ${presentDays}`);
                console.log(`   - Formula: (${originalAmount} / ${daysInMonth}) * ${presentDays}`);
                console.log(`   - Calculated: ₹${calculatedAmount}`);
            }

            amount = Math.round(calculatedAmount * 100) / 100;
            isProRata = true;

            // Set pro-rated basic amount for deductions
            if (isBasic) {
                basicAmount = amount;  // Use pro-rated amount
            }
        } else {
            // Non-pro-rated basic (if exists)
            if (isBasic && !basicAmount) {
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

    // 🔒 SAFETY: If no component was identified as 'basic', use the first earning as a fallback 
    // to ensure deductions (PF/ESI) don't crash with zero base.
    if (basicAmount === 0 && earningsSnapshot.length > 0) {
        // Only warn if totalGross is > 0, otherwise it's just a 0-salary employee
        if (totalGross > 0) {
            console.warn(`⚠️ [PAYROLL] No 'basic' component identified for deductions. Using first earning.`);
            basicAmount = earningsSnapshot[0].amount;
            originalBasicAmount = earningsSnapshot[0].originalAmount;
        }
    }

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
    }).populate('deductionId').lean();

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
    }).populate('deductionId').lean();

    // Filter post-tax deductions
    const postTaxDeductions = employeeDeductions.filter(ed =>
        ed.deductionId && ed.deductionId.category === 'POST_TAX'
    );

    // Calculate LOP (Loss of Pay)
    // ⚠️ FIXED: Disabled LOP deduction here because Basic is already pro-rated based on presentDays in calculateGrossEarnings.
    // Enabling this would cause double deduction (once in pro-ratio, and again here).
    /*
    if (lopDays > 0) {
        const lopAmount = Math.round((monthlyBasic / daysInMonth) * lopDays * 100) / 100;
        snapshot.push({
            name: 'Loss of Pay (LOP)',
            amount: lopAmount,
            category: 'LOP'
        });
        total += lopAmount;
    }
    */

    // Calculate other post-tax deductions
    for (const ed of postTaxDeductions) {
        const master = ed.deductionId;

        // Skip LOP if already calculated above (or disabled)
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

