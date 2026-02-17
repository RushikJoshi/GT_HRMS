const RecruitmentService = require('../services/Recruitment.service');

exports.saveDraft = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { step, data, draftId } = req.body;

        if (!step) return res.status(400).json({ message: "Step number is required" });

        const result = await RecruitmentService.saveDraft(tenantId, parseInt(step), data, req.user.id, draftId);
        res.status(200).json({ success: true, draftId: result._id, draft: result });
    } catch (error) {
        console.error('[saveDraft ERROR]', error);
        res.status(400).json({ message: error.message });
    }
};

exports.publishJob = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { draftId } = req.body;

        if (!draftId) return res.status(400).json({ message: "Draft ID is required to publish" });

        const result = await RecruitmentService.publishJob(tenantId, draftId, req.user.id);
        res.status(201).json({ success: true, message: "Job published successfully", job: result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getDraft = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { RequirementDraft } = await RecruitmentService.getModels(tenantId);
        const draft = await RequirementDraft.findOne({ _id: req.params.id, tenant: tenantId });
        if (!draft) return res.status(404).json({ message: "Draft not found" });
        res.json(draft);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createRequirement = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.createRequirement(tenantId, req.body, req.user.id);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getRequirements = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        console.log('[GET_REQUIREMENTS] TenantId:', tenantId, 'Query:', req.query);
        const result = await RecruitmentService.getRequirements(tenantId, req.query);
        res.json(result);
    } catch (error) {
        console.error('[GET_REQUIREMENTS] Error:', error.message);
        console.error('[GET_REQUIREMENTS] Stack:', error.stack);
        res.status(500).json({ message: error.message });
    }
};

exports.getRequirementById = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const requirement = await RecruitmentService.getRequirementById(tenantId, req.params.id);
        if (!requirement) return res.status(404).json({ message: 'Requirement not found' });
        res.json(requirement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getInternalJobs = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const query = { status: 'Open', visibility: { $in: ['Internal', 'Both'] } };
        const requirements = await RecruitmentService.getRequirements(tenantId, query);
        res.json(requirements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.applyInternal = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.applyInternal(tenantId, req.params.id, req.user);
        res.status(201).json({ message: "Successfully applied internally", applicationId: result._id });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getMyApplications = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.getApplicantApplications(tenantId, req.user);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.updateStatus = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { status } = req.body;
        const result = await RecruitmentService.updateRequirement(tenantId, req.params.id, { status }, req.user.id);
        res.json({ success: true, message: "Status updated successfully", requirement: result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getApplicants = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.getTenantApplications(tenantId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateRequirement = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.updateRequirement(tenantId, req.params.id, req.body, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


exports.deleteRequirement = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        await RecruitmentService.deleteRequirement(tenantId, req.params.id);
        res.json({ message: 'Requirement deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
