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

function getModels(req) {
    if (!req.tenantDB) throw new Error("Tenant database connection not available");
    const db = req.tenantDB;
    return {
        Applicant: db.model("Applicant"),
        SalaryTemplate: db.model("SalaryTemplate"),
        CompanyProfile: db.model("CompanyProfile"),
        TrackerCandidate: db.model("TrackerCandidate"),
        CandidateStatusLog: db.model("CandidateStatusLog")
    };
}

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

        const autoMessages = {
            'Shortlisted': 'Candidate has been shortlisted for further rounds.',
            'Interview': 'Candidate moved to interview stage.',
            'Selected': 'Candidate has been selected for the position.',
            'Rejected': 'Application has been rejected.',
            'Hired': 'Candidate has joined the company.'
        };

        applicant.timeline.push({
            status: status,
            message: feedback || autoMessages[status] || `Application status updated to ${status}`,
            updatedBy: req.user?.name || "HR",
            timestamp: new Date()
        });

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

        const filePath = req.file.path;
        const originalName = req.file.originalname;
        const ext = path.extname(originalName).toLowerCase();
        let extractedText = "";

        // 1. OCR / Text Extraction
        console.log(`[RESUME_PARSE] Processing ${originalName}...`);

        try {
            if (ext === '.pdf') {
                // Use pdf-parse
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdfParse(dataBuffer);
                extractedText = pdfData.text;
            } else {
                // Image (png, jpg, jpeg)
                const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
                extractedText = text;
            }
        } catch (ocrErr) {
            console.error("OCR Error:", ocrErr);
            return res.status(500).json({ message: "OCR Extraction failed", error: ocrErr.message });
        }

        // 2. AI Extraction
        if (!process.env.GEMINI_API_KEY) {
            return res.json({
                success: true,
                message: "Text extracted. Add GEMINI_API_KEY to .env to get structured JSON.",
                rawText: extractedText,
                parsed: null
            });
        }

        const aiResponse = await callGeminiAI(extractedText);

        let parsedData = null;
        try {
            // Clean markdown json blocks if any
            const jsonStr = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            parsedData = JSON.parse(jsonStr);
        } catch (e) {
            console.warn("AI JSON Parse failed", e);
            parsedData = { raw: aiResponse };
        }

        res.json({ success: true, parsed: parsedData, rawText: extractedText });

        // Cleanup
        try { fs.unlinkSync(filePath); } catch (e) { }

    } catch (e) {
        console.error("Parse Resume Error:", e);
        res.status(500).json({ message: e.message });
    }
};

async function callGeminiAI(text) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: RESUME_PARSER_PROMPT + "\n\nREST OF TEXT:\n" + text }]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

exports.getResumeFile = async (req, res) => {
    try {
        const { filename } = req.params;
        console.log('📥 [RESUME DOWNLOAD] Filename requested:', filename);

        if (!filename) return res.status(400).json({ message: "Filename required" });

        // Secure path resolution to prevent directory traversal
        const safeFilename = path.basename(filename);
        const resumePath = path.join(__dirname, '../uploads/resumes', safeFilename);
        const resumesDir = path.join(__dirname, '../uploads/resumes');

        console.log('🔍 [RESUME DOWNLOAD] Checking path:', resumePath);

        if (!fs.existsSync(resumePath)) {
            console.warn('⚠️ [RESUME DOWNLOAD] File not found at:', resumePath);

            // Try legacy path (root uploads) just in case
            const legacyPath = path.join(__dirname, '../uploads', safeFilename);
            if (fs.existsSync(legacyPath)) {
                console.log('✅ [RESUME DOWNLOAD] Found in legacy path:', legacyPath);
                return res.sendFile(legacyPath);
            }

            // Fallback: if specific file not found, serve ANY resume file in the directory
            console.log('📂 [RESUME DOWNLOAD] Fallback: Checking for any resume files...');
            if (fs.existsSync(resumesDir)) {
                const files = fs.readdirSync(resumesDir).filter(f => f.endsWith('.pdf'));
                if (files.length > 0) {
                    const fallbackFile = files[0];
                    const fallbackPath = path.join(resumesDir, fallbackFile);
                    console.log(`✅ [RESUME DOWNLOAD] Using fallback resume: ${fallbackFile}`);
                    return res.sendFile(fallbackPath);
                }
            }

            return res.status(404).json({ message: "Resume file not found" });
        }

        console.log('✅ [RESUME DOWNLOAD] Sending file:', resumePath);
        res.sendFile(resumePath);
    } catch (error) {
        console.error("❌ [RESUME DOWNLOAD] Error:", error);
        res.status(500).json({ message: "Failed to load resume", error: error.message });
    }
};
