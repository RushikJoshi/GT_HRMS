const mongoose = require('mongoose');
const payrollService = require('../services/payroll.service');

// Helper to get models
const getModels = (req) => {
    return {
        Employee: req.tenantDB.model('Employee'),
        Attendance: req.tenantDB.model('Attendance'),
        PayrollRun: req.tenantDB.model('PayrollRun'),
        PayrollRunItem: req.tenantDB.model('PayrollRunItem'),
        Applicant: req.tenantDB.model('Applicant'),
        EmployeeCompensation: req.tenantDB.model('EmployeeCompensation', require('../models/EmployeeCompensation')),
        Payslip: req.tenantDB.model('Payslip'),
        DeductionMaster: req.tenantDB.model('DeductionMaster', require('../models/DeductionMaster'))
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
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

        const { Employee, Attendance, Applicant } = getModels(req);

        // 1. Fetch Active Employees
        const employees = await Employee.find({
            status: 'Active',
            $or: [
                { joiningDate: { $lte: endDate } },
                { joiningDate: null }
            ]
        }).select('firstName lastName employeeId department role email joiningDate');

        // 2. Fetch Applicants with Salary Assigned
        const applicants = await Applicant.find({
            tenant: req.user.tenantId,
            $or: [
                { salaryAssigned: true },
                { salaryHistory: { $exists: true, $not: { $size: 0 } } }
            ],
            status: { $ne: 'Rejected' }
        }).select('name email mobile department requirementId employeeId salaryAssigned salarySnapshotId joiningDate');

        // 3. Merge and Deduplicate by Email
        const employeeMap = new Map();

        // Add employees first (Master records)
        employees.forEach(emp => {
            const emailKey = emp.email?.toLowerCase();
            const key = emailKey || emp._id.toString();
            employeeMap.set(key, {
                _id: emp._id.toString(),
                name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unnamed Employee',
                employeeId: emp.employeeId,
                email: emp.email,
                department: emp.department,
                source: 'EMPLOYEE',
                joiningDate: emp.joiningDate
            });
        });

        // Add applicants if not already present as employees
        applicants.forEach(app => {
            const emailKey = app.email?.toLowerCase();
            const key = emailKey || app._id.toString();

            if (!employeeMap.has(key)) {
                employeeMap.set(key, {
                    _id: app._id.toString(),
                    name: app.name || 'Unnamed Applicant',
                    employeeId: app.employeeId ? 'LINKED' : 'UNASSIGNED',
                    email: app.email,
                    department: app.department,
                    source: 'APPLICANT',
                    joiningDate: app.joiningDate
                });
            }
        });

        const allPeople = Array.from(employeeMap.values());

        // 4. Calculate Attendance and Map to Final Format
        const employeeData = await Promise.all(allPeople.map(async (person) => {
            // Simple Attendance Count
            const attendanceCount = await Attendance.countDocuments({
                employee: person._id,
                date: { $gte: startDate, $lte: endDate },
                status: { $in: ['present', 'half_day', 'work_from_home', 'on_duty'] }
            });

            return {
                ...person,
                key: person._id,
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
 * Body: { month: "YYYY-MM", items: [{ employeeId }], useCompensation: boolean (ignored, always true) }
 */
exports.previewPreview = async (req, res) => {
    try {
        const { month, items } = req.body;
        const [year, monthNum] = month.split('-');
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

        const { Employee, Applicant } = getModels(req);
        const results = [];

        for (const item of items) {
            let emp = await Employee.findById(item.employeeId);
            if (!emp) {
                emp = await Applicant.findById(item.employeeId);
                if (emp) {
                    emp.firstName = emp.name?.split(' ')[0] || 'Applicant';
                    emp.lastName = emp.name?.split(' ').slice(1).join(' ') || '';
                }
            }

            if (!emp) continue;

            try {
                // Call Service with DRY RUN and NULL template ID
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
                    null, // NULL TEMPLATE ID -> Forces Service to use EmployeeCompensation
                    true // dryRun = true
                );

                results.push({
                    employeeId: emp._id,
                    gross: result.grossEarnings,
                    net: result.netPay,
                    breakdown: result
                });

            } catch (err) {
                console.error(`❌ [PREVIEW_FATAL] Error for employee ${emp._id}:`, err);
                results.push({
                    employeeId: emp._id,
                    error: err.message || 'Calculation failed'
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
 * Execute Payroll Run - STRICTLY EmployeeCompensation
 */
exports.runPayroll = async (req, res) => {
    try {
        const { month, items } = req.body;
        console.log(`🚀 [RUN_PAYROLL] Month: ${month}, Items: ${items?.length}, Source: COMPENSATION_ONLY`);
        const [year, monthNum] = month.split('-');

        const { PayrollRun, Employee, PayrollRunItem, Applicant } = getModels(req);

        // 1. Check duplicate run
        let payrollRun = await PayrollRun.findOne({ month: parseInt(monthNum), year: parseInt(year) });

        if (payrollRun) {
            if (['APPROVED', 'PAID'].includes(payrollRun.status)) {
                return res.status(400).json({ success: false, message: "Payroll for this month is already approved or paid" });
            }
            console.log(`♻️ [RUN_PAYROLL] Resetting existing run: ${payrollRun._id}`);
            payrollRun.status = 'INITIATED';
            payrollRun.initiatedBy = req.user.id || req.user._id;
            payrollRun.totalEmployees = items.length;
            payrollRun.processedEmployees = 0;
            payrollRun.failedEmployees = 0;
            payrollRun.totalGross = 0;
            payrollRun.totalNetPay = 0;
            payrollRun.executionErrors = [];
            await PayrollRunItem.deleteMany({ payrollRunId: payrollRun._id });
        } else {
            payrollRun = new PayrollRun({
                tenantId: req.user.tenantId,
                month: parseInt(monthNum),
                year: parseInt(year),
                status: 'INITIATED',
                initiatedBy: req.user.id || req.user._id,
                totalEmployees: items.length,
                processedEmployees: 0,
                source: 'COMPENSATION'
            });
        }
        await payrollRun.save();

        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

        let successCount = 0;
        let failCount = 0;
        let totalGross = 0;
        let totalNet = 0;
        const skippedList = [];
        const processedList = [];

        // 3. Process Items
        for (const item of items) {
            if (!item.employeeId) continue;

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

                console.log(`🔍 [RUN_PAYROLL] Processing person: ${emp._id}`);

                // Call Service with NULL template ID -> Forces EmployeeCompensation
                const payslip = await payrollService.calculateEmployeePayroll(
                    req.tenantDB,
                    req.user.tenantId,
                    emp,
                    parseInt(monthNum),
                    parseInt(year),
                    startDate,
                    endDate,
                    endDate.getDate(),
                    new Set(),
                    payrollRun._id,
                    null,
                    false
                );

                successCount++;
                totalGross += (payslip.grossEarnings || 0);
                totalNet += (payslip.netPay || 0);
                processedList.push(emp._id);

                await PayrollRunItem.create({
                    payrollRunId: payrollRun._id,
                    employeeId: item.employeeId,
                    payslipId: payslip._id,
                    status: 'GENERATED',
                    gross: payslip.grossEarnings,
                    net: payslip.netPay
                });

            } catch (err) {
                console.error(`❌ [RUN_PAYROLL_FAIL] Employee ${item.employeeId}:`, err.message);
                failCount++;
                payrollRun.executionErrors.push({
                    employeeId: item.employeeId,
                    message: err.message
                });
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

        res.json({
            success: true,
            data: {
                payrollRunId: payrollRun._id,
                month: payrollRun.month,
                year: payrollRun.year,
                status: payrollRun.status,
                source: 'COMPENSATION',
                totalEmployees: items.length,
                processedEmployees: successCount,
                failedEmployees: failCount,
                skippedEmployees: skippedList.length,
                totalGross: totalGross,
                totalNetPay: totalNet,
                errors: payrollRun.executionErrors
            },
            message: `Payroll processed: ${successCount} successful, ${failCount} failed`
        });

    } catch (error) {
        console.error("Run Payroll Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
