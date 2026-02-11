// backend/config/dbManager.js
const mongoose = require("mongoose");

/**
 * dbManager: provide per-tenant mongoose DB instance using mongoose.connection.useDb
 */

const tenantDbs = {};
const MAX_CACHED_CONNECTIONS = 50;
const connectionAccessTime = {};
const registeredModels = new Set();

/**
 * Registers all tenant-specific models on a given database connection.
 */
function registerModels(db, tenantId, forceRefresh = false) {
  // If models are registered and we don't need force refresh, skip.
  if (registeredModels.has(tenantId) && !forceRefresh) {
    return;
  }

  try {
    // FORCE FRESH SCHEMA LOAD (v7.2 HARD REFRESH)
    delete require.cache[require.resolve("../models/EmployeeSalarySnapshot")];
    delete require.cache[require.resolve("../models/SalaryComponent")];
    delete require.cache[require.resolve("../models/SalaryTemplate")];

    const EmployeeSchema = require("../models/Employee");
    const DepartmentSchema = require("../models/Department");
    const LeaveRequestSchema = require("../models/LeaveRequest");
    const AttendanceSchema = require("../models/Attendance");
    const ActivitySchema = require("../models/Activity");
    const UserSchema = require("../models/User");
    const RequirementSchema = require("../models/Requirement");
    const ApplicantSchema = require("../models/Applicant");
    const OfferLetterTemplateSchema = require("../models/OfferLetterTemplate");
    const LetterTemplateSchema = require("../models/LetterTemplate");
    const GeneratedLetterSchema = require("../models/GeneratedLetter");
    const LeavePolicySchema = require("../models/LeavePolicy");
    const LeaveBalanceSchema = require("../models/LeaveBalance");
    const NotificationSchema = require("../models/Notification");
    const RegularizationSchema = require("../models/Regularization");
    const AuditLogSchema = require("../models/AuditLog");
    const CommentSchema = require("../models/Comment");
    const AccessControlSchema = require("../models/AccessControl");
    const RoleSchema = require("../models/Role");
    const HolidaySchema = require("../models/Holiday");
    const AttendanceSettingsSchema = require("../models/AttendanceSettings");
    const SalaryComponentSchema = require("../models/SalaryComponent");
    const SalaryTemplateSchema = require("../models/SalaryTemplate");
    const BenefitComponentSchema = require("../models/BenefitComponent");
    const BenefitSchema = require("../models/Benefit.model.js");
    const CompanyProfileSchema = require("../models/CompanyProfile");
    const DeductionMasterSchema = require("../models/DeductionMaster");
    const EmployeeDeductionSchema = require("../models/EmployeeDeduction");
    const PayrollRunSchema = require("../models/PayrollRun");
    const PayslipSchema = require("../models/Payslip");
    const CompanyPayrollRuleSchema = require("../models/CompanyPayrollRule");
    const CandidateSchema = require("../models/Candidate");
    const TrackerCandidateSchema = require("../models/TrackerCandidate");
    const CandidateStatusLogSchema = require("../models/CandidateStatusLog");
    const SalaryAssignmentSchema = require("../models/SalaryAssignment");
    const PayrollRunItemSchema = require("../models/PayrollRunItem");
    const EmployeeSalarySnapshotSchema = require("../models/EmployeeSalarySnapshot");
    const AttendanceSnapshotSchema = require("../models/AttendanceSnapshot");
    const PayrollRunSnapshotSchema = require("../models/PayrollRunSnapshot");
    const SalaryRevisionSchema = require("../models/SalaryRevision");
    const RequirementTemplateSchema = require("../models/RequirementTemplate");
    const CounterSchema = require("../models/Counter");
    const EmployeeCompensationSchema = require("../models/EmployeeCompensation");
    const EmployeeCtcVersionSchema = require("../models/EmployeeCtcVersion"); // Start (Active v7.2 - Refresh Timestamp: 2026-01-19T18:55:00)
    const PayslipTemplateSchema = require("../models/PayslipTemplate");
    const PositionSchema = require("../models/Position");
    const CompanyIdConfigSchema = require("../models/CompanyIdConfig");
    const BGVCaseSchema = require("../models/BGVCase");
    const BGVCheckSchema = require("../models/BGVCheck");
    const BGVEmailLogSchema = require("../models/BGVEmailLog");
    const BGVEmailTemplateSchema = require("../models/BGVEmailTemplate");
    const BGVReportSchema = require("../models/BGVReport");
    const BGVTimelineSchema = require("../models/BGVTimeline");


    // Helper to register or FORCE refresh
    const register = (name, schema, isCritical = false) => {
      if (!schema) {
        console.error(`❌ [DB_MANAGER] FATAL: Schema for model '${name}' is ${schema} (Undefined/Null). Check the model file exports.`);
        return;
      }
      if (db.models[name] && (forceRefresh || isCritical)) {
        delete db.models[name];
      }
      if (!db.models[name]) {
        // Handle if schema is actually a Model (extract schema)
        const schemaToUse = schema.schema || schema;
        db.model(name, schemaToUse);
      }
    };

    // ALWAYS REFRESH CRITICAL SALARY MODELS (Prevents stale model schema issues)
    register("EmployeeSalarySnapshot", EmployeeSalarySnapshotSchema, true);
    register("SalaryComponent", SalaryComponentSchema, true);
    register("SalaryTemplate", SalaryTemplateSchema, true);

    // Core models
    register("Employee", EmployeeSchema);
    register("Department", DepartmentSchema);
    register("LeaveRequest", LeaveRequestSchema);
    register("Attendance", AttendanceSchema);
    register("Activity", ActivitySchema);
    register("User", UserSchema);
    register("Requirement", RequirementSchema);
    register("Applicant", ApplicantSchema);
    register("OfferLetterTemplate", OfferLetterTemplateSchema);
    register("LetterTemplate", LetterTemplateSchema);
    register("GeneratedLetter", GeneratedLetterSchema);
    register("LeavePolicy", LeavePolicySchema);
    register("LeaveBalance", LeaveBalanceSchema);
    register("Notification", NotificationSchema);
    register("Regularization", RegularizationSchema);
    register("AuditLog", AuditLogSchema);
    register("Comment", CommentSchema);
    register("AccessControl", AccessControlSchema);
    register("Role", RoleSchema);
    register("Holiday", HolidaySchema);
    register("AttendanceSettings", AttendanceSettingsSchema);
    register("BenefitComponent", BenefitComponentSchema);
    register("Benefit", BenefitSchema);
    register("CompanyProfile", CompanyProfileSchema);
    register("DeductionMaster", DeductionMasterSchema);
    register("EmployeeDeduction", EmployeeDeductionSchema);
    register("PayrollRun", PayrollRunSchema);
    register("Payslip", PayslipSchema);
    register("CompanyPayrollRule", CompanyPayrollRuleSchema);
    register("Candidate", CandidateSchema);
    register("TrackerCandidate", TrackerCandidateSchema);
    register("CandidateStatusLog", CandidateStatusLogSchema);
    register("SalaryAssignment", SalaryAssignmentSchema);
    register("PayrollRunItem", PayrollRunItemSchema);
    register("AttendanceSnapshot", AttendanceSnapshotSchema);
    register("PayrollRunSnapshot", PayrollRunSnapshotSchema);
    register("SalaryRevision", SalaryRevisionSchema);
    register("RequirementTemplate", RequirementTemplateSchema);
    register("Counter", CounterSchema);
    register("PayslipTemplate", PayslipTemplateSchema);
    register("Position", PositionSchema);
    register("CompanyIdConfig", CompanyIdConfigSchema);

    // BGV Models
    register("BGVCase", BGVCaseSchema);
    register("BGVCheck", BGVCheckSchema);
    register("BGVEmailLog", BGVEmailLogSchema);
    register("BGVEmailTemplate", BGVEmailTemplateSchema);
    register("BGVReport", BGVReportSchema);
    register("BGVTimeline", BGVTimelineSchema);

    // NEW: Payroll Adjustment
    if (!db.models.PayrollAdjustment) {
      try {
        const PayrollAdjustmentSchema = require("../models/PayrollAdjustment");
        db.model("PayrollAdjustment", PayrollAdjustmentSchema);
      } catch (e) { console.warn("Failed to load PayrollAdjustment", e.message); }
    }

    // Offer model is now GLOBAL (Shared Collection), no longer per-tenant

    // CRITICAL: Register EmployeeCompensation for payroll
    if (!db.models.EmployeeCompensation) {
      db.model("EmployeeCompensation", EmployeeCompensationSchema);
    }

    // Register EmployeeCtcVersion
    register("EmployeeCtcVersion", EmployeeCtcVersionSchema);

    registeredModels.add(tenantId);
    console.log(`✅ [DB_MANAGER] Models registered/refreshed for tenant: ${tenantId}`);
  } catch (err) {
    console.error(`❌ [DB_MANAGER] registration failed for tenant ${tenantId}:`, err.message);
  }
}

function getTenantDB(tenantId) {
  if (!tenantId) throw new Error("tenantId required for getTenantDB");
  connectionAccessTime[tenantId] = Date.now();

  // If already in cache, return immediately
  if (tenantDbs[tenantId]) {
    return tenantDbs[tenantId];
  }

  const cachedCount = Object.keys(tenantDbs).length;
  if (cachedCount >= MAX_CACHED_CONNECTIONS) {
    let lruTenantId = null;
    let oldestTime = Date.now();
    for (const tid in connectionAccessTime) {
      if (connectionAccessTime[tid] < oldestTime && tid !== tenantId) {
        oldestTime = connectionAccessTime[tid];
        lruTenantId = tid;
      }
    }
    if (lruTenantId) {
      delete tenantDbs[lruTenantId];
      delete connectionAccessTime[lruTenantId];
      registeredModels.delete(lruTenantId);
    }
  }

  const dbName = `company_${tenantId}`;
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  registerModels(tenantDb, tenantId, false); // Optimized: Only register if not already done
  tenantDbs[tenantId] = tenantDb;
  return tenantDb;
}

function clearCache() {
  Object.keys(tenantDbs).forEach(tenantId => {
    delete tenantDbs[tenantId];
    delete connectionAccessTime[tenantId];
    registeredModels.delete(tenantId);
  });
}

/**
 * Enforces mandatory leave policy for an employee.
 * If employee.leavePolicy is null, finds the latest 'applicableTo: All' policy for that tenant
 * and assigns it permanently in the database.
 * @param {Object} employee The employee document
 * @param {mongoose.Connection} db The tenant database connection
 * @returns {Promise<Object>} The updated (or original) employee document
 */
async function ensureLeavePolicy(employee, db, tenantIdOverride = null) {
  if (!employee) return null;

  const LeavePolicy = db.model("LeavePolicy");
  const Employee = db.model("Employee");

  // Even if policy is set, verify its existence and fetch details
  if (employee.leavePolicy) {
    try {
      const existingPolicy = await LeavePolicy.findOne({
        _id: employee.leavePolicy._id || employee.leavePolicy,
        tenant: new mongoose.Types.ObjectId(tenantIdOverride || employee.tenant)
      });

      // A policy is only "valid" if it exists AND has at least one rule
      if (existingPolicy && existingPolicy.rules && existingPolicy.rules.length > 0) {
        // If not populated details we need (like rules), re-fetch populated
        if (!employee.leavePolicy.rules) {
          return await Employee.findById(employee._id)
            .populate('leavePolicy', 'name rules description status')
            .populate('departmentId', 'name')
            .populate('manager', 'firstName lastName email profilePic employeeId');
        }
        return employee;
      }
      console.warn(`[POLICY_ENFORCEMENT] Policy ${employee.leavePolicy} is invalid (no rules or missing). Re-assigning...`);
    } catch (e) {
      console.error(`[POLICY_ENFORCEMENT] Verification error:`, e.message);
    }
  }

  try {
    // Determine tenant id: prefer override, else employee.tenant, else infer from db name
    let tenantStr = tenantIdOverride || employee.tenant;
    if (!tenantStr && db && db.name) {
      // db.name is like 'company_<tenantId>' for our multi-tenant pattern
      tenantStr = db.name.replace(/^company_/, '');
      console.log(`[POLICY_ENFORCEMENT] Inferred tenant from DB name: ${tenantStr}`);
    }

    if (!tenantStr) throw new Error('Tenant id not available to enforce policy');
    const tenantId = new mongoose.Types.ObjectId(tenantStr);

    // Find latest active 'All' policy for this tenant that HAS rules
    let globalPolicy = await LeavePolicy.findOne({
      tenant: tenantId,
      applicableTo: 'All',
      isActive: true,
      'rules.0': { $exists: true } // Ensure it has at least one rule
    }).sort({ createdAt: -1 });

    // Fallback: if no 'All' policy with rules found, pick any active policy that has rules
    if (!globalPolicy) {
      const fallbackPolicy = await LeavePolicy.findOne({
        tenant: tenantId,
        isActive: true,
        'rules.0': { $exists: true }
      }).sort({ createdAt: -1 });

      if (fallbackPolicy) {
        console.log(`[POLICY_ENFORCEMENT] No global 'All' policy with rules found. Using fallback policy '${fallbackPolicy.name}'`);
        globalPolicy = fallbackPolicy;
      }
    }

    // STILL no policy? Create a default 'Standard Leave Policy' for this tenant
    if (!globalPolicy) {
      try {
        console.log('[POLICY_ENFORCEMENT] No active policy found. Creating default Standard Leave Policy...');
        const defaultPolicy = new LeavePolicy({
          tenant: tenantId,
          name: 'Standard Leave Policy',
          applicableTo: 'All',
          isActive: true,
          rules: [
            { leaveType: 'Casual Leave', totalPerYear: 12, color: '#f59e0b' },
            { leaveType: 'Sick Leave', totalPerYear: 7, color: '#ef4444' },
            { leaveType: 'Privilege Leave', totalPerYear: 15, color: '#10b981' }
          ]
        });
        await defaultPolicy.save();
        globalPolicy = defaultPolicy;
        console.log('[POLICY_ENFORCEMENT] Default policy created:', defaultPolicy._id);

        // Initialize balances for the employee for current year
        const LeaveBalance = db.model('LeaveBalance');
        const year = new Date().getFullYear();
        for (const rule of globalPolicy.rules) {
          const exists = await LeaveBalance.findOne({ tenant: tenantId, employee: employee._id, leaveType: rule.leaveType, year });
          if (!exists) {
            await new LeaveBalance({
              tenant: tenantId,
              employee: employee._id,
              policy: globalPolicy._id,
              leaveType: rule.leaveType,
              year,
              total: rule.totalPerYear,
              used: 0,
              pending: 0,
              available: rule.totalPerYear
            }).save();
            console.log(`[POLICY_ENFORCEMENT] Created balance ${rule.leaveType} (${rule.totalPerYear}) for employee ${employee.employeeId}`);
          }
        }
      } catch (createErr) {
        console.error('[POLICY_ENFORCEMENT] Error creating default policy:', createErr);
      }
    }

    if (globalPolicy) {
      console.log(`[POLICY_ENFORCEMENT] Auto-assigning policy '${globalPolicy.name}' to employee ${employee.employeeId}`);
      employee.leavePolicy = globalPolicy._id;
      await employee.save();

      // Re-fetch with population to ensure the returned object is fully complete
      return await Employee.findById(employee._id)
        .populate('leavePolicy', 'name rules description status')
        .populate('departmentId', 'name')
        .populate('manager', 'firstName lastName email profilePic employeeId');
    }

    return employee;
  } catch (err) {
    console.error(`[POLICY_ENFORCEMENT] Error during auto-assignment:`, err.message);
    return employee;
  }
}

module.exports = { getTenantDB, clearCache, ensureLeavePolicy };
