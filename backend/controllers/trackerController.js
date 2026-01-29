const getTenantDB = require('../utils/tenantDB');

const getModels = async (req) => {
    // Force resolve tenantDB from tenantId if missing
    if (!req.tenantDB && req.tenantId) {
        req.tenantDB = await getTenantDB(req.tenantId);
    }
    if (!req.tenantDB) throw new Error("Tenant database connection not available");

    return {
        TrackerCandidate: req.tenantDB.model("TrackerCandidate"),
        CandidateStatusLog: req.tenantDB.model("CandidateStatusLog"),
        Applicant: req.tenantDB.model("Applicant")
    };
};

/**
 * @desc    Get all candidates (Merged from Applicants and TrackerCandidates)
 * @route   GET /api/hr/candidate-status
 */
exports.getCandidates = async (req, res) => {
    try {
        const { TrackerCandidate, Applicant } = await getModels(req);
        const tenantId = req.tenantId;

        // 1. Fetch from Tracker (Seeded or previously tracked)
        const trackerCandidates = await TrackerCandidate.find({ tenant: tenantId }).lean();

        // 2. Fetch from main Applicants collection
        const applicants = await Applicant.find({ tenant: tenantId }).populate('requirementId').lean();

        // 3. Map Applicants to Tracker format
        const mappedApplicants = applicants.map(app => {
            // Check if this applicant is already in tracker candidates to avoid duplicates
            const alreadyTracked = trackerCandidates.find(tc => tc.email === app.email);
            if (alreadyTracked) return null;

            return {
                _id: app._id,
                name: app.name,
                email: app.email,
                phone: app.mobile || app.phone || 'N/A',
                requirementTitle: app.requirementId?.jobTitle || 'Unknown Role',
                currentStatus: app.status || 'Applied',
                currentStage: 'Application',
                tenant: tenantId,
                createdAt: app.createdAt,
                source: 'Applicant'
            };
        }).filter(Boolean);

        // 4. Combine and Sort
        const finalResults = [...trackerCandidates, ...mappedApplicants].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json(finalResults);
    } catch (error) {
        console.error('[TRACKER_ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get single candidate by ID (either TrackerCandidate or Applicant)
 */
exports.getCandidateById = async (req, res) => {
    try {
        const { TrackerCandidate, Applicant } = await getModels(req);
        const { id } = req.params;

        let candidate = await TrackerCandidate.findById(id).lean();

        // If not found by ID, maybe it's an Applicant ID and already promoted?
        if (!candidate) {
            const applicant = await Applicant.findById(id).populate('requirementId').lean();
            if (applicant) {
                // Try finding in TrackerCandidate by email
                candidate = await TrackerCandidate.findOne({ email: applicant.email }).lean();
                if (!candidate) {
                    // Not promoted yet, return Applicant data
                    candidate = {
                        _id: applicant._id,
                        name: applicant.name,
                        email: applicant.email,
                        phone: applicant.mobile || 'N/A',
                        requirementTitle: applicant.requirementId?.jobTitle || 'Unknown Role',
                        currentStatus: applicant.status || 'Applied',
                        currentStage: 'Application',
                        createdAt: applicant.createdAt,
                        source: 'Applicant'
                    };
                }
            }
        }

        if (!candidate) {
            return res.status(404).json({ message: 'Candidate not found' });
        }

        res.json(candidate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get candidate timeline
 */
exports.getTimeline = async (req, res) => {
    try {
        const { CandidateStatusLog, TrackerCandidate, Applicant } = await getModels(req);
        const { id } = req.params;

        // Try getting logs by ID
        let logs = await CandidateStatusLog.find({ candidateId: id }).sort({ actionDate: -1 }).lean();

        // If no logs, maybe it's an Applicant ID and already promoted?
        if (logs.length === 0) {
            const applicant = await Applicant.findById(id).lean();
            if (applicant) {
                const tc = await TrackerCandidate.findOne({ email: applicant.email }).lean();
                if (tc) {
                    logs = await CandidateStatusLog.find({ candidateId: tc._id }).sort({ actionDate: -1 }).lean();
                }
            }
        }

        // If no logs or minimal logs, also fetch logs from Applicant.timeline
        let applicantLogs = [];

        // Find the applicant record (either by ID or email if ID is TrackerCandidate)
        let applicant = await Applicant.findById(id).lean();
        if (!applicant) {
            const trackerCandidate = await TrackerCandidate.findById(id).lean();
            if (trackerCandidate) {
                applicant = await Applicant.findOne({ email: trackerCandidate.email, tenant: req.tenantId }).lean();
            }
        }

        if (applicant && applicant.timeline && applicant.timeline.length > 0) {
            applicantLogs = applicant.timeline.map(t => {
                let inferredStage = 'Application';
                const s = t.status || '';
                if (s === 'Shortlisted' || s === 'Interview Scheduled' || s.includes('Interview')) inferredStage = 'Interview';
                else if (s === 'Selected' || s === 'Offer Sent' || s === 'Hired' || s === 'Rejected' || s.includes('Offer Letter') || s.includes('Joining Letter')) inferredStage = 'Final';

                return {
                    _id: t._id || `app-${t.timestamp}`,
                    candidateId: id,
                    status: t.status,
                    stage: inferredStage,
                    actionBy: t.updatedBy || 'System',
                    remarks: t.message,
                    actionDate: t.timestamp
                };
            });
        }

        // Merge logs
        // We prioritize CandidateStatusLogs (Tracker) but we want to show everything
        // Filter out applicant logs that might be duplicates of existing status logs if we want,
        // but typically Tracker logs are newer.
        // Simple merge:
        logs = [...logs, ...applicantLogs];

        // If merged logs are still empty, return default
        if (logs.length === 0) {
            let candidate = await TrackerCandidate.findById(id).lean();
            if (!candidate) candidate = applicant;

            if (candidate) {
                logs = [{
                    _id: 'default-log',
                    candidateId: id,
                    status: candidate.status || candidate.currentStatus || 'Applied',
                    stage: 'Application',
                    actionBy: 'System',
                    remarks: 'Application received and automatically tracked.',
                    actionDate: candidate.createdAt || new Date()
                }];
            }
        }

        // Deduplicate based on timestamp and status to be safe (optional but good)
        // Sort descending
        logs.sort((a, b) => new Date(b.actionDate) - new Date(a.actionDate));

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Update candidate status
 */
exports.updateStatus = async (req, res) => {
    const { status, stage, actionBy, remarks } = req.body;
    try {
        const { TrackerCandidate, CandidateStatusLog, Applicant } = await getModels(req);
        const { id } = req.params;

        // Try finding in TrackerCandidate first
        let candidate = await TrackerCandidate.findById(id);

        // If not found, check if it's an Applicant needing promotion
        if (!candidate) {
            const applicant = await Applicant.findById(id).populate('requirementId');
            if (applicant) {
                // Check if already promoted by email
                candidate = await TrackerCandidate.findOne({ email: applicant.email, tenant: req.tenantId });

                if (!candidate) {
                    candidate = new TrackerCandidate({
                        name: applicant.name,
                        email: applicant.email,
                        phone: applicant.mobile || 'N/A',
                        requirementTitle: applicant.requirementId?.jobTitle || 'Unknown Role',
                        currentStatus: status,
                        currentStage: stage,
                        tenant: req.tenantId
                    });
                    await candidate.save();
                } else {
                    candidate.currentStatus = status;
                    candidate.currentStage = stage;
                    await candidate.save();
                }

                // IMPORTANT: Also update the Applicant status to keep in sync
                applicant.status = status;
                if (!applicant.timeline) applicant.timeline = [];
                applicant.timeline.push({
                    status: status,
                    message: remarks || `Status updated via Tracker to ${status}`,
                    updatedBy: actionBy || 'HR',
                    timestamp: new Date()
                });
                await applicant.save();
            }
        } else {
            candidate.currentStatus = status;
            candidate.currentStage = stage;
            await candidate.save();

            // Also try to find and update the corresponding applicant by email
            const applicant = await Applicant.findOne({ email: candidate.email, tenant: req.tenantId });
            if (applicant) {
                applicant.status = status;
                if (!applicant.timeline) applicant.timeline = [];
                applicant.timeline.push({
                    status: status,
                    message: remarks || `Status updated via Tracker to ${status}`,
                    updatedBy: actionBy || 'HR',
                    timestamp: new Date()
                });
                await applicant.save();
            }
        }

        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        const log = new CandidateStatusLog({
            candidateId: candidate._id,
            status,
            stage,
            actionBy,
            remarks,
            actionDate: new Date()
        });
        await log.save();

        res.json({ candidate, log });
    } catch (error) {
        console.error('[UPDATE_STATUS_ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Seed sample data (Cleaned)
 */
exports.seedData = async (req, res) => {
    try {
        const { TrackerCandidate, CandidateStatusLog } = await getModels(req);
        const tenantId = req.tenantId;

        // Clean only dummy data
        await TrackerCandidate.deleteMany({ tenant: tenantId, email: /@example.com$/ });

        const sample = [
            { name: 'John Doe', email: 'john@example.com', phone: '1234567890', requirementTitle: 'Senior Dev', currentStatus: 'Selected', currentStage: 'Final', tenant: tenantId },
            { name: 'Jane Smith', email: 'jane@example.com', phone: '9876543210', requirementTitle: 'Lead Designer', currentStatus: 'Interview Scheduled', currentStage: 'Technical', tenant: tenantId }
        ];

        const created = await TrackerCandidate.insertMany(sample);
        const logs = created.map(c => ({
            candidateId: c._id,
            status: 'Applied',
            stage: 'Application',
            actionBy: 'System',
            remarks: 'Seeded sample data.',
            actionDate: new Date()
        }));
        await CandidateStatusLog.insertMany(logs);

        res.json({ message: 'Seeded', count: created.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
