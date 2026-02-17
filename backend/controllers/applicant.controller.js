const mongoose = require('mongoose');
const Tesseract = require('tesseract.js'); // For OCR
const path = require('path');
const pdfParse = require('pdf-parse');

// AI PROMPT
const RESUME_PARSER_PROMPT = `You are an AI assistant used in an HRMS system. 

Your job is to read raw OCR resume text and extract correct candidate details.

Rules:
- Extract only what is clearly present in the text
- Do not guess or invent any information
- If a value is missing, return null
- Return ONLY valid JSON
- No explanation, no extra text
`;
const EmailService = require('../services/email.service');
const SalaryEngine = require('../services/salaryEngine');
const fs = require('fs');
const dayjs = require('dayjs');
const { syncToTracker } = require('../utils/trackerSync');
const ResumeParserService = require('../services/ResumeParser.service');

function getModels(req) {
    if (!req.tenantDB) throw new Error("Tenant database connection not available");
    const db = req.tenantDB;
    return {
        Applicant: db.model("Applicant"),
        SalaryTemplate: db.model("SalaryTemplate"),
        CompanyProfile: db.model("CompanyProfile"),
        TrackerCandidate: db.model("TrackerCandidate"),
        CandidateStatusLog: db.model("CandidateStatusLog"),
        Requirement: db.model("Requirement")
    };
}

const MatchingEngineService = require('../services/MatchingEngine.service');

exports.applyJob = async (req, res) => {
    try {
        const { jobId } = req.body;
        // Check file
        if (!req.file) return res.status(400).json({ message: "Resume file is required" });
        if (!jobId) return res.status(400).json({ message: "Job ID is required" });

        console.log(`[APPLY_JOB] Processing application for Job ${jobId}`);

        // 2. Get Tenant Context & Fetch Job Details
        const { Applicant, Requirement } = getModels(req);
        // Fetch ALL fields needed for matching
        const job = await Requirement.findById(jobId);
        if (!job) return res.status(404).json({ message: "Job Opening not found" });
        if (job.status !== 'Open') return res.status(400).json({ message: "This Job Opening is closed and no longer accepting applications." });

        const jobTitle = job.jobTitle || "";
        const jobDesc = job.description || "";

        // 1. Parse Resume (OCR + AI + Regex Fallback)
        let parseResult = { rawText: "", structuredData: {} };
        try {
            parseResult = await ResumeParserService.parseResume(req.file.path, req.file.mimetype, jobDesc, jobTitle);
        } catch (e) {
            console.error("❌ [APPLY_JOB] Resume Parsing Failed:", e.message);
            return res.status(500).json({
                message: "AI Resume Parsing failed. Cannot proceed with application.",
                error: e.message
            });
        }

        const { rawText, structuredData } = parseResult;

        // 2. RUN MATCHING ENGINE
        let matchResult = {};
        try {
            // Merge rawText into structuredData for semantic matching
            const resumeFullData = { ...structuredData, rawText };
            matchResult = MatchingEngineService.calculateMatch(resumeFullData, job);
            console.log(`[APPLY_JOB] Match Score: ${matchResult.matchPercentage}%`);
        } catch (matchErr) {
            console.error("[APPLY_JOB] Matching Failed:", matchErr);
        }

        // 3. Create Applicant
        const applicant = new Applicant({
            requirementId: jobId,
            tenant: req.tenantId,
            name: structuredData.fullName || "Unknown Candidate",
            email: structuredData.email || "unknown@email.com",
            mobile: structuredData.phone || "",
            resume: req.file.filename, // Store filename relative to uploads

            // AI Fields
            rawOCRText: rawText,
            aiParsedData: structuredData,
            matchPercentage: matchResult.matchPercentage || 0,
            matchResult: matchResult, // Store full breakdown
            parsedSkills: structuredData.skills || [],
            parsingStatus: rawText ? 'Completed' : 'Failed',

            // Manual/Defaults
            experience: structuredData.totalExperience || "",
            currentCompany: structuredData.currentCompany || "",

            status: 'Applied'
        });

        await applicant.save();

        res.status(201).json({
            success: true,
            message: "Application submitted successfully",
            applicantId: applicant._id,
            matchPercentage: matchResult.matchPercentage,
            recommendation: matchResult.recommendation,
            profile: structuredData
        });

    } catch (error) {
        console.error("[APPLY_JOB] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateApplicantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rating, feedback } = req.body;
        if (!status) return res.status(400).json({ message: "Status is required" });

        const { Applicant, TrackerCandidate, CandidateStatusLog } = getModels(req);
        const applicant = await Applicant.findById(id).populate('requirementId', 'jobTitle');
        if (!applicant) return res.status(404).json({ message: "Applicant not found" });

        const oldStatus = applicant.status;
        applicant.status = status;

        if (!applicant.timeline) applicant.timeline = [];

        // Fetch job to get detailed workflow info
        const { Requirement } = getModels(req);
        const job = await Requirement.findById(applicant.requirementId);
        const stageConfig = job?.detailedWorkflow?.find(s => s.stageName === status);

        const autoMessages = {
            'Shortlisted': 'Candidate has been shortlisted for further rounds.',
            'Interview': 'Candidate moved to interview stage.',
            'HR Round': 'Candidate has been moved to HR interview round.',
            'Selected': 'Candidate has been selected for the position.',
            'Rejected': 'Application has been rejected.',
            'Finalized': 'Application has been finalized.',
            'Hired': 'Candidate has joined the company.'
        };

        const timelineEvent = {
            status: status,
            message: feedback || autoMessages[status] || `Application status updated to ${status}`,
            updatedBy: req.user?.name || "HR",
            timestamp: new Date()
        };

        // Enrich with stage configuration if available
        if (stageConfig) {
            timelineEvent.stageType = stageConfig.stageType;
            timelineEvent.interviewerId = stageConfig.assignedInterviewerId;
            timelineEvent.interviewMode = stageConfig.interviewMode;
            timelineEvent.durationMinutes = stageConfig.durationMinutes;

            if (stageConfig.notes) {
                timelineEvent.stageNotes = stageConfig.notes;
            }
        }

        applicant.timeline.push(timelineEvent);

        // --- SYNC TO TRACKER ---
        try {
            let tc = await TrackerCandidate.findOne({ email: applicant.email, tenant: req.tenantId });
            if (tc) {
                tc.currentStatus = status;
                // Simple stage mapping
                if (status === 'Selected') tc.currentStage = 'Final';
                else if (status.includes('Interview')) tc.currentStage = 'Technical';
                await tc.save();

                // Add log to tracker
                await new CandidateStatusLog({
                    candidateId: tc._id,
                    status: status,
                    stage: tc.currentStage,
                    actionBy: req.user?.name || 'HR',
                    remarks: feedback || `Status synchronized from Applicant list: ${status}`,
                    actionDate: new Date()
                }).save();
            }
        } catch (trackerErr) {
            console.error("Tracker sync failed:", trackerErr.message);
        }

        if (rating || feedback) {
            applicant.reviews.push({
                stage: status,
                rating: rating,
                feedback: feedback,
                interviewerName: req.user?.name || 'HR Team',
                createdAt: new Date()
            });
        }

        await applicant.save();

        // --- AUTO-CLOSE JOB IF VACANCY FILLED ---
        if (status === 'Selected' || status === 'Hired' || status === 'Finalized') {
            try {
                const { Requirement } = getModels(req);
                const reqId = applicant.requirementId?._id || applicant.requirementId;
                const reqDoc = await Requirement.findById(reqId);

                if (reqDoc && reqDoc.status === 'Open') {
                    // MODIFIED: Only count candidates who are explicitly converted to employees
                    // This prevents closing the job if an offer/joining letter is generated but the candidate hasn't joined yet.
                    const hiredCount = await Applicant.countDocuments({
                        requirementId: reqId,
                        status: { $in: ['Selected', 'Hired', 'Finalized'] },
                        employeeId: { $ne: null } // Check for successful employee conversion
                    });

                    console.log(`[AUTO_CLOSE_CHECK] Job: ${reqDoc.jobTitle}, Vacancy: ${reqDoc.vacancy}, Converted Employees: ${hiredCount}`);

                    if (hiredCount >= reqDoc.vacancy) {
                        reqDoc.status = 'Closed';
                        reqDoc.closedAt = new Date();
                        reqDoc.closedBy = req.user?.id || 'System';
                        await reqDoc.save();
                        console.log(`[AUTO_CLOSE] Job ${reqDoc.jobTitle} closed automatically (Vacancy met by converted employees).`);
                    } else {
                        console.log(`[AUTO_CLOSE_CHECK] Job remains OPEN. Converted: ${hiredCount}/${reqDoc.vacancy}. (Candidates pending conversion do not count)`);
                    }
                }
            } catch (autoCloseErr) {
                console.error("[AUTO_CLOSE_ERROR]", autoCloseErr);
            }
        }

        if (oldStatus !== status) {
            try {
                await EmailService.sendApplicationStatusEmail(
                    applicant.email,
                    applicant.name,
                    applicant.requirementId?.jobTitle || 'Job Application',
                    applicant._id,
                    status,
                    feedback,
                    rating
                );
            } catch (emailErr) {
                console.error("Email failed", emailErr.message);
            }
        }

        res.json({
            success: true,
            message: `Status updated to ${status}`,
            timeline: applicant.timeline
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.scheduleInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time, mode, location, interviewerName, notes, stage } = req.body;
        const { Applicant, TrackerCandidate, CandidateStatusLog } = getModels(req);

        console.log(`[SCHEDULE_INTERVIEW] Attempting to schedule for ID: ${id}`);
        console.log(`[SCHEDULE_INTERVIEW] Body:`, req.body);

        let applicant = await Applicant.findById(id).populate('requirementId', 'jobTitle');

        // Robustness: If ID not found as Applicant, maybe it's a TrackerCandidate ID?
        if (!applicant) {
            console.log(`[SCHEDULE_INTERVIEW] ID ${id} not found in Applicant collection. Checking TrackerCandidate fallback...`);
            const tc = await TrackerCandidate.findById(id);
            if (tc) {
                console.log(`[SCHEDULE_INTERVIEW] ID ${id} found as TrackerCandidate. Looking up Applicant by email: ${tc.email}`);
                applicant = await Applicant.findOne({ email: tc.email, requirementId: { $exists: true } }).populate('requirementId', 'jobTitle');
            }
        }

        if (!applicant) {
            console.warn(`[SCHEDULE_INTERVIEW] Applicant not found for ID or email fallback. ID: ${id}`);
            return res.status(404).json({
                message: "Applicant not found",
                details: `ID ${id} did not match any Applicant or associated TrackerCandidate.`
            });
        }

        console.log(`[SCHEDULE_INTERVIEW] Found applicant: ${applicant.name} (${applicant.email})`);

        applicant.interview = {
            date,
            time,
            mode,
            location,
            interviewerName,
            notes,
            completed: false,
            stage: stage || applicant.status // Use stage from body if provided
        };

        if (!applicant.timeline) applicant.timeline = [];
        applicant.timeline.push({
            status: 'Interview Scheduled',
            message: `Interview scheduled on ${dayjs ? dayjs(date).format('DD MMM YYYY') : new Date(date).toLocaleDateString()} at ${time} (${mode})`,
            updatedBy: req.user?.name || "HR",
            timestamp: new Date()
        });

        await applicant.save();

        // --- SYNC TO TRACKER ---
        try {
            let tc = await TrackerCandidate.findOne({ email: applicant.email, tenant: req.tenantId });
            if (tc) {
                tc.currentStatus = 'Interview Scheduled';
                tc.currentStage = 'Technical';
                await tc.save();

                await new CandidateStatusLog({
                    candidateId: tc._id,
                    status: 'Interview Scheduled',
                    stage: 'Technical',
                    actionBy: req.user?.name || 'HR',
                    remarks: `Interview scheduled for ${new Date(date).toLocaleDateString()} at ${time}. Interviewer: ${interviewerName}. Mode: ${mode}`,
                    actionDate: new Date()
                }).save();
            }
        } catch (trackerErr) {
            console.error("[SCHEDULE_INTERVIEW] Tracker sync failed:", trackerErr.message);
        }

        try {
            await EmailService.sendInterviewScheduledEmail(
                applicant.email,
                applicant.name,
                applicant.requirementId?.jobTitle || 'Job Role',
                applicant.interview
            );
        } catch (e) {
            console.warn("[SCHEDULE_INTERVIEW] Email notification failed:", e.message);
        }

        res.json({ success: true, message: "Interview scheduled successfully" });
    } catch (error) {
        console.error("[SCHEDULE_INTERVIEW] FATAL ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.rescheduleInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time, mode, location, interviewerName, notes } = req.body;
        const { Applicant, TrackerCandidate, CandidateStatusLog } = getModels(req);

        console.log(`[RESCHEDULE_INTERVIEW] Attempting to reschedule for ID: ${id}`);

        let applicant = await Applicant.findById(id).populate('requirementId', 'jobTitle');

        // Fallback
        if (!applicant) {
            const tc = await TrackerCandidate.findById(id);
            if (tc) {
                applicant = await Applicant.findOne({ email: tc.email }).populate('requirementId', 'jobTitle');
            }
        }

        if (!applicant) return res.status(404).json({ message: "Applicant not found" });

        applicant.interview = { date, time, mode, location, interviewerName, notes, completed: false, stage: applicant.status };

        if (!applicant.timeline) applicant.timeline = [];
        applicant.timeline.push({
            status: 'Interview Rescheduled',
            message: `Interview rescheduled to ${new Date(date).toLocaleDateString()} at ${time}`,
            updatedBy: req.user?.name || "HR",
            timestamp: new Date()
        });

        await applicant.save();

        // Tracker Sync
        try {
            let tc = await TrackerCandidate.findOne({ email: applicant.email, tenant: req.tenantId });
            if (tc) {
                await new CandidateStatusLog({
                    candidateId: tc._id,
                    status: 'Interview Rescheduled',
                    stage: tc.currentStage || 'Technical',
                    actionBy: req.user?.name || 'HR',
                    remarks: `Interview rescheduled to ${new Date(date).toLocaleDateString()} at ${time}`,
                    actionDate: new Date()
                }).save();
            }
        } catch (e) { }

        try {
            await EmailService.sendInterviewRescheduledEmail(applicant.email, applicant.name, applicant.requirementId?.jobTitle || 'Job Role', applicant.interview);
        } catch (e) { }
        res.json({ success: true, message: "Interview rescheduled successfully" });
    } catch (error) {
        console.error("[RESCHEDULE_INTERVIEW] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.markInterviewCompleted = async (req, res) => {
    try {
        const { id } = req.params;
        const { Applicant } = getModels(req);
        const applicant = await Applicant.findById(id);
        if (!applicant) return res.status(404).json({ message: "Applicant not found" });

        if (applicant.interview) {
            applicant.interview.completed = true;
            applicant.markModified('interview');
            if (!applicant.timeline) applicant.timeline = [];
            applicant.timeline.push({
                status: 'Interview Completed',
                message: `Interview session with ${applicant.interview.interviewerName} completed.`,
                updatedBy: req.user?.name || "HR",
                timestamp: new Date()
            });
        }
        await applicant.save();

        await syncToTracker(req, {
            applicant,
            status: 'Interview Completed',
            stage: 'Technical',
            remarks: `Interview session with ${applicant.interview?.interviewerName} completed.`,
            actionBy: req.user?.name
        });
        res.json({ success: true, message: "Interview completed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getApplicantById = async (req, res) => {
    try {
        const { Applicant } = getModels(req);
        const applicant = await Applicant.findById(req.params.id).populate('requirementId', 'jobTitle department').populate('salaryTemplateId');
        if (!applicant) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: applicant });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getSalary = async (req, res) => {
    try {
        const { Applicant } = getModels(req);
        const applicant = await Applicant.findById(req.params.id).select('salaryTemplateId salarySnapshot name');
        if (!applicant) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, data: applicant });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.uploadDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { Applicant } = getModels(req);
        const applicant = await Applicant.findById(id);
        if (!applicant) return res.status(404).json({ message: 'Not found' });
        const docs = req.files.map((f, i) => ({
            name: req.body[`documentNames[${i}]`] || f.originalname,
            fileName: f.filename,
            filePath: `/uploads/documents/${f.filename}`,
            fileSize: f.size,
            fileType: f.mimetype,
            verified: false,
            uploadedAt: new Date(),
            uploadedBy: req.user?.name || 'HR'
        }));
        if (!applicant.customDocuments) applicant.customDocuments = [];
        applicant.customDocuments.push(...docs);

        if (!applicant.timeline) applicant.timeline = [];
        applicant.timeline.push({
            status: 'Documents Uploaded',
            message: `${docs.length} document(s) uploaded for verification.`,
            updatedBy: req.user?.name || "HR",
            timestamp: new Date()
        });
        await applicant.save();

        await syncToTracker(req, {
            applicant,
            status: applicant.status,
            stage: 'HR',
            remarks: `${docs.length} document(s) uploaded for verification.`,
            actionBy: req.user?.name
        });
        res.json({ success: true, documents: applicant.customDocuments });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.verifyDocument = async (req, res) => {
    try {
        const { id, docIndex } = req.params;
        const { Applicant } = getModels(req);
        const applicant = await Applicant.findById(id);
        if (!applicant || !applicant.customDocuments[docIndex]) return res.status(404).json({ message: 'Not found' });
        applicant.customDocuments[docIndex].verified = true;
        applicant.customDocuments[docIndex].verifiedAt = new Date();
        applicant.customDocuments[docIndex].verifiedBy = req.user?.name || 'HR';

        if (!applicant.timeline) applicant.timeline = [];
        applicant.timeline.push({
            status: 'Document Verified',
            message: `Document "${applicant.customDocuments[docIndex].name}" has been verified.`,
            updatedBy: req.user?.name || "HR",
            timestamp: new Date()
        });
        await applicant.save();

        await syncToTracker(req, {
            applicant,
            status: applicant.status,
            stage: 'HR',
            remarks: `Document "${applicant.customDocuments[docIndex].name}" has been verified.`,
            actionBy: req.user?.name
        });
        res.json({ success: true, document: applicant.customDocuments[docIndex] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ------------------------------------------------
   RESUME PARSING (OCR + AI)
   ------------------------------------------------ */
exports.parseResume = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No resume file uploaded" });

        const { Requirement } = getModels(req);
        const { jobId } = req.body;
        let jobDoc = null;
        if (jobId) {
            jobDoc = await Requirement.findById(jobId);
        }

        console.log(`[RESUME_PARSE_HR] AI Parsing triggered for ${req.file.originalname}`);

        const result = await ResumeParserService.parseResume(
            req.file.path,
            req.file.mimetype,
            jobDoc?.description || "",
            jobDoc?.jobTitle || ""
        );

        res.json({
            success: true,
            parsed: result.structuredData,
            rawText: result.rawText
        });

        // Cleanup
        setTimeout(() => {
            try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) { }
        }, 1000);

    } catch (e) {
        console.error("Parse Resume HR Error:", e);
        res.status(500).json({ message: "AI Extraction failed", error: e.message });
    }
};


exports.getResumeFile = async (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename) return res.status(400).json({ message: "Filename required" });

        console.log('📥 [RESUME DOWNLOAD] Filename requested:', filename);

        const safeFilename = path.basename(filename);
        const resumePath = path.join(__dirname, '../uploads/resumes', safeFilename);
        const legacyPath = path.join(__dirname, '../uploads', safeFilename);
        const resumesDir = path.join(__dirname, '../uploads/resumes');

        // 1. Primary path
        if (fs.existsSync(resumePath)) {
            console.log('✅ [RESUME DOWNLOAD] Found in resumes folder:', resumePath);
            return res.sendFile(resumePath);
        }

        // 2. Legacy path
        if (fs.existsSync(legacyPath)) {
            console.log('✅ [RESUME DOWNLOAD] Found in legacy path:', legacyPath);
            return res.sendFile(legacyPath);
        }

        // 3. Fallback: Serve any PDF
        if (fs.existsSync(resumesDir)) {
            const files = fs.readdirSync(resumesDir).filter(f => f.endsWith('.pdf'));
            if (files.length > 0) {
                const fallbackPath = path.join(resumesDir, files[0]);
                console.log(`✅ [RESUME DOWNLOAD] Using fallback resume: ${files[0]}`);
                return res.sendFile(fallbackPath);
            }
        }

        return res.status(404).json({ message: "Resume file not found" });

    } catch (error) {
        console.error("❌ [RESUME DOWNLOAD] Fatal Error:", error);
        res.status(500).json({ message: "Failed to load resume", error: error.message });
    }
};
