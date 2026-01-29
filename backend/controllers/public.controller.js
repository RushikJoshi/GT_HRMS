const ApplicantSchema = require('../models/Applicant');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const getTenantDB = require('../utils/tenantDB');
const EmailService = require('../services/email.service');

/* ----------------------------------------------------
   MULTER CONFIG (RESUME UPLOAD)
---------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const dir = path.join(__dirname, '../uploads/resumes/');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    allowed ? cb(null, true) : cb(new Error('Only PDF and Word files allowed'));
  }
});

/* ----------------------------------------------------
   GET PUBLIC JOBS (BY TENANT ID)
---------------------------------------------------- */
exports.getPublicJobs = async (req, res) => {
  try {
    const { tenantId: identifier } = req.query;
    console.log(`🔍 [GET_PUBLIC_JOBS] Received request for identifier: ${identifier}`);

    if (!identifier) {
      console.warn('⚠️ [GET_PUBLIC_JOBS] No identifier provided');
      return res.status(400).json({ error: "Tenant ID required" });
    }

    // 1. Resolve actual tenant ID (ObjectId)
    let tenant;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      tenant = await Tenant.findById(identifier);
    } else {
      tenant = await Tenant.findOne({ code: identifier });
    }

    if (!tenant) {
      console.warn(`❌ [GET_PUBLIC_JOBS] Company not found for identifier: ${identifier}`);
      return res.status(404).json({ error: "Company not found" });
    }

    const tenantId = tenant._id;
    console.log(`✅ [GET_PUBLIC_JOBS] Resolved Tenant: ${tenant.name} (${tenantId})`);

    // 2. Resolve tenant DB
    const tenantDB = await getTenantDB(tenantId);
    console.log(`✅ [GET_PUBLIC_JOBS] Tenant DB obtained for ${tenantId}`);

    const Requirement = tenantDB.model("Requirement");

    // 3. Fetch jobs using the resolved ObjectId
    const jobs = await Requirement.find({
      status: 'Open',
      $or: [
        { visibility: { $in: ['External', 'Both'] } },
        { visibility: { $exists: false } },
        { visibility: null }
      ]
    })
      .select('jobTitle department vacancy createdAt tenant visibility employmentType location minExperienceMonths maxExperienceMonths description')
      .sort({ createdAt: -1 });

    console.log(`✅ [GET_PUBLIC_JOBS] Found ${jobs.length} jobs for ${tenant.name}`);
    res.json(jobs);
  } catch (err) {
    console.error("❌ [GET_PUBLIC_JOBS] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch jobs: " + err.message });
  }
};

/* ----------------------------------------------------
   GET PUBLIC JOBS (BY COMPANY CODE)
---------------------------------------------------- */
exports.getPublicJobsByCompanyCode = async (req, res) => {
  try {
    const { companyCode } = req.params;
    console.log(`🔍 [GET_JOBS_BY_CODE] Code: ${companyCode}`);

    if (!companyCode)
      return res.status(400).json({ error: "Company code required" });

    const tenant = await Tenant.findOne({ code: companyCode });
    if (!tenant) {
      console.warn(`❌ [GET_JOBS_BY_CODE] Tenant not found: ${companyCode}`);
      return res.status(404).json({ error: "Company not found" });
    }

    const tenantDB = await getTenantDB(tenant._id);
    const Requirement = tenantDB.model("Requirement");

    const jobs = await Requirement.find({
      status: 'Open',
      $or: [
        { visibility: { $in: ['External', 'Both'] } },
        { visibility: { $exists: false } },
        { visibility: null }
      ]
    })
      .select('jobTitle department vacancy createdAt tenant visibility employmentType location minExperienceMonths maxExperienceMonths description')
      .sort({ createdAt: -1 });

    console.log(`✅ [GET_JOBS_BY_CODE] Found ${jobs.length} jobs for ${tenant.name}`);
    res.json(jobs);
  } catch (err) {
    console.error("❌ [GET_JOBS_BY_CODE] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

/* ----------------------------------------------------
   RESOLVE COMPANY CODE TO TENANT ID
---------------------------------------------------- */
exports.resolveCompanyCode = async (req, res) => {
  try {
    const { code } = req.params;
    console.log(`🔍 [RESOLVE_CODE] Code: ${code}`);

    if (!code) return res.status(400).json({ error: "Code required" });

    let tenant;
    if (mongoose.Types.ObjectId.isValid(code)) {
      tenant = await Tenant.findById(code);
    } else {
      tenant = await Tenant.findOne({ code });
    }

    if (!tenant) {
      console.warn(`❌ [RESOLVE_CODE] Tenant not found for ${code}`);
      return res.status(404).json({ error: "Company not found" });
    }

    console.log(`✅ [RESOLVE_CODE] Found: ${tenant.name} -> ${tenant._id}`);
    res.json({ tenantId: tenant._id, companyName: tenant.name });
  } catch (err) {
    console.error("❌ [RESOLVE_CODE] Error:", err.message);
    res.status(500).json({ error: "Failed to resolve company" });
  }
};

/* ----------------------------------------------------
   GET TENANT BASIC DETAILS (BY ID)
---------------------------------------------------- */
exports.getTenantBasicDetails = async (req, res) => {
  try {
    const { tenantId: identifier } = req.params;
    if (!identifier) return res.status(400).json({ error: "Tenant ID required" });

    let tenant;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      tenant = await Tenant.findById(identifier).select('name code logo');
    } else {
      tenant = await Tenant.findOne({ code: identifier }).select('name code logo');
    }

    if (!tenant) return res.status(404).json({ error: "Company not found" });

    res.json({
      name: tenant.name,
      code: tenant.code,
      logo: tenant.logo // If exists
    });
  } catch (err) {
    console.error("Get tenant details error:", err);
    res.status(500).json({ error: "Failed to fetch company details" });
  }
};

/* ----------------------------------------------------
   GET SINGLE PUBLIC JOB (BY ID)
---------------------------------------------------- */
exports.getPublicJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId } = req.query;

    if (!id || !tenantId || tenantId === 'null' || tenantId === 'undefined') {
      return res.status(400).json({ error: "Valid Job ID and Tenant ID are required" });
    }

    const getTenantDB = require('../utils/tenantDB');
    const tenantDB = await getTenantDB(tenantId);
    const Requirement = tenantDB.model("Requirement");

    const job = await Requirement.findOne({ _id: id })
      .select('jobTitle department vacancy status description jobVisibility minExperienceMonths maxExperienceMonths salaryMin salaryMax jobType workMode publicFields customFields');

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (err) {
    console.error("Get single job error:", err);
    res.status(500).json({ error: "Failed to fetch job details" });
  }
};

/* ----------------------------------------------------
   APPLY FOR JOB (PUBLIC)
---------------------------------------------------- */
exports.applyJob = [
  upload.single('resume'),
  async (req, res) => {
    try {
      console.log(`📝 [APPLY_JOB] Request body:`, req.body);
      console.log(`📝 [APPLY_JOB] Headers:`, req.headers);
      console.log(`📝 [APPLY_JOB] File:`, req.file);

      let {
        tenantId,
        requirementId,
        name,
        fatherName,
        email,
        mobile,
        experience,
        address,
        location,
        currentCompany,
        currentDesignation,
        expectedCTC,
        linkedin,
        dob // Added Date of Birth
      } = req.body;

      // Robustly resolve tenantId (Frontend sends it in headers mostly)
      if (!tenantId) {
        tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
      }

      if (!tenantId || tenantId === 'null' || tenantId === 'undefined' || !requirementId || !name || !email) {
        console.warn(`[APPLY_JOB] Validation failed. tenantId: ${tenantId}, requirementId: ${requirementId}, name: ${name}, email: ${email}`);
        return res.status(400).json({
          error: "Valid tenantId, requirementId, name, and email are required"
        });
      }

      // 0. Manual Token Check for Candidate (since this is a public route handle)
      let candidateId = req.user?.id || null;
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (!candidateId && authHeader) {
        try {
          const jwt = require('jsonwebtoken');
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "hrms_secret_key_123");
          candidateId = decoded.id;
        } catch (e) {
          console.warn("[APPLY_JOB] Token verification failed internally:", e.message);
        }
      }

      const tenantDB = await getTenantDB(tenantId);
      const Applicant = tenantDB.models.Applicant || tenantDB.model("Applicant", ApplicantSchema);
      const Requirement = tenantDB.model("Requirement");

      const requirement = await Requirement.findById(requirementId);
      if (!requirement)
        return res.status(404).json({ error: "Requirement not found" });

      const exists = await Applicant.findOne({
        requirementId,
        email: email.toLowerCase()
      });

      if (exists)
        return res.status(409).json({
          error: "You have already applied for this job"
        });

      const resumeFilename = req.file?.filename || null;

      // Create new applicant
      const applicant = new Applicant({
        tenant: tenantDB.tenantId,
        candidateId: candidateId, // Link to candidate account
        requirementId,
        name: name.trim(),
        fatherName: fatherName?.trim(),
        email: email.toLowerCase().trim(),
        mobile: mobile?.trim() || 'N/A', // Provide default if not provided
        experience: experience?.trim(),
        address: address?.trim(),
        location: location?.trim(),
        currentCompany: currentCompany?.trim(),
        currentDesignation: currentDesignation?.trim(),
        expectedCTC: expectedCTC?.trim(),
        linkedin: linkedin?.trim(),
        dob: dob || null, // Allow DOB to be saved
        resume: resumeFilename,
        status: 'Applied',
        timeline: [{
          status: 'Applied',
          message: 'Your application has been received and is under review.',
          updatedBy: 'Candidate',
          timestamp: new Date()
        }]
      });

      await applicant.save();

      // --- SYNC TO CANDIDATE PROFILE ---
      if (candidateId) {
        try {
          const Candidate = tenantDB.model("Candidate");
          await Candidate.findByIdAndUpdate(candidateId, {
            mobile: mobile?.trim(),
            fatherName: fatherName?.trim(),
            address: address?.trim(),
            dob: dob || null,
            resume: resumeFilename || undefined, // Only update if new file uploaded
            updatedAt: new Date()
          });
          console.log(`✅ [APPLY_JOB] Candidate profile synced for ${candidateId}`);
        } catch (syncErr) {
          console.error("⚠️ [APPLY_JOB] Failed to sync profile:", syncErr.message);
        }
      }

      // --- SEND EMAIL NOTIFICATION (DYNAMIC) ---
      // --- SEND EMAIL NOTIFICATIONS ---
      try {
        console.log(`📧 [APPLY_JOB] Initiating emails...`);

        // 1. Fetch Company Profile for Name & Email
        try {
          const CompanyProfileSchema = require('../models/CompanyProfile');
          const CompanyProfile = tenantDB.models.CompanyProfile || tenantDB.model("CompanyProfile", CompanyProfileSchema);
          const companyProfile = await CompanyProfile.findOne({ tenantId });

          const companyName = companyProfile?.companyName || "Our Company";
          const companyEmail = companyProfile?.contactEmail; // If null, we might skip company email or use a fallback

          // 2. Email to Candidate
          if (EmailService && EmailService.sendCandidateAppliedEmail) {
            try {
              await EmailService.sendCandidateAppliedEmail(
                applicant.email,
                applicant.name,
                requirement.jobTitle,
                companyName
              );
              console.log(`✅ [APPLY_JOB] Notification sent to candidate: ${applicant.email}`);
            } catch (candidateEmailErr) {
              console.warn(`⚠️ [APPLY_JOB] Failed to send candidate email:`, candidateEmailErr.message);
            }
          }

          // 3. Email to Company (if email exists)
          if (companyEmail && EmailService && EmailService.sendCompanyNewApplicationEmail) {
            try {
              await EmailService.sendCompanyNewApplicationEmail(
                companyEmail,
                applicant.name,
                requirement.jobTitle,
                applicant._id
              );
              console.log(`✅ [APPLY_JOB] Notification sent to company: ${companyEmail}`);
            } catch (companyEmailErr) {
              console.warn(`⚠️ [APPLY_JOB] Failed to send company email:`, companyEmailErr.message);
            }
          } else {
            console.warn(`⚠️ [APPLY_JOB] No company contact email found for tenant ${tenantId}. Skipping company notification.`);
          }
        } catch (companyProfileErr) {
          console.warn(`⚠️ [APPLY_JOB] Failed to get company profile:`, companyProfileErr.message);
        }
      } catch (emailError) {
        console.error("⚠️ [APPLY_JOB] Email service error:", emailError.message);
      }

      res.status(201).json({
        message: "Application submitted successfully",
        applicantId: applicant._id
      });
    } catch (err) {
      console.error("❌ [APPLY_JOB] Apply job error:", err);
      console.error("Stack trace:", err.stack);
      res.status(500).json({ error: "Failed to submit application", details: err.message });
    }
  }
];

exports.getCareerCustomization = async (req, res) => {
  try {
    const { tenantId: identifier } = req.params;
    if (!identifier) return res.status(400).json({ error: "Tenant ID required" });

    // Prevent Caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    let tenant;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      tenant = await Tenant.findById(identifier);
    } else {
      tenant = await Tenant.findOne({ code: identifier });
    }

    if (!tenant) return res.status(404).json({ error: "Company not found" });

    // Look into Tenant DB for customization saved via Career Builder
    const tenantDB = await getTenantDB(tenant._id);
    const CompanyProfileSchema = require('../models/CompanyProfile');
    const CompanyProfile = tenantDB.models.CompanyProfile || tenantDB.model("CompanyProfile", CompanyProfileSchema);

    const profile = await CompanyProfile.findOne({});
    const customization = profile?.meta?.careerCustomization || tenant.meta?.careerCustomization || null;

    res.json(customization);
  } catch (err) {
    console.error("Get career customization error:", err);
    res.status(500).json({ error: "Failed to fetch career customization" });
  }
};
