const ApplicantSchema = require('../models/Applicant');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const getTenantDB = require('../utils/tenantDB');
const EmailService = require('../services/email.service');
const ResumeParserService = require('../services/ResumeParser.service');

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
      .select('jobTitle department vacancy createdAt publishedAt tenant visibility employmentType location minExperienceMonths maxExperienceMonths description')
      .sort({ createdAt: -1 });

    console.log(`✅ [GET_PUBLIC_JOBS] Found ${jobs.length} jobs for ${tenant.name}. IDs: ${jobs.map(j => j._id).join(', ')}`);
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

    let tenant;
    if (mongoose.Types.ObjectId.isValid(companyCode)) {
      tenant = await Tenant.findById(companyCode);
    } else {
      tenant = await Tenant.findOne({ code: companyCode });
    }

    if (!tenant) {
      console.warn(`❌ [GET_JOBS_BY_CODE] Tenant not found for identifier: ${companyCode}`);
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
      .select('jobTitle department vacancy createdAt publishedAt tenant visibility employmentType location minExperienceMonths maxExperienceMonths description')
      .sort({ createdAt: -1 });

    console.log(`✅ [GET_JOBS_BY_CODE] Found ${jobs.length} jobs for ${tenant.name}. IDs: ${jobs.map(j => j._id).join(', ')}`);
    res.json(jobs);
  } catch (err) {
    console.error("❌ [GET_JOBS_BY_CODE] Error:", err.message);
    res.status(500).json({ error: "Failed to fetch jobs: " + err.message });
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
      .select('jobTitle department vacancy status description jobVisibility minExperienceMonths maxExperienceMonths salaryMin salaryMax jobType workMode publicFields customFields createdAt publishedAt');

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

      // 1. Resolve Parameters
      let {
        tenantId, requirementId, name, fatherName, email, mobile, experience,
        address, location, currentCompany, currentDesignation, expectedCTC, linkedin, dob,
        // Reference fields
        references, isFresher, noReferenceReason
      } = req.body;

      // Robustly resolve tenantId
      if (!tenantId || tenantId === 'null' || tenantId === 'undefined') {
        tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
      }

      if (!tenantId || !requirementId) {
        return res.status(400).json({ error: "Missing Tenant ID or Requirement ID" });
      }

      // 2. Fetch Job Context (Tenant DB)
      const tenantDB = await getTenantDB(tenantId);
      const Requirement = tenantDB.model("Requirement");
      const requirement = await Requirement.findById(requirementId);

      if (!requirement) return res.status(404).json({ error: "Job Requirement not found" });

      // 3. Parse Resume with AI (Pass Job Context)
      let parseResult = { rawText: "", structuredData: {} };
      if (req.file) {
        try {
          console.log(`🤖 [APPLY_JOB] Parsing Resume for Match Analysis (Job: ${requirement.jobTitle})...`);
          parseResult = await ResumeParserService.parseResume(
            req.file.path,
            req.file.mimetype,
            requirement.description || "",
            requirement.jobTitle || ""
          );
        } catch (parseErr) {
          console.error("⚠️ [APPLY_JOB] Parsing Failed:", parseErr.message);
        }
      }
      const { rawText, structuredData } = parseResult;

      // 4. Merge Data
      if (!name && structuredData.fullName) name = structuredData.fullName;
      if (!email && structuredData.email) email = structuredData.email;
      if (!mobile && structuredData.phone) mobile = structuredData.phone;
      if (!experience && structuredData.totalExperience) experience = structuredData.totalExperience;
      if (!currentCompany && structuredData.currentCompany) currentCompany = structuredData.currentCompany;

      // 5. Identify Candidate (Auth)
      let candidateId = req.user?.id || null;
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (!candidateId && authHeader) {
        try {
          const jwt = require('jsonwebtoken');
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "hrms_secret_key_123");
          candidateId = decoded.id;
        } catch (e) {
          console.warn("[APPLY_JOB] Token verification failed:", e.message);
        }
      }

      const Applicant = tenantDB.models.Applicant || tenantDB.model("Applicant", ApplicantSchema);

      const exists = await Applicant.findOne({
        requirementId,
        email: email.toLowerCase()
      });

      if (exists)
        return res.status(409).json({
          error: "You have already applied for this job"
        });

      const resumeFilename = req.file?.filename || null;

      // --- COLLECT DYNAMIC FIELDS ---
      const standardFields = ['tenantId', 'requirementId', 'name', 'fatherName', 'email', 'mobile', 'experience', 'address', 'location', 'currentCompany', 'currentDesignation', 'expectedCTC', 'linkedin', 'dob', 'resume', 'consent'];
      const customData = {};

      Object.keys(req.body).forEach(key => {
        if (!standardFields.includes(key)) {
          customData[key] = req.body[key];
        }
      });

      // --- DOB FORMATTING (BACKEND ROBUSTNESS) ---
      let parsedDob = dob;
      if (dob && typeof dob === 'string' && dob.includes('/')) {
        try {
          const [d, m, y] = dob.split('/');
          if (d && m && y && y.length === 4) {
            parsedDob = new Date(`${y}-${m}-${d}`);
          }
        } catch (e) {
          console.warn("⚠️ [APPLY_JOB] Date parsing failed:", dob);
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // REFERENCE VALIDATION
      // ═══════════════════════════════════════════════════════════════════
      let validatedReferences = [];
      const familyRelationships = ['father', 'mother', 'brother', 'sister', 'spouse', 'wife', 'husband', 'son', 'daughter', 'uncle', 'aunt', 'cousin', 'relative'];

      // Parse references if sent as string (Multipart FormData often sends JSON as string)
      if (references && typeof references === 'string') {
        try {
          references = JSON.parse(references);
        } catch (e) {
          console.warn("⚠️ [APPLY_JOB] Failed to parse references JSON:", e.message);
        }
      }

      // Ensure references is an array
      if (!Array.isArray(references)) {
        references = references ? [references] : [];
      }

      // Convert isFresher to boolean
      const isFresherBool = isFresher === true || isFresher === 'true';

      // Validate references (required unless fresher)
      if (!isFresherBool) {
        if (!references || references.length === 0) {
          return res.status(400).json({
            error: 'Professional reference required',
            details: 'Please provide at least 1 professional reference or check the fresher option'
          });
        }

        if (references.length > 2) {
          return res.status(400).json({
            error: 'Too many references',
            details: 'Maximum 2 references allowed'
          });
        }

        // Validate each reference
        const seenEmails = new Set();
        const seenPhones = new Set();

        for (let i = 0; i < references.length; i++) {
          const ref = references[i];

          // Required fields check
          if (!ref.name || !ref.designation || !ref.company || !ref.relationship || !ref.email || !ref.phone) {
            return res.status(400).json({
              error: `Reference ${i + 1}: All fields are required`,
              details: 'Name, Designation, Company, Relationship, Email, and Phone are mandatory'
            });
          }

          // Block family relationships
          const relationshipLower = ref.relationship.toLowerCase();
          const nameAndRelationship = `${ref.name.toLowerCase()} ${relationshipLower}`;

          if (familyRelationships.some(family => relationshipLower.includes(family) || nameAndRelationship.includes(family))) {
            return res.status(400).json({
              error: `Reference ${i + 1}: Family references not allowed`,
              details: 'Please provide professional references only. Family members cannot be used as references.'
            });
          }

          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(ref.email)) {
            return res.status(400).json({
              error: `Reference ${i + 1}: Invalid email format`,
              details: `Email "${ref.email}" is not valid`
            });
          }

          // Phone validation
          const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
          if (!phoneRegex.test(ref.phone)) {
            return res.status(400).json({
              error: `Reference ${i + 1}: Invalid phone format`,
              details: 'Phone number must be 10-15 digits'
            });
          }

          // Check for duplicate email/phone in same application
          const emailLower = ref.email.toLowerCase();
          const phoneTrimmed = ref.phone.trim();

          if (seenEmails.has(emailLower)) {
            return res.status(400).json({
              error: `Reference ${i + 1}: Duplicate email`,
              details: 'Each reference must have a unique email address'
            });
          }
          if (seenPhones.has(phoneTrimmed)) {
            return res.status(400).json({
              error: `Reference ${i + 1}: Duplicate phone`,
              details: 'Each reference must have a unique phone number'
            });
          }

          seenEmails.add(emailLower);
          seenPhones.add(phoneTrimmed);

          // Build validated reference object
          validatedReferences.push({
            name: ref.name.trim(),
            designation: ref.designation.trim(),
            company: ref.company.trim(),
            relationship: ref.relationship,
            email: emailLower,
            phone: phoneTrimmed,
            yearsKnown: ref.yearsKnown || null,
            consentToContact: ref.consentToContact !== false,
            verificationStatus: 'Pending'
          });
        }

        console.log(`✅ [APPLY_JOB] ${validatedReferences.length} reference(s) validated successfully`);
      } else {
        console.log(`ℹ️ [APPLY_JOB] Fresher application - no references required`);
      }


      // ═══════════════════════════════════════════════════════════════════
      // MATCHING ENGINE (RE-CALCULATE SCORE IF NOT ALREADY DONE)
      // ═══════════════════════════════════════════════════════════════════
      let matchResult = { totalScore: 0, breakdown: {}, matchedSkills: [], missingSkills: [] };
      if (req.file && structuredData) {
        try {
          const MatchingEngine = require('../services/MatchingEngine.service');
          matchResult = await MatchingEngine.calculateMatchScore(requirement, structuredData);
          console.log(`✅ [APPLY_JOB] Match Score Calculated: ${matchResult.totalScore}%`);
        } catch (matchErr) {
          console.error("❌ [APPLY_JOB] Matching calculation failed:", matchErr.message);
        }
      }

      // Create new applicant
      // Default to 'Applied' if no pipeline is defined, else use first stage from requirement
      const defaultStatus = (requirement.pipelineStages && requirement.pipelineStages.length > 0)
        ? requirement.pipelineStages[0].stageName
        : 'Applied';

      const applicant = new Applicant({
        tenant: tenantDB.tenantId,
        candidateId: candidateId,
        requirementId,
        name: name?.trim() || structuredData.fullName || "Unknown",
        fatherName: fatherName?.trim(),
        email: email?.toLowerCase().trim() || structuredData.email || "unknown@email.com",
        mobile: mobile?.trim() || structuredData.phone || "N/A",
        experience: experience?.trim() || structuredData.totalExperience || "",
        address: address?.trim(),
        location: location?.trim(),
        currentCompany: currentCompany?.trim(),
        currentDesignation: currentDesignation?.trim(),
        expectedCTC: expectedCTC?.trim(),
        linkedin: linkedin?.trim(),
        dob: parsedDob || null,
        resume: req.file?.filename,
        customData: customData,
        status: defaultStatus,
        timeline: [{
          status: defaultStatus,
          message: `Application received for "${requirement.jobTitle}". Initial stage: ${defaultStatus}`,
          updatedBy: 'Candidate (Portal)',
          timestamp: new Date()
        }],

        // PIPELINE STAGE INITIALIZATION
        currentStage: (requirement.pipelineStages && requirement.pipelineStages.length > 0) ? {
          stageId: '0',
          stageName: requirement.pipelineStages[0].stageName,
          stageType: requirement.pipelineStages[0].stageType,
          enteredAt: new Date(),
          assignedInterviewer: requirement.pipelineStages[0].assignedInterviewer || null
        } : {
          stageId: '0',
          stageName: 'Applied',
          stageType: 'Screening',
          enteredAt: new Date()
        },

        pipelineProgress: (requirement.pipelineStages && requirement.pipelineStages.length > 0)
          ? requirement.pipelineStages.map((stage, index) => ({
            stageId: String(index),
            stageName: stage.stageName,
            stageType: stage.stageType,
            status: index === 0 ? 'In Progress' : 'Pending',
            assignedInterviewer: stage.assignedInterviewer || null,
            enteredAt: index === 0 ? new Date() : null
          }))
          : [{
            stageId: '0',
            stageName: 'Applied',
            stageType: 'Screening',
            status: 'In Progress',
            enteredAt: new Date()
          }],

        // AI & MATCHING FIELDS
        rawOCRText: rawText,
        aiParsedData: structuredData,
        matchScore: matchResult.totalScore,
        matchBreakdown: matchResult.breakdown,
        matchedSkills: matchResult.matchedSkills,
        missingSkills: matchResult.missingSkills,
        parsingStatus: rawText ? 'Completed' : 'Pending',

        references: validatedReferences,
        isFresher: isFresherBool,
        noReferenceReason: noReferenceReason || (isFresherBool ? 'Fresher - No Work Experience' : null)
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

    // 1. Attempt Check Optimized Published Page (New System - Central DB)
    const PublishedCareerPage = require('../models/PublishedCareerPage');
    const publishedPage = await PublishedCareerPage.findOne({ tenantId: tenant._id.toString() }).lean();

    // 2. Look into Tenant DB for legacy customization (Apply Page Builder data)
    const tenantDB = await getTenantDB(tenant._id);
    const CompanyProfileSchema = require('../models/CompanyProfile');
    const CompanyProfile = tenantDB.models.CompanyProfile || tenantDB.model("CompanyProfile", CompanyProfileSchema);
    const profile = await CompanyProfile.findOne({}).lean();

    const legacyCustomization = profile?.meta?.careerCustomization || tenant.meta?.careerCustomization || null;

    // Merge Logic: Prioritize the latest 'applyPage' and 'theme' from Published Page
    let finalCustomization = { ...legacyCustomization };

    if (publishedPage) {
      // 1. Theme Sync
      if (publishedPage.theme) {
        finalCustomization.theme = publishedPage.theme;
      }
      // 2. Apply Page Sync (The crucial part!)
      if (publishedPage.applyPage && Object.keys(publishedPage.applyPage).length > 0) {
        finalCustomization.applyPage = publishedPage.applyPage;
      }
      // 3. SEO Settings Sync
      if (publishedPage.seo) {
        finalCustomization.seoSettings = {
          seo_title: publishedPage.seo.title,
          seo_description: publishedPage.seo.description,
          seo_keywords: publishedPage.seo.keywords,
          seoSlug: publishedPage.seo.slug
        };
      }
    }

    // Return null ONLY if both sources are completely empty
    if (!legacyCustomization && (!publishedPage || !publishedPage.applyPage)) {
      // Check if we still have at least a theme to return
      if (finalCustomization.theme) return res.json(finalCustomization);
      return res.json(null);
    }

    res.json(finalCustomization);
  } catch (err) {
    console.error("Get career customization error:", err);
    res.status(500).json({ error: "Failed to fetch career customization" });
  }
};

/* ----------------------------------------------------
   PARSE RESUME (PUBLIC - PRE-FILL)
---------------------------------------------------- */
exports.parseResumePublic = [
  upload.single('resume'),
  async (req, res) => {
    try {
      const { requirementId } = req.body;
      console.log(`🤖 [PARSE_RESUME_PUBLIC] Parsing...`);

      let jobDescription = "";
      let jobTitle = "";

      if (requirementId) {
        const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
        if (tenantId) {
          try {
            const tenantDB = await getTenantDB(tenantId);
            const Requirement = tenantDB.model('Requirement');
            const reqDoc = await Requirement.findById(requirementId).select('jobTitle description');
            if (reqDoc) {
              jobTitle = reqDoc.jobTitle;
              jobDescription = reqDoc.description;
            }
          } catch (e) { }
        }
      }

      if (!req.file) return res.status(400).json({ error: "No resume file uploaded" });

      const result = await ResumeParserService.parseResume(req.file.path, req.file.mimetype, jobDescription, jobTitle);

      // Cleanup temp file
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch (e) { }

      res.json({
        success: true,
        data: result.structuredData,
        rawText: result.rawText
      });

    } catch (err) {
      console.error("❌ [PARSE_RESUME_PUBLIC] Error:", err.message);
      res.status(500).json({ error: "Failed to parse resume" });
    }
  }
];
