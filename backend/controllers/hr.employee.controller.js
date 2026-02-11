const Tenant = require("../models/Tenant");
const CounterSchema = require("../models/Counter");
const mongoose = require("mongoose");
const CompanyIdConfig = require('../models/CompanyIdConfig');
const DocumentCounter = require('../models/DocumentCounter');

// Global counter model (stored in main connection, not tenant databases)
let GlobalCounter;
function getGlobalCounter() {
  if (!GlobalCounter) {
    try {
      GlobalCounter = mongoose.model("GlobalCounter");
    } catch (e) {
      GlobalCounter = mongoose.model("GlobalCounter", CounterSchema);
    }
  }
  return GlobalCounter;
}

/* ---------------------------------------------
   HELPER → Get models from tenantDB
   Models are already registered by dbManager, just retrieve them
--------------------------------------------- */
function getModels(req) {
  if (!req.tenantDB) {
    throw new Error("Tenant database connection not available");
  }
  const db = req.tenantDB;
  try {
    // Models are already registered by dbManager, just retrieve them
    if (!db.models.BGVCase) {
      try { db.model('BGVCase', require('../models/BGVCase')); } catch (e) { }
    }

    return {
      Employee: db.model("Employee"),
      LeavePolicy: db.model("LeavePolicy"),
      LeaveBalance: db.model("LeaveBalance"),
      Department: db.model("Department"),
      BGVCase: db.model("BGVCase")
    };
  } catch (err) {
    console.error("[getModels] Error retrieving models:", err.message);
    console.error("[getModels] Error stack:", err.stack);
    throw new Error(`Failed to retrieve models from tenant database: ${err.message}`);
  }
}

/* ---------------------------------------------
   HELPER: Get next sequence per-tenant (using global counter)
--------------------------------------------- */
async function getNextSeq(key) {
  const Counter = getGlobalCounter();
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

/* ---------------------------------------------
   EMPLOYEE ID FORMATTER
--------------------------------------------- */
/* ---------------------------------------------
   EMPLOYEE ID FORMATTER (Using CompanyIdConfig)
--------------------------------------------- */
async function generateEmployeeId({ req, tenantId, department, firstName, lastName }) {
  try {
    const companyIdConfig = require('./companyIdConfig.controller');

    // 1. Get next ID via centralized utility
    const result = await companyIdConfig.generateIdInternal({
      tenantId: tenantId,
      entityType: 'EMPLOYEE',
      increment: true,
      extraReplacements: {
        '{{DEPT}}': (department || 'GEN').substring(0, 3).toUpperCase(),
        '{{FIRSTNAME}}': (firstName || '').toUpperCase(),
        '{{LASTNAME}}': (lastName || '').toUpperCase()
      }
    });

    return result.id;

  } catch (error) {
    console.error("Error generating employee ID:", error);
    // Emergency Fallback
    return `EMP-${Date.now()}`;
  }
}

async function initializeBalances(req, employeeId, policyId) {
  if (!policyId) return;
  const { LeavePolicy, LeaveBalance } = getModels(req);
  const policy = await LeavePolicy.findOne({ _id: policyId, tenant: req.tenantId });
  if (!policy) return;

  const year = new Date().getFullYear();
  await LeaveBalance.deleteMany({ employee: employeeId, year });

  const balancePromises = policy.rules.map(rule => {
    return new LeaveBalance({
      tenant: req.tenantId,
      employee: employeeId,
      policy: policyId,
      leaveType: rule.leaveType,
      year,
      total: rule.totalPerYear
    }).save();
  });
  await Promise.all(balancePromises);
}

/* ---------------------------------------------
   PREVIEW ID (Does NOT increase counter)
--------------------------------------------- */
exports.preview = async (req, res) => {
  try {
    console.log("!!! PREVIEW ENDPOINT CALLED - NEW LOGIC !!!");
    const tenantId = req.tenantId;
    const { department } = req.body;

    // 1. Get Configuration
    let config = await CompanyIdConfig.findOne({ companyId: tenantId, entityType: 'EMPLOYEE' });

    // Mock default if missing
    if (!config) {
      config = {
        prefix: 'EMP',
        separator: '', // Default from schema is usually empty or dash, aligning with defaults
        includeYear: false,
        includeMonth: false,
        includeDepartment: false,
        padding: 4,
        startFrom: 1000,
        currentSeq: 1000
      };
    }

    // 2. Determine Parts
    const now = new Date();
    const parts = [];

    if (config.prefix) parts.push(config.prefix);
    if (config.includeYear) parts.push(now.getFullYear());
    if (config.includeMonth) parts.push(String(now.getMonth() + 1).padStart(2, '0'));
    if (config.includeDepartment) {
      const depCode = (department || "GEN").substring(0, 3).toUpperCase();
      parts.push(depCode);
    }

    // 3. Get Next Sequence (Preview only, do not increment)
    const seq = config.currentSeq !== undefined ? config.currentSeq : (config.startFrom || 1);
    const seqStr = String(seq).padStart(config.padding || 4, '0');

    // 4. Join
    const separator = config.separator === undefined ? '-' : config.separator;
    let preview = parts.join(separator);

    if (preview) {
      preview = `${preview}${separator}${seqStr}`;
    } else {
      preview = seqStr;
    }

    res.json({ preview });

  } catch (err) {
    console.error("Preview error:", err);
    res.status(500).json({ error: "preview_failed" });
  }
};

/* ---------------------------------------------
   LIST EMPLOYEES (tenant-wise)
--------------------------------------------- */
exports.list = async (req, res) => {
  try {
    console.log(`[EMPLOYEE_LIST] ${req.method} ${req.path} - Starting employee list request`);

    // Step 1: Validate user authentication
    if (!req.user) {
      console.error("[EMPLOYEE_LIST] ERROR: req.user is missing. Auth middleware may not be applied correctly.");
      return res.status(401).json({
        success: false,
        error: "unauthorized",
        message: "User authentication required"
      });
    }

    console.log(`[EMPLOYEE_LIST] User authenticated: ${req.user.id}, role: ${req.user.role}`);

    // Step 2: Validate tenant context
    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
      console.error("[EMPLOYEE_LIST] ERROR: tenantId not found in req.user.tenantId or req.tenantId");
      console.error("[EMPLOYEE_LIST] req.user:", JSON.stringify(req.user, null, 2));
      return res.status(400).json({
        success: false,
        error: "tenant_missing",
        message: "Tenant ID is required. Please ensure user is associated with a tenant."
      });
    }

    console.log(`[EMPLOYEE_LIST] Tenant ID: ${tenantId}`);

    // Step 3: Ensure tenantDB is available
    if (!req.tenantDB) {
      console.warn("[EMPLOYEE_LIST] WARNING: req.tenantDB missing. Attempting lazy load...");
      if (req.user && (req.user.tenantId || req.user.tenant)) {
        try {
          const tid = req.user.tenantId || req.user.tenant;
          const getTenantDB = require('../utils/tenantDB');
          req.tenantDB = await getTenantDB(tid);
          req.tenantId = tid; // Sync
          console.log(`[EMPLOYEE_LIST] Lazy loaded tenantDB for ${tid}`);
        } catch (e) {
          console.error("[EMPLOYEE_LIST] Lazy load failed:", e);
          return res.status(500).json({
            success: false,
            error: "lazy_load_failed",
            message: `Lazy load of tenant DB failed: ${e.message}`,
            stack: e.stack
          });
        }
      }

      if (!req.tenantDB) {
        console.error("[EMPLOYEE_LIST] ERROR: req.tenantDB is not available.");
        return res.status(500).json({
          success: false,
          error: "tenant_db_unavailable",
          message: "Tenant database connection not available despite lazy load attempt.",
          details: {
            userTenant: req.user?.tenantId,
            reqTenant: req.tenantId
          }
        });
      }
    }

    console.log(`[EMPLOYEE_LIST] Tenant DB connection available`);

    // Step 4: Get models with error handling
    let Employee;
    try {
      const models = getModels(req);
      Employee = models.Employee;
      if (!Employee) {
        throw new Error("Employee model is not available");
      }
      console.log(`[EMPLOYEE_LIST] Employee model loaded successfully`);
    } catch (modelError) {
      console.error("[EMPLOYEE_LIST] ERROR: Failed to get Employee model:", modelError.message);
      console.error("[EMPLOYEE_LIST] Model error stack:", modelError.stack);
      return res.status(500).json({
        success: false,
        error: "model_error",
        message: `Failed to load Employee model: ${modelError.message}`,
        stack: modelError.stack
      });
    }

    // Step 5: Build query filter with tenant isolation
    const { department, designation, type, workMode, search, status } = req.query || {};
    const filter = { tenant: tenantId };

    // Department Filter (Dynamic)
    if (department && department !== 'All Departments') {
      // Check if it's an ObjectId or a string
      if (mongoose.Types.ObjectId.isValid(department)) {
        filter.departmentId = department;
      } else {
        filter.department = department;
      }
    }

    // Designation Filter (Multi-select)
    if (designation && designation !== 'All Roles') {
      const designations = Array.isArray(designation) ? designation : designation.split(',').filter(Boolean);
      if (designations.length > 0) {
        filter.designation = { $in: designations };
      }
    }

    // Employee Type Filter (Multi-select)
    if (type) {
      const types = Array.isArray(type) ? type : type.split(',').filter(Boolean);
      if (types.length > 0) {
        filter.employeeType = { $in: types };
      }
    }

    // Work Mode Filter (Multi-select)
    if (workMode) {
      const modes = Array.isArray(workMode) ? workMode : workMode.split(',').filter(Boolean);
      if (modes.length > 0) {
        filter.workMode = { $in: modes };
      }
    }

    // Search Support (Combines with filters)
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Default to hiding drafts unless specifically asked for
    if (!status) {
      filter.status = { $ne: 'Draft' };
    } else if (status !== 'All') {
      filter.status = status;
    }

    console.log(`[EMPLOYEE_LIST] Query filter:`, JSON.stringify(filter, null, 2));

    // Step 6: Execute query with safe populate
    let items;
    try {
      const query = Employee.find(filter)
        .select("_id firstName lastName middleName email department departmentId role manager employeeId contactNo joiningDate profilePic status lastStep gender dob maritalStatus bloodGroup nationality fatherName motherName emergencyContactName emergencyContactNumber tempAddress permAddress experience employeeType workMode designation bankDetails education documents salaryAssigned salaryLocked currentSnapshotId")
        .sort({ createdAt: -1 });

      // Safe populate - will not crash if references are missing
      query.populate('departmentId', 'name');
      query.populate('manager', 'firstName lastName employeeId');

      items = await query.lean();

      console.log(`[EMPLOYEE_LIST] Query successful. Found ${items.length} employees`);
    } catch (queryError) {
      console.error("[EMPLOYEE_LIST] ERROR: Database query failed:", queryError.message);
      console.error("[EMPLOYEE_LIST] Query error stack:", queryError.stack);
      console.error("[EMPLOYEE_LIST] Query error name:", queryError.name);
      return res.status(500).json({
        success: false,
        error: "query_failed",
        message: "Failed to fetch employees from database. Please check database connection and schema."
      });
    }

    // Step 7: Return success response
    console.log(`[EMPLOYEE_LIST] Returning ${items.length} employees to client`);
    return res.json({ success: true, data: items });

  } catch (err) {
    // Catch-all for any unexpected errors
    console.error("[EMPLOYEE_LIST] UNEXPECTED ERROR:", err);
    console.error("[EMPLOYEE_LIST] Error name:", err.name);
    console.error("[EMPLOYEE_LIST] Error message:", err.message);
    console.error("[EMPLOYEE_LIST] Error stack:", err.stack);

    // Ensure we always return a response
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: "internal_server_error",
        message: err.message || "An unexpected error occurred while fetching employees"
      });
    }
  }
};

/* ---------------------------------------------
   CREATE EMPLOYEE
--------------------------------------------- */
exports.create = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { Employee } = getModels(req);
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      return res.status(400).json({
        success: false,
        error: "tenant_not_found",
        message: "Tenant not found"
      });
    }

    const digits = tenant?.meta?.empCodeDigits || 3;
    const format = tenant?.meta?.empCodeFormat || "COMP_DEPT_NUM";
    const allowOverride = tenant?.meta?.empCodeAllowOverride || false;

    const { firstName, lastName, department, customEmployeeId, departmentId, joiningDate, status, lastStep, applicantId, overrideVacancy, ...restBody } = req.body;

    // --- LIFECYCLE RULE 8 VALIDATION ---
    if (applicantId) {
      try {
        // Lazy load models just to be safe they exist in this context
        const Applicant = req.tenantDB.model('Applicant');

        // Check Offer Status (Using Global Model for Shared Collection)
        const activeOffer = await GlobalOfferModel.findOne({
          applicantId: applicantId,
          tenantId: tenantId,
          isLatest: true
        });

        if (activeOffer && activeOffer.status !== 'Accepted') {
          return res.status(400).json({
            success: false,
            error: 'lifecycle_violation',
            message: `Cannot convert to employee. Offer status is '${activeOffer.status}', but must be 'Accepted'.`
          });
        }

        // Check Joining Letter
        const applicantRec = await Applicant.findById(applicantId);
        if (applicantRec && !applicantRec.joiningLetterPath) {
          return res.status(400).json({
            success: false,
            error: 'lifecycle_violation',
            message: `Cannot convert to employee. Joining Letter has not been generated yet.`
          });
        }
      } catch (lifecycleErr) {
        console.warn("⚠️ [EMPLOYEE CREATE] Lifecycle validation warning:", lifecycleErr.message);
        // We don't block if models missing, but ideally we should.
      }
    }

    let finalEmployeeId;

    if (customEmployeeId && allowOverride) {
      const exists = await Employee.findOne({ employeeId: customEmployeeId });
      if (exists)
        return res.status(400).json({
          success: false,
          error: "employeeId_exists",
          message: "Employee ID already in use"
        });

      finalEmployeeId = customEmployeeId;

    } else {
      finalEmployeeId = await generateEmployeeId({
        req,
        tenantId,
        format,
        digits,
        department,
        firstName,
        lastName
      });
    }

    // Build create data with proper departmentId and joiningDate handling
    const createData = {
      ...restBody,
      firstName,
      lastName,
      employeeId: finalEmployeeId,
      tenant: tenantId,
      status: status || 'Active',
      lastStep: lastStep || 6
    };

    if (departmentId) {
      createData.departmentId = departmentId;
    }
    if (department) {
      createData.department = department;
    }
    if (joiningDate) {
      createData.joiningDate = new Date(joiningDate);
    } else {
      createData.joiningDate = new Date(); // Default to now
    }

    // --- NEW: Copy Salary & BGV Info from Applicant (Onboarding) ---
    let applicantSnapshotId = null;
    let bgvCaseId = null;
    if (applicantId) {
      try {
        const { Employee, BGVCase } = getModels(req);
        const Applicant = req.tenantDB.model('Applicant'); // Applicant is usually registered
        const applicant = await Applicant.findById(applicantId);

        if (applicant) {
          // 0. BGV ENFORCEMENT
          const bgv = await BGVCase.findOne({ applicationId: applicant._id });
          if (bgv) {
            if (bgv.overallStatus === 'FAILED') {
              return res.status(403).json({ success: false, error: "bgv_failed", message: "Cannot onboard candidate: Background Verification (BGV) FAILED." });
            }
            if (bgv.overallStatus === 'IN_PROGRESS') {
              return res.status(403).json({ success: false, error: "bgv_pending", message: "Cannot onboard candidate: Background Verification (BGV) is still IN_PROGRESS." });
            }
            bgvCaseId = bgv._id;
          }

          // 1. Copy Template ID
          if (applicant.salaryTemplateId) {
            createData.salaryTemplateId = applicant.salaryTemplateId;
          }
          // 2. Copy Snapshot Link
          if (applicant.salarySnapshot && applicant.salarySnapshot._id) {
            applicantSnapshotId = applicant.salarySnapshot._id;
            createData.currentSalarySnapshotId = applicantSnapshotId;
            createData.currentSnapshotId = applicantSnapshotId;
            createData.salarySnapshots = [applicantSnapshotId];
            createData.salaryAssigned = true;
            createData.salaryLocked = true;
          }
        }
      } catch (appErr) {
        console.error("Error fetching applicant for onboarding:", appErr);
      }
    }

    // CREATE EMPLOYEE
    let emp = await Employee.create(createData);

    // --- NEW: Update Snapshot & BGV Ownership ---
    if (emp) {
      const db = req.tenantDB;

      // Update Salary Snapshot
      if (applicantSnapshotId) {
        try {
          const EmployeeSalarySnapshot = db.model('EmployeeSalarySnapshot');
          await EmployeeSalarySnapshot.findByIdAndUpdate(applicantSnapshotId, { employee: emp._id });
        } catch (snapErr) { console.error("Snapshot link fail:", snapErr); }
      }

      // Update BGV Case: Link Employee & Mark Immutable
      if (bgvCaseId) {
        try {
          const BGVCase = db.model('BGVCase');
          await BGVCase.findByIdAndUpdate(bgvCaseId, {
            employeeId: emp._id,
            isImmutable: true,
            $push: { logs: { action: 'LOCKED_ON_HIRE', performedBy: 'System', remarks: `BGV Locked upon employee creation (${emp.employeeId})` } }
          });
          console.log(`[ONBOARDING] BGV Case ${bgvCaseId} linked to Employee ${emp._id} and LOCKED.`);
        } catch (bgvErr) { console.error("BGV link fail:", bgvErr); }
      }
    }

    // --- NEW: Auto-assign default leave policy if none assigned ---
    try {
      const { ensureLeavePolicy } = require('../config/dbManager');
      emp = await ensureLeavePolicy(emp, req.tenantDB, req.tenantId);

      if (emp && emp.leavePolicy && !restBody.leavePolicy) {
        const LeaveBalance = req.tenantDB.model('LeaveBalance');
        const existing = await LeaveBalance.findOne({ employee: emp._id });
        if (!existing) {
          await initializeBalances(req, emp._id, emp.leavePolicy._id || emp.leavePolicy);
        }
      }
    } catch (autoErr) {
      console.error('[AUTO_POLICY_ASSIGN] Error while auto-assigning policy:', autoErr);
    }

    // --- NEW: Link Applicant if exists (Mark Onboarded) ---
    if (applicantId && emp) {
      try {
        const Applicant = req.tenantDB.model('Applicant');
        const Requirement = req.tenantDB.model('Requirement');

        const updatedApplicant = await Applicant.findByIdAndUpdate(applicantId, {
          isOnboarded: true,
          employeeId: emp._id
        }, { new: true });

        console.log(`[ONBOARDING] Linked Applicant ${applicantId} to Employee ${emp._id} (Marked Onboarded)`);

        // Check if all vacancies filled - Auto Close Job
        if (updatedApplicant && updatedApplicant.requirementId) {
          const requirement = await Requirement.findById(updatedApplicant.requirementId);
          if (requirement) {
            const totalOnboarded = await Applicant.countDocuments({
              requirementId: updatedApplicant.requirementId,
              isOnboarded: true
            });

            const totalLimit = requirement.vacancy || 1;
            if (totalOnboarded >= totalLimit) {
              await Requirement.findByIdAndUpdate(updatedApplicant.requirementId, { status: 'Closed' });
              console.log(`[ONBOARDING] Job '${requirement.jobTitle}' CLOSED automatically (Vacancies filled).`);
            }
          }
        }
      } catch (linkErr) {
        console.error("Failed to link applicant or auto-close job:", linkErr);
      }
    }

    // Initialize Leave Balances if policy provided
    if (restBody.leavePolicy) {
      try {
        await initializeBalances(req, emp._id, restBody.leavePolicy);
      } catch (balErr) {
        console.error("Failed to initialize balances:", balErr);
      }
    }

    res.json({ success: true, data: emp });

  } catch (err) {
    console.error('Employee create error:', err);

    // Duplicate employeeId or other unique index issues
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        error: "employee_duplicate",
        message: `Employee with this ${field} already exists.`
      });
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
      const details = Object.values(err.errors || {}).map(e => e.message).join(', ');
      return res.status(400).json({
        success: false,
        error: "validation_failed",
        message: details || "Employee validation failed."
      });
    }

    res.status(500).json({
      success: false,
      error: "create_failed",
      message: err.message || "Failed to create employee",
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/* ---------------------------------------------
   GET EMPLOYEE
--------------------------------------------- */
exports.get = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;

    const emp = await Employee.findOne({ _id: req.params.id, tenant: tenantId });
    if (!emp) return res.status(404).json({ error: "not_found" });

    res.json(emp);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "get_failed" });
  }
};

/* ---------------------------------------------
   CURRENT LOGGED-IN EMPLOYEE
--------------------------------------------- */
exports.me = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const userId = req.user?.id;

    const emp = await Employee.findOne({ _id: userId, tenant: tenantId });

    if (!emp) return res.status(404).json({ error: "not_found" });

    res.json(emp);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "me_failed" });
  }
};

/* ---------------------------------------------
   UPDATE EMPLOYEE
--------------------------------------------- */
exports.update = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;

    const updatePayload = { ...req.body };
    // delete updatePayload.employeeId; <= MODIFIED: Allow update if Draft
    delete updatePayload.tenant;

    // Handle joiningDate conversion if provided
    if (updatePayload.joiningDate) {
      updatePayload.joiningDate = new Date(updatePayload.joiningDate);
    }

    // 1. Fetch Existing Employee to check Status
    const existing = await Employee.findOne({ _id: req.params.id, tenant: tenantId });
    if (!existing) return res.status(404).json({ error: "not_found", message: "Employee not found" });

    // 2. Safeguard: Only allow employeeId update if status is 'Draft'
    if (existing.status !== 'Draft') {
      delete updatePayload.employeeId;
    } else {
      // If it is Draft, allow employeeId update. 
      // If user didn't send employeeId, preserve existing one (handled by spread)
      // If user sent employeeId, it will update.
    }

    const emp = await Employee.findOneAndUpdate(
      { _id: req.params.id, tenant: tenantId },
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!emp) return res.status(404).json({ error: "not_found", message: "Employee not found" });

    res.json({ success: true, data: emp });

    // Re-initialize balances if policy changed
    if (req.body.leavePolicy) {
      try {
        await initializeBalances(req, emp._id, req.body.leavePolicy);
      } catch (balErr) {
        console.error("Failed to re-initialize balances:", balErr);
      }
    }

  } catch (err) {
    console.error('Employee update error:', err);

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
      const details = Object.values(err.errors || {}).map(e => e.message).join(', ');
      return res.status(400).json({
        success: false,
        error: "validation_failed",
        message: details || "Employee validation failed."
      });
    }

    // Duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "employee_duplicate",
        message: "Employee with this unique field already exists."
      });
    }

    res.status(500).json({
      success: false,
      error: "update_failed",
      message: err.message || "Failed to update employee"
    });
  }
};

/* ---------------------------------------------
   DELETE EMPLOYEE
--------------------------------------------- */
exports.remove = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;

    const emp = await Employee.findOneAndDelete({
      _id: req.params.id,
      tenant: tenantId
    });

    if (!emp)
      return res.status(404).json({ error: "not_found" });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "delete_failed" });
  }
};

/* ---------------------------------------------
   ORG / REPORTING: Set manager, list direct reports, reporting chain, org tree
   IMPROVED: Better validation, cycle prevention, tenant checks, optimized queries
--------------------------------------------- */

/**
 * SET MANAGER - Improved with comprehensive validation
 * - Prevents self-assignment
 * - Prevents circular chains
 * - Validates tenant match
 * - Optimized queries with lean() and projection
 */
exports.setManager = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;
    const { managerId } = req.body; // may be null to clear manager

    // Validate id formats early to avoid cast errors
    const ObjectId = mongoose.Types.ObjectId;
    if (!ObjectId.isValid(empId)) {
      console.warn(`setManager: invalid employee id received: ${empId}`);
      return res.status(400).json({ error: 'invalid_employee_id', message: 'Invalid employee id' });
    }
    if (managerId && managerId !== null && managerId !== '') {
      if (!ObjectId.isValid(managerId)) {
        console.warn(`setManager: invalid manager id received: ${managerId}`);
        return res.status(400).json({ error: 'invalid_manager_id', message: 'Invalid manager id' });
      }
    }

    // Validation 1: Prevent employee from becoming their own manager
    if (managerId && String(managerId) === String(empId)) {
      return res.status(400).json({ error: 'cannot_set_self_manager', message: 'Employee cannot be their own manager' });
    }

    // Get employee with minimal projection for performance
    const emp = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('_id manager tenant department role')
      .lean();

    if (!emp) {
      return res.status(404).json({ error: 'employee_not_found', message: 'Employee not found' });
    }

    // If clearing manager (setting to null)
    if (!managerId || managerId === null || managerId === '') {
      await Employee.updateOne(
        { _id: empId, tenant: tenantId },
        { $set: { manager: null } }
      );

      // Return updated employee with full details
      const updated = await Employee.findOne({ _id: empId, tenant: tenantId })
        .select('-password')
        .lean();

      return res.json({
        success: true,
        employee: updated,
        message: 'Manager removed successfully'
      });
    }

    // Validation 2: Manager must exist and be from same tenant
    const mgr = await Employee.findOne({ _id: managerId, tenant: tenantId })
      .select('_id manager tenant department role')
      .lean();

    if (!mgr) {
      return res.status(404).json({
        error: 'manager_not_found',
        message: 'Manager not found or belongs to different tenant'
      });
    }

    // Validation 3: Prevent circular management chain
    // Walk up the manager's chain to ensure we don't create a cycle
    const visited = new Set([String(empId)]); // Track visited nodes to prevent cycles
    let current = mgr;
    const MAX_DEPTH = 1000; // Safety limit for very deep hierarchies
    let depth = 0;

    while (current && current.manager) {
      const currentManagerId = String(current.manager);

      // If we encounter the employee in the manager's chain, it's a cycle
      if (visited.has(currentManagerId)) {
        return res.status(400).json({
          error: 'cycle_detected',
          message: 'This assignment would create a circular management chain'
        });
      }

      visited.add(currentManagerId);

      // If the manager's manager is the employee, it's a cycle
      if (currentManagerId === String(empId)) {
        return res.status(400).json({
          error: 'cycle_detected',
          message: 'This assignment would create a circular management chain'
        });
      }

      // Get next manager in chain
      current = await Employee.findOne({ _id: current.manager, tenant: tenantId })
        .select('_id manager')
        .lean();

      depth++;
      if (depth > MAX_DEPTH) {
        console.warn('Max depth reached while checking for cycles');
        break;
      }
    }

    // Validation 4: Manager/Department check
    // NOTE: previously we rejected assignments where employee and manager had different department values.
    // That constraint caused many valid assignments to fail when departments are stored as names/codes or when
    // managers span departments. Relaxing to WARN only — we keep the check logged for diagnostics.
    try {
      if (emp.department && mgr.department && String(emp.department) !== String(mgr.department)) {
        console.warn(`setManager: department mismatch for emp=${empId} (empDept=${emp.department}) vs mgr=${managerId} (mgrDept=${mgr.department}). Allowing assignment.`);
      }
    } catch (e) {
      // Defensive: if dept fields are unexpected, don't block the operation
      console.warn('setManager: department comparison failed', e && e.message);
    }

    // Debug log: input summary (helpful when reproducing client 400/500)
    console.debug(`setManager: emp=${empId} manager=${managerId} tenant=${tenantId}`);

    // All validations passed - update manager
    await Employee.updateOne(
      { _id: empId, tenant: tenantId },
      { $set: { manager: managerId } }
    );

    // Return updated employee with populated manager details
    const updated = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('-password')
      .populate('manager', 'firstName lastName employeeId role department')
      .lean();

    res.json({
      success: true,
      employee: updated,
      message: 'Manager assigned successfully'
    });

  } catch (err) {
    console.error('setManager error:', err);
    res.status(500).json({ error: 'set_manager_failed', message: err.message });
  }
};

/**
 * REMOVE MANAGER - Dedicated endpoint to clear manager
 */
exports.removeManager = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;

    const emp = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('_id manager')
      .lean();

    if (!emp) {
      return res.status(404).json({ error: 'employee_not_found' });
    }

    await Employee.updateOne(
      { _id: empId, tenant: tenantId },
      { $set: { manager: null } }
    );

    const updated = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('-password')
      .lean();

    res.json({
      success: true,
      employee: updated,
      message: 'Manager removed successfully'
    });

  } catch (err) {
    console.error('removeManager error:', err);
    res.status(500).json({ error: 'remove_manager_failed', message: err.message });
  }
};

/**
 * GET DIRECT REPORTS - Optimized with projection
 */
exports.directReports = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const managerId = req.params.id;

    // Optimized query with projection - only fetch needed fields
    const items = await Employee.find({ tenant: tenantId, manager: managerId })
      .select('firstName lastName employeeId role department email profilePic')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    res.json(items);
  } catch (err) {
    console.error('directReports error:', err);
    res.status(500).json({ error: 'direct_reports_failed', message: err.message });
  }
};

/**
 * GET MANAGER - Optimized with projection
 */
exports.getManager = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;

    const emp = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('manager')
      .populate('manager', 'firstName lastName employeeId role department email profilePic')
      .lean();

    if (!emp) {
      return res.status(404).json({ error: 'not_found', message: 'Employee not found' });
    }

    res.json(emp.manager || null);
  } catch (err) {
    console.error('getManager error:', err);
    res.status(500).json({ error: 'get_manager_failed', message: err.message });
  }
};

/**
 * GET REPORTING CHAIN - Walk up the management chain
 * Optimized: Uses projection and handles null managers gracefully
 */
exports.reportingChain = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;

    const chain = [];
    const visited = new Set(); // Prevent infinite loops
    let current = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('manager')
      .lean();

    if (!current) {
      return res.status(404).json({ error: 'not_found', message: 'Employee not found' });
    }

    const MAX_DEPTH = 200;
    let depth = 0;

    // Walk up the chain
    while (current && current.manager) {
      const managerId = String(current.manager);

      // Prevent infinite loops
      if (visited.has(managerId)) {
        console.warn('Circular reference detected in reporting chain');
        break;
      }
      visited.add(managerId);

      // Get manager details with optimized projection
      const mgr = await Employee.findOne({ _id: managerId, tenant: tenantId })
        .select('firstName lastName employeeId role department email profilePic manager')
        .lean();

      if (!mgr) break;

      chain.push(mgr);
      current = mgr;
      depth++;

      if (depth > MAX_DEPTH) {
        console.warn('Max depth reached in reporting chain');
        break;
      }
    }

    res.json(chain);
  } catch (err) {
    console.error('reportingChain error:', err);
    res.status(500).json({ error: 'reporting_chain_failed', message: err.message });
  }
};

/**
 * BUILD SUBTREE - Optimized recursive function for org tree
 * - Uses lean() for performance
 * - Uses projection to fetch only needed fields
 * - Handles null managers gracefully
 * - Prevents infinite recursion
 */
async function buildSubtree(Employee, tenantId, empId, depthLeft, visited = new Set()) {
  // Prevent infinite recursion
  const empIdStr = String(empId);
  if (visited.has(empIdStr)) {
    console.warn(`Circular reference detected for employee ${empIdStr}`);
    return [];
  }
  visited.add(empIdStr);

  // Base case: depth limit reached
  if (depthLeft <= 0) {
    // Still fetch direct reports but mark as leaf nodes
    const subs = await Employee.find({ tenant: tenantId, manager: empId })
      .select('firstName lastName employeeId role department email profilePic')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    return subs.map(s => ({ ...s, reports: [] }));
  }

  // Fetch direct reports with optimized projection
  const subs = await Employee.find({ tenant: tenantId, manager: empId })
    .select('firstName lastName employeeId role department email profilePic')
    .sort({ firstName: 1, lastName: 1 })
    .lean();

  if (!subs || subs.length === 0) {
    return [];
  }

  // Recursively build subtree for each direct report
  const results = [];
  for (const sub of subs) {
    const reports = await buildSubtree(Employee, tenantId, sub._id, depthLeft - 1, new Set(visited));
    results.push({ ...sub, reports });
  }

  return results;
}

/**
 * GET ORG TREE - Get organizational tree starting from a specific employee
 * Improved: Better error handling, optimized queries, null manager handling
 */
exports.orgTree = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;
    const empId = req.params.id;
    const depth = Math.min(parseInt(req.query.depth || '5', 10), 20); // Cap at 20 for performance

    // Get root employee with optimized projection
    const root = await Employee.findOne({ _id: empId, tenant: tenantId })
      .select('firstName lastName employeeId role department email profilePic manager')
      .lean();

    if (!root) {
      return res.status(404).json({ error: 'not_found', message: 'Employee not found' });
    }

    // Build subtree recursively
    const reports = await buildSubtree(Employee, tenantId, root._id, depth);

    res.json({
      root,
      reports,
      depth: depth,
      totalReports: reports.length
    });
  } catch (err) {
    console.error('orgTree error:', err);
    res.status(500).json({ error: 'org_tree_failed', message: err.message });
  }
};

exports.getOrgRoot = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });
    const rootId = tenant?.meta?.orgRootEmployeeId || null;
    if (!rootId) return res.json(null);
    const { Employee } = getModels(req);
    const emp = await Employee.findOne({ _id: rootId, tenant: tenantId }).select('-password').lean();
    res.json(emp || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'get_org_root_failed' });
  }
};

exports.setOrgRoot = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { employeeId } = req.body;
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });
    const { Employee } = getModels(req);
    const emp = await Employee.findOne({ _id: employeeId, tenant: tenantId }).select('-password');
    if (!emp) return res.status(404).json({ error: 'employee_not_found' });
    tenant.meta = tenant.meta || {};
    tenant.meta.orgRootEmployeeId = String(emp._id);
    await tenant.save();
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'set_org_root_failed' });
  }
};

/**
 * GET COMPANY ORG TREE - Get full company organizational tree from root
 * Improved: Better error handling, fallback to top-level employees if root not set
 */
exports.companyOrgTree = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const depth = Math.min(parseInt(req.query.depth || '10', 10), 20); // Cap at 20
    const { Employee } = getModels(req);

    // Try to get org root from tenant meta
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      return res.status(404).json({ error: 'tenant_not_found', message: 'Tenant not found' });
    }

    const rootId = tenant?.meta?.orgRootEmployeeId || null;

    // If root is set, use it
    if (rootId) {
      const root = await Employee.findOne({ _id: rootId, tenant: tenantId })
        .select('firstName lastName employeeId role department email profilePic')
        .lean();

      if (root) {
        const reports = await buildSubtree(Employee, tenantId, root._id, depth);
        return res.json({
          root,
          reports,
          depth: depth,
          totalReports: reports.length,
          source: 'org_root'
        });
      }
    }

    // Fallback: Get all top-level employees (no manager)
    const topLevelEmployees = await Employee.find({
      tenant: tenantId,
      manager: null
    })
      .select('firstName lastName employeeId role department email profilePic')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    if (topLevelEmployees.length === 0) {
      return res.status(404).json({
        error: 'org_root_not_set',
        message: 'No organizational root set and no top-level employees found'
      });
    }

    // Build trees for all top-level employees
    const allReports = [];
    for (const topLevel of topLevelEmployees) {
      const reports = await buildSubtree(Employee, tenantId, topLevel._id, depth);
      allReports.push({ ...topLevel, reports });
    }

    res.json({
      root: null, // Multiple roots
      roots: topLevelEmployees,
      reports: allReports,
      depth: depth,
      totalReports: allReports.reduce((sum, r) => sum + r.reports.length, 0),
      source: 'top_level_employees'
    });

  } catch (err) {
    console.error('companyOrgTree error:', err);
    res.status(500).json({ error: 'company_org_tree_failed', message: err.message });
  }
};

/**
 * GET TOP-LEVEL EMPLOYEES - Employees with no manager (CEO/Founders)
 * New endpoint for better UX
 */
exports.getTopLevelEmployees = async (req, res) => {
  try {
    const { Employee } = getModels(req);
    const tenantId = req.tenantId;

    // Get all employees with no manager (top-level)
    const topLevel = await Employee.find({
      tenant: tenantId,
      manager: null
    })
      .select('firstName lastName employeeId role department email profilePic')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    res.json({
      employees: topLevel,
      count: topLevel.length
    });
  } catch (err) {
    console.error('getTopLevelEmployees error:', err);
    res.status(500).json({ error: 'get_top_level_failed', message: err.message });
  }
};

/* ---------------------------------------------
   GET FULL HIERARCHY (CEO → HR → Employees)
   Returns complete nested structure
   IMPROVED: Optimized queries, better null handling, depth limiting
--------------------------------------------- */
exports.getHierarchy = async (req, res) => {
  try {
    // Validate tenant context
    if (!req.user || !req.user.tenantId) {
      console.error("getHierarchy ERROR: Missing user or tenantId in request");
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'User context or tenant not found'
      });
    }

    const tenantId = req.user.tenantId || req.tenantId;
    if (!tenantId) {
      console.error("getHierarchy ERROR: tenantId not available");
      return res.status(400).json({
        success: false,
        error: 'tenant_missing',
        message: 'Tenant ID is required'
      });
    }

    // Safe depth parsing: default 10, min 1, max 20
    const depth = Math.min(Math.max(parseInt(req.query.depth || '10', 10) || 10, 1), 20);

    // Ensure tenantDB is available
    if (!req.tenantDB) {
      try {
        const getTenantDB = require('../utils/tenantDB');
        req.tenantDB = await getTenantDB(tenantId);
        // Models are already registered by dbManager, no need to register here
      } catch (e) {
        console.error('getHierarchy: failed to get tenantDB', e.message);
        return res.status(500).json({
          success: false,
          error: 'tenant_db_missing',
          message: 'Tenant database connection not available'
        });
      }
    }

    // Get Employee model
    let Employee;
    try {
      const models = getModels(req);
      Employee = models.Employee;
      if (!Employee || typeof Employee.aggregate !== 'function') {
        throw new Error('Employee model is not properly initialized');
      }
    } catch (e) {
      console.error('getHierarchy: failed to get models', e.message);
      return res.status(500).json({
        success: false,
        error: 'model_error',
        message: 'Failed to load employee model'
      });
    }

    // Normalize tenantId to string for queries
    const tenantIdStr = typeof tenantId === 'string' ? tenantId : tenantId.toString();

    // Use MongoDB aggregation with $graphLookup for safe hierarchy building
    try {
      // First, get all employees to build hierarchy manually (more reliable than $graphLookup with tenant filtering)
      const allEmployees = await Employee.find({ tenant: tenantIdStr })
        .select('firstName lastName employeeId role department departmentId email profilePic manager')
        .lean();

      // Handle empty result
      if (!allEmployees || allEmployees.length === 0) {
        return res.json({
          success: true,
          hierarchy: [],
          stats: {
            total: 0,
            roots: 0,
            withManager: 0,
            withoutManager: 0,
            inTree: 0
          }
        });
      }

      // Helper: safe manager ID extraction
      const getManagerId = (emp) => {
        if (!emp || !emp.manager) return null;
        if (typeof emp.manager === 'string') return emp.manager;
        if (emp.manager && emp.manager._id) return String(emp.manager._id);
        if (emp.manager && typeof emp.manager.toString === 'function') return String(emp.manager);
        return null;
      };

      // Build employee map
      const employeeMap = new Map();
      allEmployees.forEach(emp => {
        if (!emp || !emp._id) return;
        const empId = String(emp._id);
        employeeMap.set(empId, {
          _id: emp._id,
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          employeeId: emp.employeeId || '',
          role: emp.role || '',
          department: emp.department || '',
          departmentId: emp.departmentId || null,
          email: emp.email || '',
          profilePic: emp.profilePic || null,
          manager: getManagerId(emp),
          subordinates: []
        });
      });

      // Build hierarchy tree
      const roots = [];
      employeeMap.forEach((emp, empId) => {
        const managerId = emp.manager;

        // Null checks: if no manager or manager is self, it's a root
        if (!managerId || managerId === empId || managerId === '') {
          roots.push(emp);
          return;
        }

        // Try to find manager in map
        const manager = employeeMap.get(managerId);
        if (manager) {
          // Add to manager's subordinates (avoid duplicates)
          if (!manager.subordinates.some(sub => String(sub._id) === empId)) {
            manager.subordinates.push(emp);
          }
        } else {
          // Manager not found (orphaned), treat as root
          roots.push(emp);
        }
      });

      // Limit depth recursively
      function limitDepth(node, currentDepth, visited = new Set()) {
        const id = String(node._id);
        if (visited.has(id)) return; // Cycle detected
        visited.add(id);

        if (currentDepth >= depth) {
          node.subordinates = [];
          return;
        }

        if (node.subordinates && node.subordinates.length > 0) {
          node.subordinates.forEach(sub => limitDepth(sub, currentDepth + 1, new Set(visited)));
        }
      }

      roots.forEach(root => limitDepth(root, 0));

      // Count employees in tree
      function countInTree(node, visited = new Set()) {
        const id = String(node._id);
        if (visited.has(id)) return 0;
        visited.add(id);
        let count = 1;
        if (node.subordinates && node.subordinates.length > 0) {
          node.subordinates.forEach(sub => {
            count += countInTree(sub, new Set(visited));
          });
        }
        return count;
      }

      const totalInTree = roots.reduce((sum, root) => sum + countInTree(root), 0);
      const withManager = allEmployees.filter(e => {
        const mgrId = getManagerId(e);
        return mgrId && mgrId !== String(e._id) && mgrId !== '';
      }).length;

      return res.json({
        success: true,
        hierarchy: roots,
        stats: {
          total: allEmployees.length,
          roots: roots.length,
          withManager: withManager,
          withoutManager: allEmployees.length - withManager,
          inTree: totalInTree
        }
      });

    } catch (dbError) {
      console.error('getHierarchy: database query error', dbError);
      console.error('Error:', dbError.message);
      if (dbError.stack) console.error('Stack:', dbError.stack);

      // Fallback: return empty hierarchy on error
      return res.json({
        success: true,
        hierarchy: [],
        stats: {
          total: 0,
          roots: 0,
          withManager: 0,
          withoutManager: 0,
          inTree: 0
        }
      });
    }

  } catch (err) {
    console.error('getHierarchy: unexpected error', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.stack) {
      console.error('Error stack:', err.stack);
    }

    return res.status(500).json({
      success: false,
      error: 'hierarchy_failed',
      message: err.message || 'Unknown error occurred while building hierarchy'
    });
  }
};

/* -----------------------------------------
   BULK UPLOAD TEMPLATE
----------------------------------------- */
// exports.downloadBulkUploadTemp = async (req, res) => {
//   try {
//     const XLSX = require('xlsx');

//     // Create a new workbook
//     const workbook = XLSX.utils.book_new();

//     // Sample data with all possible columns
//     const sampleData = [
//       {
//         'Employee ID': 'EMP001',
//         'First Name': 'John',
//         'Middle Name': 'M',
//         'Last Name': 'Doe',
//         'Email': 'john.doe@company.com',
//         'Contact No': '9876543210',
//         'Gender': 'Male',
//         'Date of Birth': '1990-01-15',
//         'Marital Status': 'Single',
//         'Blood Group': 'O+',
//         'Nationality': 'Indian',
//         'Father Name': 'James Doe',
//         'Mother Name': 'Jane Doe',
//         'Emergency Contact Name': 'Jane Doe',
//         'Emergency Contact Number': '9876543211',
//         'Temp Address Line 1': '123 Main St',
//         'Temp Address Line 2': 'Apt 4B',
//         'Temp City': 'New York',
//         'Temp State': 'NY',
//         'Temp Pin Code': '10001',
//         'Temp Country': 'USA',
//         'Perm Address Line 1': '456 Oak Ave',
//         'Perm Address Line 2': 'House 5',
//         'Perm City': 'Boston',
//         'Perm State': 'MA',
//         'Perm Pin Code': '02101',
//         'Perm Country': 'USA',
//         'Joining Date': '2024-01-01',
//         'Department': 'Tech',
//         'Role': 'employee',
//         'Job Type': 'Full-Time',
//         'Bank Name': 'State Bank',
//         'Account Number': '123456789',
//         'IFSC Code': 'SBIN0001234',
//         'Branch Name': 'Main Branch',
//         'Bank Location': 'New York'
//       }
//     ];

//     // Add headers with description
//     const headers = [
//       'Employee ID (Required)',
//       'First Name (Required)',
//       'Middle Name',
//       'Last Name (Required)',
//       'Email (Required)',
//       'Contact No',
//       'Gender (M/F/Other)',
//       'Date of Birth (YYYY-MM-DD)',
//       'Marital Status',
//       'Blood Group',
//       'Nationality',
//       'Father Name',
//       'Mother Name',
//       'Emergency Contact Name',
//       'Emergency Contact Number',
//       'Temp Address Line 1',
//       'Temp Address Line 2',
//       'Temp City',
//       'Temp State',
//       'Temp Pin Code',
//       'Temp Country',
//       'Perm Address Line 1',
//       'Perm Address Line 2',
//       'Perm City',
//       'Perm State',
//       'Perm Pin Code',
//       'Perm Country',
//       'Joining Date (YYYY-MM-DD, Required)',
//       'Department',
//       'Role',
//       'Job Type',
//       'Bank Name',
//       'Account Number',
//       'IFSC Code',
//       'Branch Name',
//       'Bank Location'
//     ];

//     // Create worksheet with sample data
//     const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: 1 });

//     // Set column widths for better readability
//     worksheet['!cols'] = [
//       { wch: 12 },
//       { wch: 12 },
//       { wch: 12 },
//       { wch: 12 },
//       { wch: 20 },
//       { wch: 12 },
//       { wch: 10 },
//       { wch: 15 },
//       { wch: 15 },
//       { wch: 12 },
//       { wch: 12 },
//       { wch: 15 },
//       { wch: 15 },
//       { wch: 20 },
//       { wch: 20 },
//       { wch: 20 },
//       { wch: 20 },
//       { wch: 15 },
//       { wch: 12 },
//       { wch: 12 },
//       { wch: 12 },
//       { wch: 20 },
//       { wch: 20 },
//       { wch: 15 },
//       { wch: 12 },
//       { wch: 12 },
//       { wch: 12 },
//       { wch: 15 },
//       { wch: 15 },
//       { wch: 12 },
//       { wch: 12 },
//       { wch: 15 },
//       { wch: 18 },
//       { wch: 12 },
//       { wch: 15 },
//       { wch: 15 }
//     ];

//     // Add the worksheet to the workbook
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Template');

//     // Generate buffer
//     const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

//     // Send file as response
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="Employee_Bulk_Upload_Template_${Date.now()}.xlsx"`);
//     res.setHeader('Content-Length', buffer.length);
//     res.end(buffer);
//   } catch (err) {
//     console.error('Error generating template:', err);
//     res.status(500).json({
//       success: false,
//       error: 'template_generation_failed',
//       message: err.message || 'Failed to generate template'
//     });
//   }
// };
function autoFitColumns(worksheet, data) {
  const colWidths = [];

  data.forEach(row => {
    row.forEach((cell, colIndex) => {
      const cellValue = cell ? cell.toString() : '';
      colWidths[colIndex] = Math.max(
        colWidths[colIndex] || 10,
        cellValue.length + 2
      );
    });
  });

  worksheet['!cols'] = colWidths.map(wch => ({ wch }));
}

exports.downloadBulkUploadTemp = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Headers (first row)
    const headers = [
      'Sr. No',
      'Employee ID (Optional - Auto-generated if blank)',
      'First Name (Required)',
      'Middle Name',
      'Last Name (Required)',
      'Email (Required)',
      'Contact No',
      'Gender (M/F/Other)',
      'Date of Birth (YYYY-MM-DD)',
      'Marital Status',
      'Blood Group',
      'Nationality',
      'Father Name',
      'Mother Name',
      'Emergency Contact Name',
      'Emergency Contact Number',
      'Temp Address Line 1',
      'Temp Address Line 2',
      'Temp City',
      'Temp State',
      'Temp Pin Code',
      'Temp Country',
      'Perm Address Line 1',
      'Perm Address Line 2',
      'Perm City',
      'Perm State',
      'Perm Pin Code',
      'Perm Country',
      'Joining Date (YYYY-MM-DD, Required)',
      'Department',
      'Role',
      'Job Type',
      'Password',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Branch Name',
      'Bank Location'
    ];

    // Sample row (second row)
    const sampleRow = [
      '1',
      '', // Leave blank for auto-generation
      'Dhiren',
      'Vinodbhai',
      'Makwana',
      'dhiren.makwana@gitakshmi.com',
      '9876543210',
      'Male',
      '1990-01-15',
      'Single',
      'O+',
      'Indian',
      'Vinodbhai',
      'Hemlattaben',
      'Vinodbhai',
      '9876543211',
      '123 Main St',
      'Apt 4B',
      'Gandhinagar',
      'Gujarat',
      '382721',
      'India',
      '47 Kaivnna',
      'Panchvati',
      'Ahmedabad',
      'Gujarat',
      '380001',
      'India',
      '2025-12-31',
      'Tech',
      'employee',
      'Full-Time',
      '123456',
      'State Bank',
      '123456789',
      'SBIN0001234',
      'Main Branch',
      'Ahmedabad'
    ];

    // Create worksheet (Array of Arrays)
    const worksheet = XLSX.utils.aoa_to_sheet([
      headers,
      sampleRow
    ]);

    autoFitColumns(worksheet, [headers, sampleRow]);
    // Style header row (bold + center)
    const headerStyle = {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    // Apply style to each header cell
    headers.forEach((_, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = headerStyle;
      }
    });

    // Column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
      { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
      { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
      { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 16 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
      { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }
    ];

    // Append sheet
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Template');

    // Generate buffer
    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer'
    });

    // Send response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Employee_Bulk_Upload_Template_${Date.now()}.xlsx"`
    );
    res.setHeader('Content-Length', buffer.length);

    res.end(buffer);
  } catch (err) {
    console.error('Error generating template:', err);
    res.status(500).json({
      success: false,
      error: 'template_generation_failed',
      message: err.message || 'Failed to generate template'
    });
  }
};

/* -----------------------------------------
   BULK UPLOAD EMPLOYEES
----------------------------------------- */

/**
 * Helper: Generate next sequential employee ID
 * Format: EMP{NNNN} (e.g., EMP0001, EMP0002, etc.)
 */
async function generateNextEmployeeId(Employee, tenantId, startFrom = 1) {
  try {
    // Find all existing employees with IDs matching EMP pattern
    const existingEmps = await Employee.find({
      tenant: tenantId,
      employeeId: /^EMP\d+$/i
    }).select('employeeId').lean();

    let maxNumber = 0;

    // Extract numeric parts and find the highest
    existingEmps.forEach(emp => {
      const match = emp.employeeId.match(/^EMP(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    // Start from the higher of: maxNumber + 1 or startFrom
    const nextNumber = Math.max(maxNumber + 1, startFrom);

    // Return formatted ID with 4-digit padding
    return `EMP${String(nextNumber).padStart(4, '0')}`;
  } catch (err) {
    console.error('Error generating employee ID:', err);
    // Fallback to timestamp-based ID
    return `EMP${Date.now().toString().slice(-8)}`;
  }
}

exports.bulkUploadEmployees = async (req, res) => {
  try {
    const { records } = req.body;

    // ====== INPUT VALIDATION ======
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: "Records must be an array",
        uploadedCount: 0,
        failedCount: 0,
        errors: ["Invalid request format - records must be an array"]
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No records provided",
        uploadedCount: 0,
        failedCount: 0,
        errors: ["No employee records to upload"]
      });
    }

    if (records.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Maximum 1000 records allowed per upload",
        uploadedCount: 0,
        failedCount: records.length,
        errors: ["Exceeded maximum record limit of 1000 records"]
      });
    }

    const { Employee, Department, LeavePolicy } = getModels(req);
    const tenantId = req.tenantId;
    const userId = req.user.id;

    // Fetch Company ID Configuration
    const companyConfig = await CompanyIdConfig.findOne({
      companyId: tenantId,
      entityType: 'EMPLOYEE'
    }).lean();

    // Policy Configuration
    const prefix = companyConfig?.prefix || 'EMP';
    const suffix = ''; // Schema doesn't support suffix yet
    const padding = companyConfig?.padding || 4;
    const startFrom = companyConfig?.startFrom || 1;

    // Construct Regex for matching ID pattern: ^PREFIX(\d+)SUFFIX$
    // Escape special regex chars in prefix/suffix
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRegex = escapeRegExp(prefix);
    const suffixRegex = escapeRegExp(suffix);
    const idPattern = new RegExp(`^${prefixRegex}(\\d+)${suffixRegex}$`, 'i');

    const results = {
      uploadedCount: 0,
      failedCount: 0,
      errors: [],
      warnings: [],
      processedIds: [],
      autoGeneratedIds: []
    };

    // ====== HELPER FUNCTIONS ======

    // Helper: Normalize column names (remove spaces, special chars, and parentheses with content)
    const normalize = (s) => {
      if (!s) return '';
      // Remove content in parentheses first, then normalize
      return s.toString()
        .replace(/\([^)]*\)/g, '') // Remove anything in parentheses
        .toLowerCase()
        .replace(/\s/g, '')
        .replace(/[^a-z0-9]/g, '');
    };

    // Helper: Validate email with better domain checking
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      return emailRegex.test(email);
    };

    // Helper: Validate date
    const validateDate = (dateVal) => {
      if (!dateVal) return null;
      let dateObj;

      if (dateVal instanceof Date) {
        dateObj = dateVal;
      } else {
        const dateStr = dateVal.toString().trim();
        // Try parsing YYYY-MM-DD format
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
          dateObj = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
        } else {
          dateObj = new Date(dateStr);
        }
      }

      if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid date format: ${dateVal}`);
      }
      return dateObj;
    };

    // Helper: Validate phone number
    const validatePhone = (phone) => {
      if (!phone) return true; // Optional field
      const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
      return phoneRegex.test(phone);
    };

    // ====== PRE-PROCESSING & CACHING ======

    // Cache for lookups
    const deptCache = {};
    const policyCache = {};
    const processedEmails = new Set();
    const processedEmpIds = new Set();

    // Pre-cache departments
    const allDepts = await Department.find({ tenant: tenantId }).select('_id name').lean();
    allDepts.forEach(d => {
      deptCache[d.name.toLowerCase().trim()] = d._id;
    });

    // Pre-cache leave policies
    const allPolicies = await LeavePolicy.find({ tenant: tenantId }).select('_id name').lean();
    allPolicies.forEach(p => {
      policyCache[p.name.toLowerCase().trim()] = p._id;
    });

    // Get default leave policy if needed
    const defaultPolicy = allPolicies.length > 0 ? allPolicies[0]._id : null;

    // Pre-fetch existing employees for bulk checking
    const existingEmps = await Employee.find({ tenant: tenantId }).select('employeeId email').lean();
    const existingEmpIds = new Set(existingEmps.map(e => e.employeeId.toLowerCase()));
    const existingEmails = new Set(existingEmps.map(e => e.email.toLowerCase()));

    // ====== FIRST PASS: COLLECT PROVIDED EMPLOYEE IDs & IDENTIFY MISSING ======
    const recordsNeedingIds = [];
    const providedIds = new Set();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      let empId = '';

      // Extract Employee ID if provided
      for (const key of Object.keys(row)) {
        const normKey = normalize(key);
        if (normKey.includes('employeeid') || normKey.includes('empid')) {
          empId = row[key] ? row[key].toString().trim() : '';
          break;
        }
      }

      if (empId) {
        providedIds.add(empId.toLowerCase());
      } else {
        recordsNeedingIds.push(i);
      }
    }

    // ====== AUTO-GENERATE EMPLOYEE IDs FOR MISSING ONES ======
    const autoGeneratedMap = new Map(); // index -> generated ID

    if (recordsNeedingIds.length > 0) {
      let currentIdNumber = startFrom;

      // Find the starting number based on policy
      const allExistingIds = await Employee.find({
        tenant: tenantId,
        employeeId: { $regex: idPattern }
      }).select('employeeId').lean();

      let maxNumber = 0;
      allExistingIds.forEach(emp => {
        const match = emp.employeeId.match(idPattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });

      // Start strictly after the max existing number, or from the policy startFrom if no IDs exist
      currentIdNumber = Math.max(maxNumber + 1, startFrom);

      // Generate IDs for records that need them
      for (const index of recordsNeedingIds) {
        let generatedId;
        let attempts = 0;

        // Ensure generated ID doesn't conflict with provided IDs or existing IDs or already processed IDs
        do {
          const numStr = String(currentIdNumber).padStart(padding, '0');
          generatedId = `${prefix}${numStr}${suffix}`;
          currentIdNumber++;
          attempts++;

          if (attempts > 10000) {
            throw new Error('Unable to generate unique employee ID after 10000 attempts');
          }
        } while (
          providedIds.has(generatedId.toLowerCase()) || // Conflict with ID provided in THIS file
          existingEmpIds.has(generatedId.toLowerCase()) || // Conflict with ID in DB
          processedEmpIds.has(generatedId.toLowerCase())   // Conflict with ID generated for previous row in this loop
        );

        autoGeneratedMap.set(index, generatedId);
        results.autoGeneratedIds.push(generatedId);
        processedEmpIds.add(generatedId.toLowerCase());
      }
    }

    // ====== SECOND PASS: PROCESS EACH RECORD ======
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowIdx = i + 2; // 1-indexed + header row

      try {
        // ====== EXTRACT FIELDS ======
        let empId = '';
        let firstName = '';
        let middleName = '';
        let lastName = '';
        let email = '';
        let contactNo = '';
        let gender = '';
        let dob = null;
        let joiningDate = null;
        let departmentName = '';
        let role = '';
        let jobType = '';
        let maritalStatus = '';
        let nationality = '';
        let bloodGroup = '';
        let fatherName = '';
        let motherName = '';
        let emergencyContactName = '';
        let emergencyContactNumber = '';
        let bankName = '';
        let accountNumber = '';
        let ifscCode = '';
        let branchName = '';
        let bankLocation = '';
        let policyName = '';
        let password = '';
        let tempAddr = {};
        let permAddr = {};

        // Parse row data
        for (const key of Object.keys(row)) {
          const normKey = normalize(key);
          const val = row[key];

          if (normKey.includes('employeeid') || normKey.includes('empid')) {
            empId = val ? val.toString().trim() : '';
          } else if (normKey === 'firstname' || normKey === 'first') {
            firstName = val ? val.toString().trim() : '';
          } else if (normKey === 'middlename' || normKey === 'middle') {
            middleName = val ? val.toString().trim() : '';
          } else if (normKey === 'lastname' || normKey === 'last') {
            lastName = val ? val.toString().trim() : '';
          } else if (normKey === 'email' || normKey.includes('emailaddress')) {
            email = val ? val.toString().trim().toLowerCase() : '';
          } else if (normKey === 'contactno' || normKey.includes('phone') || normKey.includes('mobile')) {
            contactNo = val ? val.toString().trim() : '';
          } else if (normKey === 'gender') {
            gender = val ? val.toString().trim() : '';
          } else if (normKey === 'dob' || normKey === 'dateofbirth') {
            dob = val;
          } else if (normKey === 'joiningdate' || normKey === 'doj') {
            joiningDate = val;
          } else if (normKey === 'department') {
            departmentName = val ? val.toString().trim() : '';
          } else if (normKey === 'role' || normKey === 'designation') {
            role = val ? val.toString().trim() : '';
          } else if (normKey === 'jobtype') {
            jobType = val ? val.toString().trim() : '';
          } else if (normKey === 'maritalstatus') {
            maritalStatus = val ? val.toString().trim() : '';
          } else if (normKey === 'nationality') {
            nationality = val ? val.toString().trim() : '';
          } else if (normKey === 'bloodgroup') {
            bloodGroup = val ? val.toString().trim() : '';
          } else if (normKey === 'fathername') {
            fatherName = val ? val.toString().trim() : '';
          } else if (normKey === 'mothername') {
            motherName = val ? val.toString().trim() : '';
          } else if (normKey === 'emergencycontactname') {
            emergencyContactName = val ? val.toString().trim() : '';
          } else if (normKey === 'emergencycontactnumber') {
            emergencyContactNumber = val ? val.toString().trim() : '';
          } else if (normKey === 'bankname') {
            bankName = val ? val.toString().trim() : '';
          } else if (normKey === 'accountnumber') {
            accountNumber = val ? val.toString().trim() : '';
          } else if (normKey === 'ifscode' || normKey === 'ifsc') {
            ifscCode = val ? val.toString().trim() : '';
          } else if (normKey === 'branchname') {
            branchName = val ? val.toString().trim() : '';
          } else if (normKey === 'banklocation') {
            bankLocation = val ? val.toString().trim() : '';
          } else if (normKey === 'leavepolicy') {
            policyName = val ? val.toString().trim() : '';
          } else if (normKey === 'password') {
            password = val ? val.toString().trim() : '';
          } else if (normKey.includes('tempaddressline1')) {
            tempAddr.line1 = val ? val.toString().trim() : '';
          } else if (normKey.includes('tempaddressline2')) {
            tempAddr.line2 = val ? val.toString().trim() : '';
          } else if (normKey.includes('tempcity')) {
            tempAddr.city = val ? val.toString().trim() : '';
          } else if (normKey.includes('tempstate')) {
            tempAddr.state = val ? val.toString().trim() : '';
          } else if (normKey.includes('temppincode')) {
            tempAddr.pinCode = val ? val.toString().trim() : '';
          } else if (normKey.includes('tempcountry')) {
            tempAddr.country = val ? val.toString().trim() : '';
          } else if (normKey.includes('permaddressline1')) {
            permAddr.line1 = val ? val.toString().trim() : '';
          } else if (normKey.includes('permaddressline2')) {
            permAddr.line2 = val ? val.toString().trim() : '';
          } else if (normKey.includes('permcity')) {
            permAddr.city = val ? val.toString().trim() : '';
          } else if (normKey.includes('permstate')) {
            permAddr.state = val ? val.toString().trim() : '';
          } else if (normKey.includes('permpincode')) {
            permAddr.pinCode = val ? val.toString().trim() : '';
          } else if (normKey.includes('permcountry')) {
            permAddr.country = val ? val.toString().trim() : '';
          }
        }

        // ====== AUTO-GENERATE EMPLOYEE ID IF MISSING ======
        if (!empId) {
          if (autoGeneratedMap.has(i)) {
            empId = autoGeneratedMap.get(i);
          } else {
            throw new Error('Employee ID generation failed - internal error');
          }
        }

        // ====== VALIDATION ======

        // Required fields validation
        if (!empId) throw new Error('Employee ID is required or could not be generated');
        if (!firstName) throw new Error('First Name is required');
        if (!lastName) throw new Error('Last Name is required');
        if (!email) throw new Error('Email is required');
        if (!joiningDate) throw new Error('Joining Date is required');

        // Employee ID validation
        const empIdLower = empId.toLowerCase();
        if (!/^[a-zA-Z0-9\-_]{1,50}$/.test(empId)) {
          throw new Error(`Invalid Employee ID format: ${empId} (use alphanumeric, dash, or underscore only)`);
        }

        // Check for duplicate Employee ID (within current batch or existing)
        if (processedEmpIds.has(empIdLower) && !autoGeneratedMap.has(i)) {
          throw new Error(`Duplicate Employee ID in current batch: ${empId}`);
        }
        if (existingEmpIds.has(empIdLower)) {
          throw new Error(`Employee ID "${empId}" already exists in system`);
        }

        // Email validation
        if (!validateEmail(email)) {
          throw new Error(`Invalid email format: ${email}`);
        }

        // Check for duplicate Email (within current batch or existing)
        const emailLower = email.toLowerCase();
        if (processedEmails.has(emailLower)) {
          throw new Error(`Duplicate email in current batch: ${email}`);
        }
        if (existingEmails.has(emailLower)) {
          throw new Error(`Email "${email}" already exists in system`);
        }

        // First/Last Name length validation
        if (firstName.length < 2) throw new Error('First Name must be at least 2 characters');
        if (lastName.length < 2) throw new Error('Last Name must be at least 2 characters');

        // Contact number validation
        if (contactNo && !validatePhone(contactNo)) {
          results.warnings.push(`Row ${rowIdx}: Contact number format may be invalid - "${contactNo}"`);
        }

        // Parse and validate dates
        let dobDate = null;
        let joiningDateObj = null;

        if (dob) {
          try {
            dobDate = validateDate(dob);
            const age = (new Date() - dobDate) / (365.25 * 24 * 60 * 60 * 1000);
            if (age < 18) {
              results.warnings.push(`Row ${rowIdx}: Employee appears to be under 18 years old`);
            }
            if (dobDate > new Date()) {
              throw new Error('Date of Birth cannot be in the future');
            }
          } catch (err) {
            results.warnings.push(`Row ${rowIdx}: ${err.message} - will skip DOB`);
            dobDate = null;
          }
        }

        try {
          joiningDateObj = validateDate(joiningDate);
          if (joiningDateObj > new Date()) {
            results.warnings.push(`Row ${rowIdx}: Joining Date is in the future`);
          }
        } catch (err) {
          throw new Error(`Invalid Joining Date: ${err.message}`);
        }

        // Validate Gender
        let validGender = null;
        if (gender) {
          const normalizedGender = gender.toLowerCase();
          if (['male', 'm'].includes(normalizedGender)) {
            validGender = 'Male';
          } else if (['female', 'f'].includes(normalizedGender)) {
            validGender = 'Female';
          } else if (['other', 'o'].includes(normalizedGender)) {
            validGender = 'Other';
          } else {
            results.warnings.push(`Row ${rowIdx}: Invalid gender value "${gender}" - will skip`);
          }
        }

        // Validate Job Type
        let validJobType = null;
        if (jobType) {
          const normalizedJobType = jobType.toLowerCase().replace(/\s/g, '');
          if (['fulltime', 'ft', 'full-time'].includes(normalizedJobType)) {
            validJobType = 'Full-Time';
          } else if (['parttime', 'pt', 'part-time'].includes(normalizedJobType)) {
            validJobType = 'Part-Time';
          } else if (['internship', 'intern'].includes(normalizedJobType)) {
            validJobType = 'Internship';
          } else {
            results.warnings.push(`Row ${rowIdx}: Invalid job type "${jobType}" - will use Full-Time`);
            validJobType = 'Full-Time';
          }
        } else {
          validJobType = 'Full-Time';
        }

        // Resolve Department
        let departmentId = null;
        if (departmentName) {
          const deptLower = departmentName.toLowerCase().trim();
          departmentId = deptCache[deptLower];
          if (!departmentId) {
            results.warnings.push(`Row ${rowIdx}: Department "${departmentName}" not found - will be left blank`);
          }
        }

        // Resolve Leave Policy
        let policyId = null;
        if (policyName) {
          const policyLower = policyName.toLowerCase().trim();
          policyId = policyCache[policyLower];
          if (!policyId) {
            results.warnings.push(`Row ${rowIdx}: Leave Policy "${policyName}" not found - will use default`);
            if (defaultPolicy) policyId = defaultPolicy;
          }
        } else if (defaultPolicy) {
          policyId = defaultPolicy;
        }

        // Hash password if provided, or generate default password
        let hashedPassword = undefined;
        if (password) {
          // User provided a password - hash it
          try {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
          } catch (hashErr) {
            results.warnings.push(`Row ${rowIdx}: Failed to hash password - will use default password`);
            // Fall through to generate default password
          }
        }

        // If no password provided or hashing failed, generate default password
        if (!hashedPassword) {
          try {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            // Use employeeId as default password (e.g., EMP0001)
            const defaultPassword = empId;
            hashedPassword = await bcrypt.hash(defaultPassword, salt);
            results.warnings.push(`Row ${rowIdx}: No password provided - default password set to Employee ID (${empId})`);
          } catch (hashErr) {
            results.warnings.push(`Row ${rowIdx}: Failed to generate default password - employee may not be able to log in`);
          }
        }

        // ====== CREATE EMPLOYEE DOCUMENT ======
        const newEmployee = new Employee({
          tenant: tenantId,
          employeeId: empId,
          firstName,
          middleName: middleName || undefined,
          lastName,
          email,
          password: hashedPassword,
          contactNo: contactNo || undefined,
          gender: validGender || undefined,
          dob: dobDate,
          joiningDate: joiningDateObj,
          departmentId,
          department: departmentName || undefined,
          role: role || undefined,
          jobType: validJobType,
          maritalStatus: maritalStatus || undefined,
          nationality: nationality || undefined,
          bloodGroup: bloodGroup || undefined,
          fatherName: fatherName || undefined,
          motherName: motherName || undefined,
          emergencyContactName: emergencyContactName || undefined,
          emergencyContactNumber: emergencyContactNumber || undefined,
          leavePolicy: policyId,
          bankDetails: (bankName || accountNumber || ifscCode) ? {
            bankName: bankName || undefined,
            accountNumber: accountNumber || undefined,
            ifsc: ifscCode || undefined,
            branchName: branchName || undefined,
            location: bankLocation || undefined
          } : undefined,
          tempAddress: Object.keys(tempAddr).length > 0 ? tempAddr : undefined,
          permAddress: Object.keys(permAddr).length > 0 ? permAddr : undefined,
          status: 'Active',
          lastStep: 6 // Mark as completed
        });

        // Save with detailed error logging
        try {
          await newEmployee.save();
          results.uploadedCount++;
          results.processedIds.push(empId);
          processedEmpIds.add(empIdLower);
          processedEmails.add(emailLower);
        } catch (saveErr) {
          // Detailed save error logging
          console.error(`Row ${rowIdx} save failed:`, saveErr);
          throw new Error(`Failed to save employee: ${saveErr.message}`);
        }

      } catch (error) {
        results.failedCount++;
        const errorMsg = `Row ${rowIdx}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error('Bulk upload row error:', errorMsg, error);
      }
    }

    // ====== UPDATE CENTRALIZED ID COUNTER (Prevent collisions with single add) ======
    if (results.uploadedCount > 0) {
      let maxIdNum = 0;
      // Scan all processed IDs (both provided and generated) to find the absolute max counter
      for (const pid of processedEmpIds) {
        const match = pid.match(idPattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxIdNum) maxIdNum = num;
        }
      }

      if (maxIdNum > 0) {
        try {
          // DocumentCounter uses key 'EMP' for Employees (based on DEFAULT_DOC_TYPES in companyIdConfig)
          const docKey = 'EMP';
          const resetPolicy = companyConfig?.resetPolicy || 'NEVER';
          const financialYear = resetPolicy === 'NEVER' ? 'GLOBAL' : (companyConfig?.financialYear || 'GLOBAL');

          await DocumentCounter.findOneAndUpdate(
            {
              companyId: tenantId,
              documentType: docKey,
              financialYear: financialYear
            },
            { $max: { lastNumber: maxIdNum } }, // Only update if our max is larger 
            { upsert: true, new: true }
          );

          // Also try to update 'EMPLOYEE' key just in case legacy config uses it
          await DocumentCounter.findOneAndUpdate(
            {
              companyId: tenantId,
              documentType: 'EMPLOYEE',
              financialYear: financialYear
            },
            { $max: { lastNumber: maxIdNum } },
            { upsert: true, new: true }
          );

        } catch (syncErr) {
          console.warn('DocumentCounter sync warning:', syncErr.message);
          // Non-fatal, don't fail the upload
        }
      }
    }

    // ====== PREPARE RESPONSE ======
    const allFailed = results.uploadedCount === 0;
    const allSucceeded = results.failedCount === 0;

    let message = '';
    if (allSucceeded) {
      message = `Successfully uploaded all ${results.uploadedCount} employee(s)`;
      if (results.autoGeneratedIds.length > 0) {
        message += ` (${results.autoGeneratedIds.length} ID(s) auto-generated)`;
      }
    } else if (allFailed) {
      message = `Failed to upload all ${results.failedCount} employee(s)`;
    } else {
      message = `Uploaded ${results.uploadedCount} employee(s) successfully, ${results.failedCount} failed`;
      if (results.autoGeneratedIds.length > 0) {
        message += ` (${results.autoGeneratedIds.length} ID(s) auto-generated)`;
      }
    }

    res.json({
      success: !allFailed, // Only success if at least one record uploaded
      uploadedCount: results.uploadedCount,
      failedCount: results.failedCount,
      errors: results.errors,
      warnings: results.warnings,
      autoGeneratedIds: results.autoGeneratedIds,
      message
    });

  } catch (err) {
    console.error("Bulk upload error:", err);
    res.status(500).json({
      success: false,
      message: "Bulk upload failed due to server error",
      error: err.message,
      uploadedCount: 0,
      failedCount: 0,
      errors: [err.message || 'An unexpected error occurred']
    });
  }
};
