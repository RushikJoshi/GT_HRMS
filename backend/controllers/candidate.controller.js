const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getTenantDB = require('../utils/tenantDB');

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
                mobile: candidate.mobile
            }
        });
    } catch (err) {
        console.error('❌ [CANDIDATE LOGIN] Error:', err.message, err.stack);
        res.status(500).json({ error: "Login failed" });
    }
};

exports.getCandidateDashboard = async (req, res) => {
    try {
        const { tenantId, id } = req.candidate;
        const tenantDB = await getTenantDB(tenantId);
        const Candidate = tenantDB.model("Candidate");
        const Applicant = tenantDB.model("Applicant");
        if (!tenantDB.models.Requirement) tenantDB.model("Requirement", require('../models/Requirement').schema);
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

        res.json({
            timeline: application.timeline && application.timeline.length > 0 ? application.timeline : [{
                status: 'Applied',
                message: 'Your application has been received and is under review.',
                timestamp: application.createdAt || new Date()
            }],
            jobDetails: {
                jobTitle: application.requirementId?.jobTitle || 'N/A',
                department: application.requirementId?.department || 'N/A',
                company: companyName,
                status: application.status,
                appliedDate: application.createdAt || new Date(),
                offerLetterUrl: application.offerLetterPath ? `/uploads/offers/${application.offerLetterPath}` : null,
                joiningLetterUrl: application.joiningLetterPath ? `/uploads/${application.joiningLetterPath}` : null
            }
        });
    } catch (err) {
        console.error("[TRACK_APP] Error:", err.message);
        res.status(500).json({ error: "Failed to track application", details: err.message });
    }
};
