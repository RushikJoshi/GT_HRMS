const mongoose = require('mongoose');

function getModels(req) {
    if (!req.tenantDB) throw new Error("Tenant database connection not available");
    const db = req.tenantDB;
    return {
        Interview: db.model("Interview") || db.model("Interview", require('../models/Interview')),
        Applicant: db.model("Applicant") || db.model("Applicant", require('../models/Applicant')),
        TrackerCandidate: db.model("TrackerCandidate") || db.model("TrackerCandidate", require('../models/TrackerCandidate'))
    };
}

/**
 * Get interview details by TrackerCandidate ID or Applicant ID
 * Route: GET /api/hrms/interviews/:id
 */
exports.getInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const { Interview, Applicant, TrackerCandidate } = getModels(req);

        console.log('🔍 [GET INTERVIEW] Request for ID:', id);

        // 1. Try to assume ID is Applicant ID directly
        // We check if it matches a valid ObjectId format first
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        let interview = await Interview.findOne({ applicationId: id });
        if (interview) {
            console.log('✅ [GET INTERVIEW] Found by Application ID');
            return res.json(interview);
        }

        // 2. Try to find by TrackerCandidate ID
        // The ID passed from timeline is likely TrackerCandidate ID
        const trackerCandidate = await TrackerCandidate.findById(id);

        if (trackerCandidate) {
            console.log('🔍 [GET INTERVIEW] Found TrackerCandidate, searching for Applicant via email:', trackerCandidate.email);
            // Find latest applicant with this email
            const applicant = await Applicant.findOne({ email: trackerCandidate.email }).sort({ createdAt: -1 });

            if (applicant) {
                console.log('✅ [GET INTERVIEW] Found Applicant:', applicant._id);
                interview = await Interview.findOne({ applicationId: applicant._id }).sort({ createdAt: -1 });
                if (interview) {
                    return res.json(interview);
                }
            }
        }

        // 3. Last resort: Try finding by interview ID itself
        interview = await Interview.findById(id);
        if (interview) {
            return res.json(interview);
        }

        console.log('❌ [GET INTERVIEW] Not found for ID:', id);
        return res.status(404).json({ message: "Interview not found" });

    } catch (error) {
        console.error('getInterview Error:', error);
        res.status(500).json({ message: error.message });
    }
};
