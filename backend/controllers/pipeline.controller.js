const getTenantDB = require('../utils/tenantDB');

/**
 * Pipeline Controller
 * Handles Templates, Job-specific Pipelines, and Candidate Movement Logs
 */

// --- Template Actions ---

exports.getTemplates = async (req, res) => {
    try {
        const db = req.tenantDB;
        const PipelineTemplate = db.model('PipelineTemplate');
        const templates = await PipelineTemplate.find({ tenant: req.tenantId, isActive: true }).sort({ createdAt: -1 });
        res.json(templates);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const db = req.tenantDB;
        const PipelineTemplate = db.model('PipelineTemplate');

        const template = new PipelineTemplate({
            ...req.body,
            tenant: req.tenantId,
            createdBy: req.user.id
        });

        await template.save();
        res.status(201).json(template);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const db = req.tenantDB;
        const PipelineTemplate = db.model('PipelineTemplate');

        const template = await PipelineTemplate.findOneAndUpdate(
            { _id: req.params.id, tenant: req.tenantId },
            { ...req.body, updatedBy: req.user.id },
            { new: true }
        );

        if (!template) return res.status(404).json({ message: 'Template not found' });
        res.json(template);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const db = req.tenantDB;
        const PipelineTemplate = db.model('PipelineTemplate');

        // Soft delete
        const template = await PipelineTemplate.findOneAndUpdate(
            { _id: req.params.id, tenant: req.tenantId },
            { isActive: false },
            { new: true }
        );

        if (!template) return res.status(404).json({ message: 'Template not found' });
        res.json({ message: 'Template deleted' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// --- Job Pipeline Actions ---

exports.getJobPipeline = async (req, res) => {
    try {
        const db = req.tenantDB;
        if (!db) return res.status(500).json({ message: "Database connection failed" });

        const JobPipeline = db.model('JobPipeline');
        const Requirement = db.model('Requirement');
        const PipelineTemplate = db.model('PipelineTemplate');

        let pipeline = await JobPipeline.findOne({ requirementId: req.params.jobId, tenant: req.tenantId });

        const DEFAULT_WORKFLOW = ['Applied', 'Shortlisted', 'Interview', 'HR Round', 'Finalized'];

        // 1. AUTO-INITIALIZE if missing
        if (!pipeline) {
            console.log(`[DEBUG] getJobPipeline - Initializing for Job: ${req.params.jobId}`);
            const job = await Requirement.findById(req.params.jobId);
            if (!job) return res.status(404).json({ message: 'Job not found' });

            const defaultTemplate = await PipelineTemplate.findOne({ tenant: req.tenantId, isDefault: true });

            let stages = [];
            if (defaultTemplate && defaultTemplate.stages?.length > 0) {
                stages = defaultTemplate.stages.map((s, idx) => ({
                    stageName: s.stageName || s.name || `Stage ${idx + 1}`,
                    stageType: s.stageType || 'Interview',
                    positionIndex: idx
                }));
            } else {
                const workflowSource = job.workflow?.length > 0 ? job.workflow : DEFAULT_WORKFLOW;
                stages = workflowSource.map((name, idx) => ({
                    stageName: name,
                    stageType: ['Applied', 'Shortlisted', 'Finalized'].includes(name) ? name : 'Interview',
                    positionIndex: idx
                }));
            }

            pipeline = new JobPipeline({
                tenant: req.tenantId,
                requirementId: job._id,
                stages: stages,
                createdBy: req.user?.id || req.user?._id
            });
            await pipeline.save();
        }

        // 2. CORRUPTION REPAIR: If pipeline is empty or has "Untitled Stage"
        if (pipeline && (pipeline.stages.length === 0 || pipeline.stages.some(s => s.stageName === "Untitled Stage" || !s.stageName))) {
            console.log(`[DEBUG] getJobPipeline - Repairing pipeline for Job: ${req.params.jobId}`);
            const job = await Requirement.findById(req.params.jobId);
            if (job) {
                const workflowSource = job.workflow?.length > 0 ? job.workflow : DEFAULT_WORKFLOW;
                pipeline.stages = workflowSource.map((name, idx) => ({
                    stageName: name,
                    stageType: ['Applied', 'Shortlisted', 'Finalized'].includes(name) ? name : 'Interview',
                    positionIndex: idx
                }));
                await pipeline.save();
            }
        }

        res.json(pipeline);
    } catch (err) {
        console.error(`[CRITICAL] getJobPipeline Error for Job ${req.params.jobId}:`, err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.reorderJobPipeline = async (req, res) => {
    try {
        const db = req.tenantDB;
        const JobPipeline = db.model('JobPipeline');
        const { stages } = req.body; // Expect full array of stages with new order

        if (!stages || !Array.isArray(stages)) {
            return res.status(400).json({ message: "Stages array is required for reorder" });
        }

        let pipeline = await JobPipeline.findOne({ requirementId: req.params.jobId, tenant: req.tenantId });

        if (!pipeline) {
            console.log(`[DEBUG] reorderJobPipeline - Pipeline missing for ${req.params.jobId}, creating on the fly`);
            const Requirement = db.model('Requirement');
            const job = await Requirement.findById(req.params.jobId);
            if (!job) return res.status(404).json({ message: 'Job not found' });

            pipeline = new JobPipeline({
                tenant: req.tenantId,
                requirementId: job._id,
                stages: [],
                createdBy: req.user?.id || req.user?._id
            });
        }

        // Maintain full stage objects while reordering
        pipeline.stages = stages.map((s, idx) => ({
            ...s,
            assignedInterviewer: (s.assignedInterviewer === "" || s.assignedInterviewer === "null" || !s.assignedInterviewer) ? null : s.assignedInterviewer,
            positionIndex: idx
        }));

        pipeline.updatedBy = req.user?.id || req.user?._id;
        await pipeline.save();
        res.json(pipeline);
    } catch (err) {
        console.error(`[CRITICAL] reorderJobPipeline Error for Job ${req.params.jobId}:`, err.message);
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.addJobStage = async (req, res) => {
    try {
        const db = req.tenantDB;
        const JobPipeline = db.model('JobPipeline');
        const stageData = req.body; // Expect full stage object

        const pipeline = await JobPipeline.findOne({ requirementId: req.params.jobId, tenant: req.tenantId });
        if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });

        // 🚀 SANITIZER: Cleanup stageData before adding
        if (stageData.assignedInterviewer === "" || stageData.assignedInterviewer === "null") {
            stageData.assignedInterviewer = null;
        }

        const positionIndex = stageData.positionIndex ?? pipeline.stages.length;

        pipeline.stages.splice(positionIndex, 0, {
            ...stageData,
            positionIndex
        });

        // Re-index all stages to ensure continuity
        pipeline.stages.forEach((s, idx) => s.positionIndex = idx);

        await pipeline.save();
        res.json(pipeline);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.updateJobStage = async (req, res) => {
    try {
        const db = req.tenantDB;
        const JobPipeline = db.model('JobPipeline');

        const pipeline = await JobPipeline.findOne({ requirementId: req.params.jobId, tenant: req.tenantId });
        if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });

        const stage = pipeline.stages.id(req.params.stageId);
        if (!stage) return res.status(404).json({ message: 'Stage not found' });

        Object.assign(stage, req.body);
        await pipeline.save();

        res.json(pipeline);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deleteJobStage = async (req, res) => {
    try {
        const db = req.tenantDB;
        const JobPipeline = db.model('JobPipeline');

        const pipeline = await JobPipeline.findOne({ requirementId: req.params.jobId, tenant: req.tenantId });
        if (!pipeline) return res.status(404).json({ message: 'Pipeline not found' });

        pipeline.stages.pull(req.params.stageId);
        pipeline.stages.forEach((s, idx) => s.positionIndex = idx); // Re-index

        await pipeline.save();
        res.json(pipeline);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// --- Candidate Movement ---

exports.moveCandidate = async (req, res) => {
    try {
        const db = req.tenantDB;
        const Applicant = db.model('Applicant');
        const JobPipeline = db.model('JobPipeline');
        const CandidateStageHistory = db.model('CandidateStageHistory');

        const { toStage, targetStage, stageId, targetStageId, notes, stageNote, rating, feedback, scorecard } = req.body;
        const finalToStageName = targetStage || toStage;
        const finalToStageId = targetStageId || stageId;
        const finalNotes = stageNote || notes || feedback;

        if (!finalToStageName) {
            return res.status(400).json({ message: 'Target stage name is required' });
        }

        const applicant = await Applicant.findOne({ _id: req.params.applicantId, tenant: req.tenantId });
        if (!applicant) return res.status(404).json({ message: 'Applicant not found' });

        const fromStage = applicant.status;

        // Verify stage exists in JobPipeline if ID provided
        let resolvedStageId = finalToStageId;
        if (!resolvedStageId) {
            const pipeline = await JobPipeline.findOne({ requirementId: applicant.requirementId, tenant: req.tenantId });
            if (pipeline) {
                const stage = pipeline.stages.find(s => s.stageName === finalToStageName);
                if (stage) resolvedStageId = stage._id;
            }
        }

        // Update Applicant Status & Stage ID
        applicant.status = finalToStageName;
        if (resolvedStageId) applicant.currentStageId = resolvedStageId;

        // Handle Evaluation
        if (rating || scorecard || finalNotes) {
            const evalData = {
                stageName: finalToStageName,
                stageId: resolvedStageId,
                rating,
                scorecard,
                feedback: finalNotes,
                evaluatedBy: req.user.id,
                date: new Date()
            };
            applicant.lastEvaluation = evalData;
            applicant.assessmentHistory.push(evalData);
        }

        // Update Timeline
        applicant.timeline.push({
            status: finalToStageName,
            stageId: resolvedStageId,
            message: finalNotes || `Moved to ${finalToStageName}`,
            updatedBy: req.user.id,
            timestamp: new Date()
        });

        await applicant.save();

        // Log History (Separate Collection)
        const history = new CandidateStageHistory({
            tenant: req.tenantId,
            applicantId: applicant._id,
            jobId: applicant.requirementId,
            fromStage,
            toStage: finalToStageName,
            notes: finalNotes,
            rating,
            scorecard,
            movedBy: req.user.id,
            movedByName: req.user.name || req.user.email
        });
        await history.save();

        res.json({
            success: true,
            message: `Candidate moved to ${finalToStageName}`,
            applicant,
            history
        });
    } catch (err) {
        console.error("Move Candidate Error:", err);
        res.status(400).json({ message: err.message });
    }
};

exports.getCandidateHistory = async (req, res) => {
    try {
        const db = req.tenantDB;
        const CandidateStageHistory = db.model('CandidateStageHistory');

        const history = await CandidateStageHistory.find({
            applicantId: req.params.applicantId,
            tenant: req.tenantId
        }).populate('movedBy', 'name email').sort({ movedAt: -1 });

        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
