const mongoose = require('mongoose');
const payrollService = require('../services/payroll.service');

// Helper to get models
const getModels = (req) => {
    return {
        Employee: req.tenantDB.model('Employee'),
        SalaryTemplate: req.tenantDB.model('SalaryTemplate'),
        Attendance: req.tenantDB.model('Attendance'),
        PayrollRun: req.tenantDB.model('PayrollRun'),
        PayrollRunItem: req.tenantDB.model('PayrollRunItem'),
        SalaryAssignment: req.tenantDB.model('SalaryAssignment'),
        Applicant: req.tenantDB.model('Applicant')
    };
};

/**
 * GET /api/payroll/process/employees?month=YYYY-MM
 * Fetch employees with their status for the payroll month
 */
exports.getProcessEmployees = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        if (!month) return res.status(400).json({ success: false, message: "Month is required" });

        const [year, monthNum] = month.split('-');
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0);

        const { Employee, SalaryAssignment, Attendance, SalaryTemplate, Applicant } = getModels(req);
        const EmployeeCtcVersion = req.tenantDB.model('EmployeeCtcVersion', require('../models/EmployeeCtcVersion'));

        // 1. Fetch Active Employees
        const employees = await Employee.find({
            status: 'Active',
            $or: [
                { joiningDate: { $lte: endDate } },
                { joiningDate: null }
            ]
        }).select('firstName lastName employeeId department role email joiningDate salaryTemplateId');

        // 2. Fetch Applicants with Salary Assigned
        // These are candidates who are hired/active but might not be migrated to Employee yet
        const applicants = await Applicant.find({
            tenant: req.user.tenantId,
            $or: [
                { salaryAssigned: true },
                { salaryHistory: { $exists: true, $not: { $size: 0 } } },
                { salarySnapshotId: { $ne: null } }
            ],
            status: { $ne: 'Rejected' }
        }).select('name email mobile department requirementId employeeId salaryAssigned salarySnapshotId salaryTemplateId joiningDate');

        // 3. Merge and Deduplicate by Email
        const employeeMap = new Map();

        // Add employees first (Master records)
        employees.forEach(emp => {
            employeeMap.set(emp.email?.toLowerCase(), {
                _id: emp._id,
                name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unnamed Employee',
                employeeId: emp.employeeId,
                email: emp.email,
                department: emp.department,
                salaryTemplateId: emp.salaryTemplateId,
                source: 'EMPLOYEE',
                joiningDate: emp.joiningDate
            });
        });

        // Add applicants if not already present as employees
        applicants.forEach(app => {
            const email = app.email?.toLowerCase();
            // Only add if not already present OR if applicant is the one linked to employeeId
            if (!employeeMap.has(email)) {
                employeeMap.set(email, {
                    _id: app._id,
                    name: app.name || 'Unnamed Applicant',
                    employeeId: app.employeeId ? 'LINKED' : 'UNASSIGNED',
                    email: app.email,
                    department: app.department,
                    salaryTemplateId: app.salaryTemplateId,
                    source: 'APPLICANT',
                    joiningDate: app.joiningDate
                });
            }
        });

        const allPeople = Array.from(employeeMap.values());

        // 4. Calculate Attendance and Map to Final Format
        const employeeData = await Promise.all(allPeople.map(async (person) => {
            // Find template/version
            let templateId = person.salaryTemplateId;

            if (!templateId) {
                const activeVersion = await EmployeeCtcVersion.findOne({
                    employeeId: person._id,
                    isActive: true
                });
                templateId = activeVersion ? activeVersion._id : null;
            }

            // Simple Attendance Count
            const attendanceCount = await Attendance.countDocuments({
                employee: person._id,
                date: { $gte: startDate, $lte: endDate },
                status: { $in: ['present', 'half_day', 'work_from_home'] }
            });

            return {
                ...person,
                key: person._id, // Required for Ant Design table
                salaryTemplateId: templateId,
                attendanceParams: {
                    presentDays: attendanceCount,
                    totalDays: endDate.getDate()
                }
            };
        }));

        res.json({ success: true, count: employeeData.length, data: employeeData });

    } catch (error) {
        console.error("Get Process Employees Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/payroll/process/preview
 * Calculate partial payroll for selected employees
 * Body: { month: "YYYY-MM", items: [{ employeeId, salaryTemplateId OR useCompensation }], useCompensation: boolean }
 * ✅ NEW: Supports both salary template and employee compensation sources
 */
exports.previewPreview = async (req, res) => {
    try {
        const { month, items, useCompensation = false } = req.body;
        const [year, monthNum] = month.split('-');
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0);

        const { Employee, SalaryTemplate, PayrollRun, Applicant } = getModels(req);

        // ✅ NEW: Load compensation service if needed
        let compensationService;
        if (useCompensation) {
            compensationService = require('../services/payrollCompensationSource.service');
        }

        const results = [];

        for (const item of items) {
            let emp = await Employee.findById(item.employeeId);
            if (!emp) {
                // Try fetching from Applicant collection if not found in Employee
                emp = await Applicant.findById(item.employeeId);
                if (emp) {
                    // Normalize applicant to match expected employee structure for payroll service
                    emp.firstName = emp.name?.split(' ')[0] || 'Applicant';
                    emp.lastName = emp.name?.split(' ').slice(1).join(' ') || '';
                }
            }

            if (!emp) continue;

            try {
                // ✅ NEW: Support compensation source
                let salaryTemplateId = item.salaryTemplateId;
                let sourceInfo = { source: 'TEMPLATE' }; // Default

                if (useCompensation) {
                    // Fetch compensation for this employee
                    const compensation = await compensationService.getEmployeeCompensation(
                        req.tenantDB,
                        req.user.tenantId,
                        emp._id
                    );

                    if (compensation.found) {
                        // Use compensation
                        sourceInfo = {
                            source: 'COMPENSATION',
                            applicantId: compensation.applicantId,
                            reason: compensation.compensation.reason
                        };

                        // Convert compensation to template format for payroll service
                        const convertedTemplate = compensationService.convertCompensationToTemplate(
                            compensation.compensation
                        );
                        salaryTemplateId = convertedTemplate._id;

                        console.log(`✅ [PREVIEW] Using COMPENSATION for employee ${emp._id}`);
                    } else {
                        // ✅ Guard: Compensation not found
                        console.warn(`⚠️ [PREVIEW] Compensation not found for ${emp._id}, will use template fallback`);
                        // Continue with template if salaryTemplateId provided, else mark as error
                        if (!item.salaryTemplateId) {
                            results.push({
                                employeeId: emp._id,
                                error: 'CTC NOT SET - No compensation found and no fallback template provided'
                            });
                            continue;
                        }
                        salaryTemplateId = item.salaryTemplateId;
                    }
                }

                // Call Service with DRY RUN
                const result = await payrollService.calculateEmployeePayroll(
                    req.tenantDB,
                    req.user.tenantId,
                    emp,
                    parseInt(monthNum),
                    parseInt(year),
                    startDate,
                    endDate,
                    endDate.getDate(),
                    new Set(), // Empty holidays for preview
                    null, // No payrollRunId
                    salaryTemplateId,
                    true // dryRun = true
                );

                results.push({
                    employeeId: emp._id,
                    gross: result.grossEarnings,
                    net: result.netPay,
                    sourceInfo, // ✅ Track which source was used
                    // ✅ NEW: Include compensation source from payslip
                    compensationSource: result.compensationSource,
                    isLegacyFallback: result.isLegacyFallback,
                    breakdown: result
                });

            } catch (err) {
                results.push({
                    employeeId: emp._id,
                    error: err.message,
                    compensationSource: 'ERROR',
                    isLegacyFallback: false,
                    sourceInfo: { source: 'ERROR' }
                });
            }
        }

        res.json({ success: true, data: results });

    } catch (error) {
        console.error("Preview Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/payroll/process/run
 * Execute Payroll Run with Strict Validation and Skipping Disabled Items
 * Body: { month: "YYYY-MM", items: [{ employeeId, salaryTemplateId OR useCompensation }], useCompensation: boolean }
 * ✅ NEW: Supports both salary template and employee compensation sources
 */
exports.runPayroll = async (req, res) => {
    try {
        const { month, items, useCompensation = false } = req.body;
        console.log(`🚀 [RUN_PAYROLL] Month: ${month}, Items: ${items?.length}, Source: ${useCompensation ? 'COMPENSATION' : 'TEMPLATE'}`);
        const [year, monthNum] = month.split('-');

        const { PayrollRun, Employee, PayrollRunItem, SalaryAssignment, Applicant } = getModels(req);

        // ✅ NEW: Load compensation service if needed
        let compensationService;
        if (useCompensation) {
            compensationService = require('../services/payrollCompensationSource.service');
        }

        // 1. Check duplicate run
        let payrollRun = await PayrollRun.findOne({ month: parseInt(monthNum), year: parseInt(year) });

        if (payrollRun) {
            if (['APPROVED', 'PAID'].includes(payrollRun.status)) {
                return res.status(400).json({ success: false, message: "Payroll for this month is already approved or paid" });
            }
            // If exists but not finalized, we reset it
            console.log(`♻️ [RUN_PAYROLL] Resetting existing run: ${payrollRun._id}`);
            payrollRun.status = 'INITIATED';
            payrollRun.initiatedBy = req.user.id || req.user._id;
            payrollRun.totalEmployees = items.length;
            payrollRun.processedEmployees = 0;
            payrollRun.failedEmployees = 0;
            payrollRun.totalGross = 0;
            payrollRun.totalNetPay = 0;
            payrollRun.executionErrors = [];
            // Delete existing items for this run to start fresh
            await PayrollRunItem.deleteMany({ payrollRunId: payrollRun._id });
        } else {
            // 2. Create Payroll Run Holder
            payrollRun = new PayrollRun({
                tenantId: req.user.tenantId,
                month: parseInt(monthNum),
                year: parseInt(year),
                status: 'INITIATED',
                initiatedBy: req.user.id || req.user._id,
                totalEmployees: items.length,
                processedEmployees: 0,
                source: useCompensation ? 'COMPENSATION' : 'TEMPLATE' // ✅ NEW: Track source
            });
        }
        await payrollRun.save();

        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0);

        let successCount = 0;
        let failCount = 0;
        let totalGross = 0;
        let totalNet = 0;

        const skippedList = [];
        const processedList = [];

        // 3. Process Items
        for (const item of items) {
            // Basic Validation
            if (!item.employeeId) continue;

            // ✅ NEW: Support compensation source validation
            let salaryTemplateId = item.salaryTemplateId;
            let sourceInfo = { source: 'TEMPLATE' }; // Default

            if (useCompensation) {
                // Fetch compensation for this employee
                const compensation = await compensationService.getEmployeeCompensation(
                    req.tenantDB,
                    req.user.tenantId,
                    item.employeeId
                );

                if (compensation.found) {
                    // Use compensation
                    sourceInfo = {
                        source: 'COMPENSATION',
                        applicantId: compensation.applicantId,
                        reason: compensation.compensation.reason
                    };

                    // Convert compensation to template format for payroll service
                    const convertedTemplate = compensationService.convertCompensationToTemplate(
                        compensation.compensation
                    );
                    salaryTemplateId = convertedTemplate._id;
                    console.log(`✅ [RUN_PAYROLL] Using COMPENSATION for employee ${item.employeeId}`);
                } else {
                    // ✅ Guard: Compensation not found - try fallback or skip
                    console.warn(`⚠️ [RUN_PAYROLL] Compensation not found for ${item.employeeId}`);
                    if (!item.salaryTemplateId) {
                        // No fallback available
                        skippedList.push({
                            employeeId: item.employeeId,
                            reason: "CTC NOT SET - No compensation and no template fallback"
                        });
                        continue;
                    }
                    // Use fallback template
                    salaryTemplateId = item.salaryTemplateId;
                    sourceInfo = { source: 'TEMPLATE_FALLBACK' };
                }
            }

            // Validation 1: Missing Template (original logic)
            if (!useCompensation && !salaryTemplateId) {
                skippedList.push({
                    employeeId: item.employeeId,
                    reason: "SALARY_TEMPLATE_MISSING"
                });
                continue; // Skip this employee
            }

            try {
                let emp = await Employee.findById(item.employeeId);
                if (!emp) {
                    emp = await Applicant.findById(item.employeeId);
                    if (emp) {
                        emp.firstName = emp.name?.split(' ')[0] || 'Applicant';
                        emp.lastName = emp.name?.split(' ').slice(1).join(' ') || '';
                    }
                }

                if (!emp) {
                    skippedList.push({ employeeId: item.employeeId, reason: "PERSON_NOT_FOUND" });
                    continue;
                }

                console.log(`🔍 [RUN_PAYROLL] Processing person: ${emp._id} (${sourceInfo.source})`);
                // Call Service to calculate and save payslip
                const payslip = await payrollService.calculateEmployeePayroll(
                    req.tenantDB,
                    req.user.tenantId,
                    emp,
                    parseInt(monthNum),
                    parseInt(year),
                    startDate,
                    endDate,
                    endDate.getDate(),
                    new Set(), // No holidays for simple run
                    payrollRun._id,
                    salaryTemplateId,
                    false // dryRun = false (SAVE the payslip)
                );

                console.log(`\n📦 [RUN_PAYROLL] Payslip returned from service:`);
                console.log(`   Earnings: ${payslip.earningsSnapshot?.length || 0} items`);
                console.log(`   Gross: ₹${payslip.grossEarnings}`);
                console.log(`   Net: ₹${payslip.netPay}`);
                console.log(`   Payslip ID: ${payslip._id}\n`);

                console.log(`📊 [RUN_PAYROLL] Attendance for ${emp.firstName}: Present ${payslip.attendanceSummary?.presentDays}, Holidays ${payslip.attendanceSummary?.holidayDays}`);

                // Validation 2: Zero Payable Days
                // Payable = presentDays + holidayDays + (leaveDays if paid)
                const { presentDays = 0, holidayDays = 0, leaveDays = 0 } = payslip.attendanceSummary || {};
                const payableDays = (presentDays || 0) + (holidayDays || 0) + (leaveDays || 0);

                if (payableDays <= 0) {
                    console.warn(`⚠️ [RUN_PAYROLL] Skipping ${emp.firstName} - no payable attendance (Payable: ${payableDays})`);
                    skippedList.push({
                        employeeId: item.employeeId,
                        reason: "NO_PAYABLE_ATTENDANCE"
                    });
                    continue; // Skip this employee
                }

                console.log(`✅ [RUN_PAYROLL] Payslip already saved by service: ${payslip._id}`);

                // ✅ NEW: Save source information in PayrollRunItem
                await PayrollRunItem.create({
                    tenantId: req.user.tenantId,
                    payrollRunId: payrollRun._id,
                    employeeId: emp._id,
                    salaryTemplateId: salaryTemplateId,
                    sourceInfo, // ✅ Track source used
                    attendanceSummary: {
                        totalDays: payslip.attendanceSummary.totalDays,
                        daysPresent: payslip.attendanceSummary.presentDays,
                        daysAbsent: (payslip.attendanceSummary.totalDays - payslip.attendanceSummary.presentDays - payslip.attendanceSummary.holidayDays - payslip.attendanceSummary.leaveDays),
                        leaves: payslip.attendanceSummary.leaveDays,
                        holidays: payslip.attendanceSummary.holidayDays
                    },
                    calculatedGross: payslip.grossEarnings,
                    calculatedNet: payslip.netPay,
                    status: 'Processed'
                });

                successCount++;
                processedList.push(emp._id);
                totalGross += payslip.grossEarnings;
                totalNet += payslip.netPay;
                console.log(`✅ [RUN_PAYROLL] Processed ${emp.firstName} ${emp.lastName} (${sourceInfo.source}): Gross ${payslip.grossEarnings}, Net ${payslip.netPay}`);

            } catch (err) {
                // Handle specific service errors gracefully
                if (err.message && err.message.includes('no active salary template')) {
                    skippedList.push({
                        employeeId: item.employeeId,
                        reason: "SALARY_TEMPLATE_MISSING"
                    });
                } else {
                    console.error(`❌ [RUN_PAYROLL] Failed to process ${item.employeeId}:`, err);
                    failCount++;
                    // Log fail but don't crash whole run
                    payrollRun.executionErrors.push({
                        employeeId: item.employeeId,
                        message: err.message || "Unknown error",
                        stack: err.stack
                    });

                    try {
                        await PayrollRunItem.create({
                            tenantId: req.user.tenantId,
                            payrollRunId: payrollRun._id,
                            employeeId: item.employeeId,
                            salaryTemplateId: salaryTemplateId,
                            sourceInfo, // ✅ Track source even for failures
                            attendanceSummary: {},
                            calculatedGross: 0,
                            calculatedNet: 0,
                            status: 'Failed'
                        });
                    } catch (innerErr) {
                        console.error("Critical fail saving failure item:", innerErr);
                    }
                }
            }
        }

        // Update Run Status
        payrollRun.status = 'CALCULATED';
        payrollRun.processedEmployees = successCount;
        payrollRun.failedEmployees = failCount;
        payrollRun.totalGross = totalGross;
        payrollRun.totalNetPay = totalNet;
        payrollRun.totalDeductions = totalGross - totalNet;
        await payrollRun.save();

        console.log(`✅ [RUN_PAYROLL] SUCCESS: processed ${successCount}, skipped ${skippedList.length}`);

        // Respond with Complete Summary
        res.json({
            success: true,
            data: {
                payrollRunId: payrollRun._id,
                month: payrollRun.month,
                year: payrollRun.year,
                status: payrollRun.status,
                source: useCompensation ? 'COMPENSATION' : 'TEMPLATE', // ✅ Return source
                totalEmployees: items.length,
                processedEmployees: successCount,
                failedEmployees: failCount,
                skippedEmployees: skippedList.length,
                totalGross: totalGross,
                totalDeductions: 0, // Can be calculated if needed
                totalNetPay: totalNet,
                skippedList: skippedList,
                processedList: processedList,
                errors: failCount > 0 ?
                    skippedList.map(s => ({
                        employeeId: s.employeeId,
                        message: s.reason
                    })) : []
            },
            message: `Payroll processed (${useCompensation ? 'COMPENSATION' : 'TEMPLATE'}): ${successCount} successful, ${failCount} failed, ${skippedList.length} skipped`
        });

    } catch (error) {
        console.error("Run Payroll Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
