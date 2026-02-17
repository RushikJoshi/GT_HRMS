// Update candidate profile
exports.updateCandidateProfile = async (req, res) => {
    try {
        const { id, tenantId } = req.candidate;
        const { name, email, phone, professionalTier } = req.body;
        const tenantDB = await getTenantDB(tenantId);
        const Candidate = tenantDB.model("Candidate");

        const update = {
            name,
            email,
            mobile: phone,
            professionalTier,
        };

        // If a new profile image was uploaded
        if (req.file) {
            update.profilePic = `uploads/profile-pics/${req.file.filename}`;
        }

        const candidate = await Candidate.findByIdAndUpdate(id, update, { new: true });
        if (!candidate) return res.status(404).json({ error: "Candidate not found" });

        res.json({ success: true, candidate });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: "Failed to update profile", details: err.message });
    }
};

// Get candidate profile
exports.getCandidateProfile = async (req, res) => {
    try {
        const { tenantId, id } = req.candidate;
        const tenantDB = await getTenantDB(tenantId);
        const Applicant = tenantDB.model("Applicant");
        const Candidate = tenantDB.model("Candidate");

        const candidate = await Candidate.findById(id).select('-password');
        if (!candidate) {
            return res.status(404).json({ error: "Candidate not found" });
        }

        const acceptedApp = await Applicant.findOne({
            candidateId: id,
            status: { $in: ['Offer Accepted', 'Joining Letter Issued', 'Hired'] }
        });

        // Find applications with letters
        const letterApp = await Applicant.findOne({
            candidateId: id,
            $or: [
                { offerLetterPath: { $exists: true, $ne: null, $ne: '' } },
                { joiningLetterPath: { $exists: true, $ne: null, $ne: '' } }
            ]
        }).sort({ updatedAt: -1 });

        res.json({
            name: candidate.name,
            email: candidate.email,
            phone: candidate.mobile,
            professionalTier: candidate.professionalTier || 'Technical Leader',
            bgvRequired: !!acceptedApp,
            bgvApplicationId: acceptedApp?._id,
            offerLetterUrl: letterApp?.offerLetterPath ? `/uploads/offers/${letterApp.offerLetterPath}` : null,
            joiningLetterUrl: letterApp?.joiningLetterPath ? `/uploads/${letterApp.joiningLetterPath}` : null,
            latestApplicationId: letterApp?._id,
            ...candidate.toObject()
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch profile", details: err.message });
    }
};
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getTenantDB = require('../utils/tenantDB');
const { getBGVModels } = require('../utils/bgvModels');
const path = require('path');
const fs = require('fs');

exports.registerCandidate = async (req, res) => {
    try {
        const { tenantId, name, email, password, mobile } = req.body;
        console.log('🔍 [CANDIDATE REGISTER] Request:', { tenantId, name, email, mobile });

        if (!tenantId || !name || !email || !password) {
            console.warn('❌ [CANDIDATE REGISTER] Missing fields');
            return res.status(400).json({ error: "All fields are required" });
        }

        const tenantDB = await getTenantDB(tenantId);
        console.log('✅ [CANDIDATE REGISTER] TenantDB obtained:', tenantDB.tenantId);

        // Get or create Candidate model directly with schema
        let Candidate;
        try {
            Candidate = tenantDB.model("Candidate");
        } catch (e) {
            console.warn('⚠️ [CANDIDATE REGISTER] Model error, creating fresh:', e.message);
            const CandidateSchema = require("../models/Candidate");
            Candidate = tenantDB.model("Candidate", CandidateSchema);
        }

        console.log('✅ [CANDIDATE REGISTER] Candidate model loaded');

        const existing = await Candidate.findOne({ email, tenant: tenantDB.tenantId });
        if (existing) {
            console.warn('⚠️ [CANDIDATE REGISTER] Email already registered:', email);
            return res.status(400).json({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const candidate = new Candidate({ tenant: tenantDB.tenantId, name, email, password: hashedPassword, mobile });
        console.log('💾 [CANDIDATE REGISTER] Saving candidate:', email);

        await candidate.save();
        console.log('✅ [CANDIDATE REGISTER] Registration successful for:', email);

        res.status(201).json({ message: "Registration successful. Please login." });
    } catch (err) {
        console.error('❌ [CANDIDATE REGISTER] Error:', err.message, err.stack);
        res.status(500).json({ error: "Registration failed" });
    }
};

exports.loginCandidate = async (req, res) => {
    try {
        const { tenantId, email, password } = req.body;
        console.log('🔍 [CANDIDATE LOGIN] Request:', { tenantId, email });

        if (!tenantId || !email || !password) {
            console.warn('❌ [CANDIDATE LOGIN] Missing fields');
            return res.status(400).json({ error: "Required fields missing" });
        }

        const tenantDB = await getTenantDB(tenantId);
        console.log('✅ [CANDIDATE LOGIN] TenantDB obtained:', tenantDB.tenantId);

        // Get or create Candidate model directly with schema
        let Candidate;
        try {
            Candidate = tenantDB.model("Candidate");
        } catch (e) {
            console.warn('⚠️ [CANDIDATE LOGIN] Model error, creating fresh:', e.message);
            const CandidateSchema = require("../models/Candidate");
            Candidate = tenantDB.model("Candidate", CandidateSchema);
        }

        const candidate = await Candidate.findOne({ email, tenant: tenantDB.tenantId });

        if (!candidate) {
            console.warn('❌ [CANDIDATE LOGIN] Candidate not found:', email);
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const isValid = await bcrypt.compare(password, candidate.password);
        if (!isValid) {
            console.warn('❌ [CANDIDATE LOGIN] Invalid password');
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: candidate._id, tenantId: tenantDB.tenantId, role: 'candidate' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ [CANDIDATE LOGIN] Token generated for:', email);
        res.json({
            token,
            candidate: {
                id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                mobile: candidate.mobile,
                profilePic: candidate.profilePic
            }
        });
    } catch (err) {
        console.error('❌ [CANDIDATE LOGIN] Error:', err.message, err.stack);
        res.status(500).json({ error: "Login failed" });
    }
};

exports.getCandidateMe = async (req, res) => {
    try {
        const { tenantId, id } = req.candidate;
        console.log(`🔍 [CANDIDATE_ME] Fetching for Tenant: ${tenantId}, ID: ${id}`);

        const tenantDB = await getTenantDB(tenantId);

        // Ensure Candidate model is registered on this connection
        let Candidate;
        try {
            Candidate = tenantDB.model("Candidate");
        } catch (e) {
            Candidate = tenantDB.model("Candidate", require("../models/Candidate"));
        }

        const candidate = await Candidate.findById(id).select('-password');

        if (!candidate) {
            return res.status(404).json({ success: false, message: "Candidate not found" });
        }

        res.json({
            success: true,
            candidate: {
                id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                mobile: candidate.mobile,
                profilePic: candidate.profilePic
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getCandidateDashboard = async (req, res) => {
    try {
        const { tenantId, id } = req.candidate;
        const tenantDB = await getTenantDB(tenantId);
        const Candidate = tenantDB.model("Candidate");
        const Applicant = tenantDB.model("Applicant");
        if (!tenantDB.models.Requirement) tenantDB.model("Requirement", require('../models/Requirement'));
        let candidate = await Candidate.findById(id).select('-password');
        const applications = await Applicant.find({ candidateId: id })
            .populate('requirementId', 'jobTitle department status')
            .sort({ createdAt: -1 });

        // Auto-sync profile from latest application if fields are missing
        if (applications.length > 0) {
            const latestApp = applications[0]; // Most recent application
            let updated = false;

            if (!candidate.fatherName && latestApp.fatherName) { candidate.fatherName = latestApp.fatherName; updated = true; }
            if (!candidate.dob && latestApp.dob) { candidate.dob = latestApp.dob; updated = true; }
            if (!candidate.address && latestApp.address) { candidate.address = latestApp.address; updated = true; }
            if (!candidate.mobile && latestApp.mobile) { candidate.mobile = latestApp.mobile; updated = true; }

            if (updated) {
                await candidate.save();
                console.log(`[DASHBOARD] Auto-synced profile for ${candidate.email} from latest application.`);
            }
        }

        res.json({ profile: candidate, applications });
    } catch (err) {
        res.status(500).json({ error: "Failed to load dashboard" });
    }
};

exports.checkApplicationStatus = async (req, res) => {
    try {
        const { tenantId, id } = req.candidate;
        const { requirementId } = req.params;
        const tenantDB = await getTenantDB(tenantId);
        const Applicant = tenantDB.model("Applicant");
        const application = await Applicant.findOne({ candidateId: id, requirementId }).sort({ createdAt: -1 });
        if (!application) return res.json({ applied: false });
        res.json({ applied: true, applicationId: application._id, status: application.status });
    } catch (err) {
        res.status(500).json({ error: "Failed to check status" });
    }
};

exports.trackApplication = async (req, res) => {
    try {
        const { tenantId, id } = req.candidate;
        const { applicationId } = req.params;
        const tenantDB = await getTenantDB(tenantId);

        // Ensure models are registered correctly
        if (!tenantDB.models.Requirement) {
            tenantDB.model("Requirement", require('../models/Requirement'));
        }
        if (!tenantDB.models.CompanyProfile) {
            tenantDB.model("CompanyProfile", require('../models/CompanyProfile'));
        }

        const Applicant = tenantDB.model("Applicant");
        const CompanyProfile = tenantDB.model("CompanyProfile");

        const application = await Applicant.findOne({ _id: applicationId, candidateId: id })
            .populate('requirementId', 'jobTitle department status companyName');

        if (!application) {
            console.warn(`[TRACK_APP] Application ${applicationId} not found for candidate ${id}`);
            return res.status(404).json({ error: "Application not found" });
        }

        // Try to get company name from CompanyProfile or fallback to requirement or 'Company'
        let companyName = 'Company';
        try {
            const profile = await CompanyProfile.findOne({});
            if (profile && profile.companyName) {
                companyName = profile.companyName;
            } else if (application.requirementId?.companyName) {
                companyName = application.requirementId.companyName;
            }
        } catch (e) {
            console.warn("[TRACK_APP] Failed to fetch company name:", e.message);
        }

        // Fetch associated GeneratedLetter (Dynamic Workflow)
        let dynamicLetter = null;
        try {
            const GeneratedLetter = tenantDB.model("GeneratedLetter");
            dynamicLetter = await GeneratedLetter.findOne({ applicantId: applicationId }).sort({ createdAt: -1 });
        } catch (e) {
            console.warn("[TRACK_APP] GeneratedLetter model not available or fetch failed:", e.message);
        }

        res.json({
            timeline: application.timeline && application.timeline.length > 0 ? application.timeline : [{
                status: 'Applied',
                date: application.createdAt,
                description: 'Application successfully submitted'
            }],
            jobDetails: {
                id: application.jobId?._id,
                title: application.jobId?.title,
                company: companyName,
                status: application.status,
                appliedDate: application.createdAt || new Date(),
                offerLetterUrl: application.offerLetterPath ? `/uploads/offers/${application.offerLetterPath}` : null,
                joiningLetterUrl: application.joiningLetterPath ? `/uploads/${application.joiningLetterPath}` : null,

                // Dynamic flow fields
                letterId: dynamicLetter?._id || null,
                letterStatus: dynamicLetter?.status || null,
                tenantId: tenantId
            }
        });
    } catch (err) {
        console.error("[TRACK_APP] Error:", err.message);
        res.status(500).json({ error: "Failed to track application", details: err.message });
    }
};

exports.acceptOffer = async (req, res) => {
    try {
        const { tenantId, id } = req.candidate;
        const { applicationId } = req.params;
        const tenantDB = await getTenantDB(tenantId);

        const Applicant = tenantDB.model("Applicant");
        const Notification = tenantDB.model("Notification"); // For HR notification

        const application = await Applicant.findOne({ _id: applicationId, candidateId: id }).populate('requirementId');

        if (!application) {
            return res.status(404).json({ error: "Application not found" });
        }

        if (application.status !== 'Offer Issued' && application.status !== 'Selected') {
            // Allow 'Selected' too in case status wasn't updated correctly or legacy
            return res.status(400).json({ error: "No pending offer found to accept." });
        }

        application.status = 'Offer Accepted';
        application.offerAcceptedAt = new Date();

        if (!application.timeline) application.timeline = [];
        application.timeline.push({
            status: 'Offer Accepted',
            message: 'Candidate has accepted the offer.',
            updatedBy: 'Candidate',
            timestamp: new Date()
        });

        await application.save();


        // Note: BGV Auto-initiation removed as per requirements. 
        // BGV must be manually initiated by HR from the dashboard.

        // Notify HR
        try {
            console.log(`✅ [OFFER ACCEPT] Candidate ${id} accepted offer for App ${applicationId}`);
            const job = application.requirementId;
            if (job && job.createdBy) {
                await Notification.create({
                    tenant: tenantId,
                    receiverId: job.createdBy, // Notify the creator of the job
                    receiverRole: 'hr',
                    entityType: 'Application',
                    entityId: applicationId,
                    title: 'Offer Accepted',
                    message: `Candidate ${req.candidate.name} has accepted the offer for ${job.jobTitle}.`,
                    isRead: false
                });
            }
        } catch (e) {
            console.warn("Failed to notify HR:", e.message);
        }

        res.json({
            success: true,
            message: "Offer accepted successfully! You can now proceed to upload BGV documents.",
            status: 'Offer Accepted'
        });

    } catch (err) {
        console.error("Accept Offer Error:", err.message);
        res.status(500).json({ error: "Failed to accept offer" });
    }
};

// Get BGV Documents for an Application
exports.getBGVDocuments = async (req, res) => {
    try {
        const { tenantId, id } = req.candidate;
        const { applicationId } = req.params;
        const tenantDB = await getTenantDB(tenantId);
        const { BGVCase, BGVDocument, BGVCheck } = await getBGVModels({ tenantId, tenantDB });

        // Find BGV Case linked to this application
        const bgvCase = await BGVCase.findOne({ applicationId, candidateId: id });

        if (!bgvCase) {
            // Important: Return bgvInitiated: false if no case exists
            return res.json({ bgvInitiated: false, documents: [], requiredDocs: [] });
        }

        // Fetch checks to determine required documents
        const checks = await BGVCheck.find({ caseId: bgvCase._id }).select('type');
        const checkTypes = checks.map(c => c.type);

        // Map Check Types to required frontend document keys
        const requiredDocs = [];
        if (checkTypes.includes('IDENTITY')) {
            requiredDocs.push({ key: 'AADHAAR', label: 'Aadhar Card' });
            requiredDocs.push({ key: 'PAN', label: 'PAN Card' });
        }
        if (checkTypes.includes('ADDRESS')) {
            // Could add address proof here if needed
            requiredDocs.push({ key: 'ADDRESS_PROOF', label: 'Address Proof' });
        }
        if (checkTypes.includes('EDUCATION')) {
            requiredDocs.push({ key: 'DEGREE_CERTIFICATE', label: 'Degree Certificate' });
        }
        if (checkTypes.includes('EMPLOYMENT')) {
            requiredDocs.push({ key: 'RELIEVING_LETTER', label: 'Relieving Letter' });
            requiredDocs.push({ key: 'PAYSLIP', label: 'Payslips (Last 3 months)' });
        }

        // Always add Passport Photo as it's usually standard
        requiredDocs.push({ key: 'PASSPORT_PHOTO', label: 'Passport Photo' });

        // Fetch already uploaded documents
        const documents = await BGVDocument.find({ caseId: bgvCase._id, isDeleted: false })
            .select('documentType fileName originalName filePath status verified uploadedAt')
            .sort({ uploadedAt: -1 })
            .lean();

        // Transform for frontend
        const formattedDocs = documents.map(doc => ({
            name: doc.documentType,
            fileName: doc.originalName,
            filePath: doc.filePath,
            verified: doc.status === 'VERIFIED',
            status: doc.status,
            uploadedAt: doc.uploadedAt
        }));

        res.json({
            bgvInitiated: true,
            package: bgvCase.package,
            requiredDocs,
            documents: formattedDocs
        });

    } catch (err) {
        console.error("[BGV_DOCS] Error:", err.message);
        res.status(500).json({ error: "Failed to fetch BGV documents" });
    }
};

// Upload BGV Document
exports.uploadBGVDocument = async (req, res) => {
    try {
        const { tenantId, id } = req.candidate;
        const { applicationId } = req.params;
        const { type } = req.body; // Document Type
        const tenantDB = await getTenantDB(tenantId);
        const { BGVCase, BGVDocument, BGVTimeline, BGVCheck } = await getBGVModels({ tenantId, tenantDB });

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // 3. Find BGV Case
        const candidateId = id.toString();
        const tenantIdStr = tenantId.toString();

        let bgvCase = await BGVCase.findOne({ applicationId, candidateId: id });

        if (!bgvCase) {
            return res.status(404).json({ error: "BGV Case not initialized. Please contact HR." });
        }

        if (bgvCase.isClosed) {
            return res.status(400).json({ error: "BGV Case is closed. Cannot upload documents." });
        }

        // 4. Determine directory (Absolute Path)
        const uploadsBaseDir = path.join(process.cwd(), 'uploads');
        const bgvDir = path.join(uploadsBaseDir, tenantIdStr, 'bgv', bgvCase.caseId.toString());

        if (!fs.existsSync(bgvDir)) {
            fs.mkdirSync(bgvDir, { recursive: true });
        }

        const ext = path.extname(req.file.originalname);
        const normalizedType = type.toUpperCase();
        const filename = `${normalizedType}_${Date.now()}${ext}`;
        const finalPath = path.join(bgvDir, filename);

        // 5. Store Relative URL for database
        const relativeUrl = `uploads/${tenantIdStr}/bgv/${bgvCase.caseId}/${filename}`;

        // 6. Move file from temp to final location (Absolute Paths)
        const tempPath = path.isAbsolute(req.file.path) ? req.file.path : path.join(process.cwd(), req.file.path);

        try {
            fs.renameSync(tempPath, finalPath);
        } catch (renameErr) {
            console.error("❌ [BGV_UPLOAD] File Move Failed (cross-device?):", renameErr);
            // Fallback: copy + unlink
            fs.copyFileSync(tempPath, finalPath);
            fs.unlinkSync(tempPath);
        }

        // 7. Map Document Type to Check Type & Update Check Status
        let checkType = null;
        if (['AADHAAR', 'PAN', 'IDENTITY'].includes(normalizedType)) checkType = 'IDENTITY';
        else if (['DEGREE_CERTIFICATE', 'EDUCATION'].includes(normalizedType)) checkType = 'EDUCATION';
        else if (['RELIEVING_LETTER', 'PAYSLIP', 'EMPLOYMENT'].includes(normalizedType)) checkType = 'EMPLOYMENT';
        else if (['ADDRESS_PROOF', 'ADDRESS'].includes(normalizedType)) checkType = 'ADDRESS';
        else if (['PASSPORT_PHOTO'].includes(normalizedType)) checkType = 'IDENTITY';

        let checkId = null;
        if (checkType) {
            try {
                const check = await BGVCheck.findOne({ caseId: bgvCase._id, type: checkType });
                if (check) {
                    checkId = check._id;
                    if (['NOT_STARTED', 'DOCUMENTS_PENDING'].includes(check.status)) {
                        check.status = 'DOCUMENTS_UPLOADED';
                        await check.save();
                    }
                }
            } catch (checkErr) {
                console.warn("[BGV_UPLOAD] Check status update failed:", checkErr.message);
            }
        }

        // 8. Create Document Record
        const document = await BGVDocument.create({
            tenant: tenantId,
            caseId: bgvCase._id,
            checkId,
            candidateId: id,
            documentType: normalizedType, // Ensure Uppercase for Enum
            fileName: filename,
            originalName: req.file.originalname,
            filePath: relativeUrl,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            version: (await BGVDocument.countDocuments({ caseId: bgvCase._id, documentType: normalizedType, isDeleted: false })) + 1,
            uploadedBy: {
                userId: id,
                userName: 'Candidate',
                userRole: 'candidate'
            },
            status: 'UPLOADED'
        });

        // 9. Timeline Entry
        try {
            await BGVTimeline.create({
                tenant: tenantId,
                caseId: bgvCase._id,
                checkId,
                eventType: 'DOCUMENT_UPLOADED',
                title: 'Candidate Uploaded Document',
                description: `Candidate uploaded ${normalizedType} (${req.file.originalname})`,
                performedBy: {
                    userId: id,
                    userName: 'Candidate',
                    userRole: 'candidate'
                },
                newStatus: 'DOCUMENTS_UPLOADED',
                visibleTo: ['ALL'],
                metadata: { documentId: document._id }
            });
        } catch (tmErr) {
            console.warn("[BGV_UPLOAD] Timeline entry failed:", tmErr.message);
        }

        res.json({
            success: true,
            message: "Document uploaded successfully",
            document: {
                name: normalizedType,
                fileName: req.file.originalname,
                filePath: relativeUrl,
                verified: false
            }
        });

    } catch (err) {
        console.error("❌ [BGV_UPLOAD] FATAL ERROR:", err);
        console.error("Context:", {
            tenantId: req.candidate?.tenantId,
            applicationId: req.params?.applicationId,
            candidateId: req.candidate?.id,
            file: req.file ? {
                path: req.file.path,
                mimetype: req.file.mimetype,
                originalname: req.file.originalname
            } : 'No file'
        });
        res.status(500).json({ error: "Failed to upload document", details: err.message });
    }
};
