const RecruitmentService = require('../services/Recruitment.service');

exports.createRequirement = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        console.log('[DEBUG] createRequirement - User:', req.user);
        console.log('[DEBUG] createRequirement - TenantID:', tenantId);
        console.log("REQ BODY:", req.body);

        if (!tenantId) {
            console.error('[DEBUG] Missing Tenant ID');
            return res.status(400).json({ message: 'Tenant information missing from session.' });
        }

        // Validate Experience Months & Vacancy
        const { minExperienceMonths, maxExperienceMonths, vacancy } = req.body;

        if (vacancy && Number(vacancy) < 1) {
            return res.status(400).json({ message: "Vacancy must be at least 1" });
        }

        if (minExperienceMonths !== undefined && maxExperienceMonths !== undefined && Number(maxExperienceMonths) > 0) {
            if (Number(minExperienceMonths) > Number(maxExperienceMonths)) {
                return res.status(400).json({
                    message: "Minimum experience cannot be greater than maximum experience"
                });
            }
        }

        // Enforce Open Status
        const payload = { ...req.body, status: 'Open' };

        // Handle Banner Image
        if (req.file) {
            payload.bannerImage = `/uploads/requirements/${req.file.filename}`;
        }

        // Parse JSON fields from FormData (Multer parses them as strings initially)
        ['responsibilities', 'requiredSkills', 'optionalSkills', 'workflow',
            'detailedWorkflow', 'publicFields', 'customFields', 'qualifications', 'benefits'].forEach(field => {
                if (payload[field] && typeof payload[field] === 'string') {
                    try {
                        payload[field] = JSON.parse(payload[field]);
                        console.log(`[DEBUG] Parsed ${field}:`, payload[field]?.length || 'Object');
                    } catch (e) {
                        console.warn(`[WARN] Failed to parse ${field}:`, e.message);
                    }
                }
            });

        // 🟢 SANITIZATION: Force Correct Capitalization for Workflow stages (Prevents 400 Enum Error)
        if (payload.detailedWorkflow && Array.isArray(payload.detailedWorkflow)) {
            const validTypes = ['Applied', 'Shortlisted', 'Interview', 'Assessment', 'HR', 'Discussion', 'Finalized', 'Rejected'];
            payload.detailedWorkflow = payload.detailedWorkflow.map(s => {
                let type = s.stageType || s.type || 'Interview';
                // Find case-insensitive match in validTypes
                const matched = validTypes.find(t => t.toLowerCase() === type.toLowerCase());
                return {
                    ...s,
                    stageType: matched || 'Interview',
                    // 🚀 SANITIZER: Convert "" or "null" to null object for MongoDB
                    assignedInterviewerId: (s.assignedInterviewerId === "" || s.assignedInterviewerId === "null" || !s.assignedInterviewerId) ? null : s.assignedInterviewerId
                };
            });
            console.log("[DEBUG] Sanitized Detailed Workflow:", payload.detailedWorkflow.map(s => s.stageType));

            // Also sanitize simple workflow array match
            payload.workflow = payload.detailedWorkflow.map(s => s.stageName);
        }

        const result = await RecruitmentService.createRequirement(tenantId, payload, req.user.id);
        res.status(201).json(result);
    } catch (error) {
        console.error('[DEBUG] createRequirement Error:', error.message);
        if (error.errors) {
            console.error('[DEBUG] Validation Errors:', JSON.stringify(error.errors, null, 2));
        }
        res.status(400).json({
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            details: error.errors
        });
    }
};

exports.getRequirements = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.getRequirements(tenantId, req.query);
        res.json(result);
    } catch (error) {
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

        if (!tenantId) {
            return res.status(400).json({ error: "Tenant identification missing" });
        }

        // Fetch Internal/Both jobs that are Open
        const query = {
            status: 'Open',
            visibility: { $in: ['Internal', 'Both', 'External'] }
        };
        const requirements = await RecruitmentService.getRequirements(tenantId, query);
        res.json(requirements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.applyInternal = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { id } = req.params; // Requirement ID
        const user = req.user; // Token payload: { id, employeeId, role, ... }

        if (!user || (!user.id && !user.employeeId)) {
            return res.status(400).json({ message: "User information missing" });
        }

        // Pass full user context to service. 
        // Service will fetch details from DB if email/name is missing in token.
        const result = await RecruitmentService.applyInternal(tenantId, id, user);
        res.status(201).json({ message: "Successfully applied internally", applicationId: result._id });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getMyApplications = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const user = req.user;

        if (!user || (!user.id && !user.employeeId)) {
            return res.status(400).json({ message: "User information missing" });
        }

        const applications = await RecruitmentService.getApplicantApplications(tenantId, user);
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateRequirement = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;

        // Validation for Experience Months Update
        const { minExperienceMonths, maxExperienceMonths } = req.body;
        if (minExperienceMonths !== undefined && maxExperienceMonths !== undefined && Number(maxExperienceMonths) > 0) {
            if (Number(minExperienceMonths) > Number(maxExperienceMonths)) {
                return res.status(400).json({
                    message: "Minimum experience cannot be greater than maximum experience"
                });
            }
        }

        const updates = { ...req.body };
        if (req.file) {
            updates.bannerImage = `/uploads/requirements/${req.file.filename}`;
        }

        // Parse JSON fields from FormData
        ['responsibilities', 'requiredSkills', 'optionalSkills', 'workflow',
            'detailedWorkflow', 'publicFields', 'customFields', 'qualifications', 'benefits'].forEach(field => {
                if (updates[field] && typeof updates[field] === 'string') {
                    try {
                        updates[field] = JSON.parse(updates[field]);
                    } catch (e) {
                        console.warn(`[WARN] Failed to parse ${field} in update:`, e.message);
                    }
                }
            });

        // 🟢 SANITIZATION: Force Correct Capitalization for Workflow stages (Prevents 400 Enum Error)
        if (updates.detailedWorkflow && Array.isArray(updates.detailedWorkflow)) {
            const validTypes = ['Applied', 'Shortlisted', 'Interview', 'Assessment', 'HR', 'Discussion', 'Finalized', 'Rejected'];
            updates.detailedWorkflow = updates.detailedWorkflow.map(s => {
                let type = s.stageType || s.type || 'Interview';
                const matched = validTypes.find(t => t.toLowerCase() === type.toLowerCase());
                return {
                    ...s,
                    stageType: matched || 'Interview',
                    assignedInterviewerId: (s.assignedInterviewerId === "" || s.assignedInterviewerId === "null" || !s.assignedInterviewerId) ? null : s.assignedInterviewerId
                };
            });
            // Sync simple workflow
            updates.workflow = updates.detailedWorkflow.map(s => s.stageName);
        }

        const result = await RecruitmentService.updateRequirement(tenantId, req.params.id, updates, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.submitForApproval = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.submitForApproval(tenantId, req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.approveReject = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { status, remarks } = req.body; // status: 'Approved' or 'Rejected'
        const result = await RecruitmentService.approveReject(tenantId, req.params.id, status, remarks, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.publish = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.publish(tenantId, req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.close = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const result = await RecruitmentService.close(tenantId, req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const { status } = req.body;

        if (!['Open', 'Closed'].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Use 'Open' or 'Closed'." });
        }

        if (status === 'Closed') {
            await RecruitmentService.close(tenantId, req.params.id, req.user.id);
        } else {
            await RecruitmentService.publish(tenantId, req.params.id, req.user.id); // Reusing publish for 'Open'
        }

        res.json({ message: `Job status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
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

// --- Applicants ---

exports.getApplicants = async (req, res) => {
    try {
        const tenantId = req.tenantId || req.user.tenantId || req.user.tenant;
        const applicants = await RecruitmentService.getTenantApplications(tenantId);
        res.json(applicants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Public / Candidate ---

exports.applyJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const candidateId = req.user.id; // From auth token
        const applicationData = req.body;

        const result = await RecruitmentService.applyForJob(jobId, candidateId, applicationData);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Add Stage to Workflow
exports.addStageToWorkflow = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { stageName, stageType, assignedInterviewerId, interviewMode, durationMinutes, notes } = req.body;

        if (!stageName || !stageName.trim()) {
            return res.status(400).json({ message: 'Stage name is required' });
        }

        const validTypes = ['Applied', 'Shortlisted', 'Screening', 'Interview', 'Assessment', 'HR', 'Discussion', 'Finalized', 'Rejected'];
        const cleanStageType = (validTypes.find(t => t.toLowerCase() === (stageType || 'Interview').toLowerCase())) || 'Interview';

        const db = req.tenantDB;
        const Requirement = db.model('Requirement');

        const job = await Requirement.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Initialize detailedWorkflow if empty
        if (!job.detailedWorkflow || job.detailedWorkflow.length === 0) {
            job.detailedWorkflow = (job.workflow || ['Applied', 'Shortlisted', 'Interview', 'Finalized']).map((name, index) => ({
                stageName: name,
                stageType: name === 'Applied' || name === 'Shortlisted' || name === 'Finalized' ? name : 'Interview',
                positionIndex: index
            }));
        }

        // Check if stage already exists
        if (job.detailedWorkflow.find(s => s.stageName.toLowerCase() === stageName.trim().toLowerCase())) {
            return res.status(400).json({ message: 'Stage already exists in workflow' });
        }

        const newStage = {
            stageName: stageName.trim(),
            stageType: cleanStageType,
            assignedInterviewerId: assignedInterviewerId || null,
            interviewMode: interviewMode || 'Online',
            durationMinutes: durationMinutes || 30,
            notes: notes || '',
            positionIndex: job.detailedWorkflow.length
        };

        // Insert before 'Finalized'
        const finalizedIndex = job.detailedWorkflow.findIndex(s => s.stageName === 'Finalized');
        if (finalizedIndex !== -1) {
            job.detailedWorkflow.splice(finalizedIndex, 0, newStage);
        } else {
            job.detailedWorkflow.push(newStage);
        }

        // Re-calculate position indices
        job.detailedWorkflow.forEach((s, idx) => s.positionIndex = idx);

        // Keep simple workflow array in sync
        job.workflow = job.detailedWorkflow.map(s => s.stageName);

        await job.save();

        res.json({
            success: true,
            message: 'Stage added successfully',
            workflow: job.workflow,
            detailedWorkflow: job.detailedWorkflow
        });

    } catch (error) {
        console.error('Add Stage Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Reorder Workflow Stages
exports.reorderWorkflowStages = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { workflow, detailedWorkflow } = req.body;

        if (!workflow || !Array.isArray(workflow)) {
            return res.status(400).json({ message: 'Workflow array is required' });
        }

        const tenantId = req.tenantId || req.user?.tenantId;
        const getTenantDB = require('../utils/tenantDB');
        const db = req.tenantDB || await getTenantDB(tenantId);

        if (!db) {
            return res.status(500).json({ message: 'Database connection failed' });
        }

        const Requirement = db.model('Requirement');

        const job = await Requirement.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // Validation: Ensure "Applied" is first
        if (workflow[0] !== 'Applied') {
            return res.status(400).json({ message: '"Applied" must be the first stage' });
        }

        // Helper to ensure stageType is valid for the enum
        const validTypes = ['Applied', 'Shortlisted', 'Screening', 'Interview', 'Assessment', 'HR', 'Discussion', 'Finalized', 'Rejected'];
        const cleanStageType = (type) => {
            if (!type) return 'Interview';
            // Case-insensitive check
            const found = validTypes.find(t => t.toLowerCase() === type.toLowerCase());
            return found || 'HR'; // Fallback if unknown
        };

        // Update the workflow order
        job.workflow = workflow;

        if (detailedWorkflow && Array.isArray(detailedWorkflow)) {
            job.detailedWorkflow = detailedWorkflow.map((s, idx) => ({
                ...s,
                stageType: cleanStageType(s.stageType || s.type),
                positionIndex: idx
            }));
        } else {
            // If only workflow names provided, reorder existing detailedWorkflow
            const newDetailed = workflow.map((name, idx) => {
                const existing = job.detailedWorkflow.find(s => s.stageName === name);
                if (existing) {
                    existing.positionIndex = idx;
                    existing.stageType = cleanStageType(existing.stageType);
                    return existing;
                }
                return {
                    stageName: name,
                    stageType: name === 'Applied' ? 'Applied' : (name === 'Shortlisted' ? 'Shortlisted' : (name === 'Finalized' ? 'Finalized' : 'Interview')),
                    positionIndex: idx
                };
            });
            job.detailedWorkflow = newDetailed;
        }

        await job.save();

        res.json({
            success: true,
            message: 'Workflow order updated successfully',
            workflow: job.workflow,
            detailedWorkflow: job.detailedWorkflow
        });

    } catch (error) {
        console.error('Reorder Workflow Error:', error);
        res.status(500).json({ message: error.message });
    }
};

