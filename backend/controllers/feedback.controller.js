const mongoose = require('mongoose');

const getModels = (req) => {
    // Shared models (Global DB to avoid collection limits)
    const FeedbackTemplate = mongoose.models.FeedbackTemplate || mongoose.model('FeedbackTemplate');
    const CandidateStageFeedback = mongoose.models.CandidateStageFeedback || mongoose.model('CandidateStageFeedback');

    const db = req.tenantDB || mongoose;
    return {
        FeedbackTemplate,
        CandidateStageFeedback,
        Applicant: db.model('Applicant'),
        JobPipeline: db.model('JobPipeline')
    };
};

exports.getTemplates = async (req, res) => {
    try {
        const { FeedbackTemplate } = getModels(req);
        const templates = await FeedbackTemplate.find({ tenant: req.tenantId, isActive: true });
        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const { FeedbackTemplate } = getModels(req);
        const template = new FeedbackTemplate({
            ...req.body,
            tenant: req.tenantId,
            createdBy: req.user.id
        });
        await template.save();
        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStageFeedback = async (req, res) => {
    try {
        const { candidateId, stageId } = req.params;
        const { CandidateStageFeedback, FeedbackTemplate, JobPipeline } = getModels(req);

        // 1. Get existing feedback if any
        const feedback = await CandidateStageFeedback.findOne({
            tenant: req.tenantId,
            candidateId,
            stageId
        }).populate('interviewerId', 'name');

        // 2. Get the template for this stage
        const pipeline = await JobPipeline.findOne({
            tenant: req.tenantId,
            stages: { $elemMatch: { _id: stageId } }
        });

        let template = null;
        if (pipeline) {
            const stage = pipeline.stages.id(stageId);
            if (stage && stage.feedbackTemplateId) {
                template = await FeedbackTemplate.findById(stage.feedbackTemplateId);
            }
        }

        res.json({ success: true, data: { feedback, template } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.submitFeedback = async (req, res) => {
    try {
        const { CandidateStageFeedback } = getModels(req);
        const { candidateId, jobId, stageId, answers, decision, comments, templateId, interviewerName } = req.body;

        const feedback = await CandidateStageFeedback.findOneAndUpdate(
            { tenant: req.tenantId, candidateId, stageId },
            {
                tenant: req.tenantId,
                candidateId,
                jobId,
                stageId,
                interviewerId: req.user.id,
                interviewerName: interviewerName || req.user.name,
                templateId,
                answers,
                decision,
                comments,
                submittedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
