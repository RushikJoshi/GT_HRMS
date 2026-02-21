const mongoose = require('mongoose');
const getTenantDB = require('../utils/tenantDB');
const { getBGVModels } = require('../utils/bgvModels');

class RecruitmentService {

    // Helper to resolve Tenant DB models dynamically
    async getModels(tenantId) {
        if (!tenantId) throw new Error("Tenant ID is required for Recruitment Service");
        const db = await getTenantDB(tenantId);
        return {
            Requirement: db.model('Requirement'),
            RequirementDraft: db.model('RequirementDraft'),
            Applicant: db.model('Applicant'),
            Position: db.model('Position'),
            Employee: db.model('Employee')
        };
    }

    /**
     * Step-by-Step Draft Saving
     */
    async saveDraft(tenantId, step, data, userId, draftId = null) {
        const { RequirementDraft } = await this.getModels(tenantId);

        let draft;
        if (draftId) {
            draft = await RequirementDraft.findOne({ _id: draftId, tenant: tenantId });
        }

        if (!draft) {
            draft = new RequirementDraft({
                tenant: tenantId,
                createdBy: userId
            });
        }

        // Map the payload to the specific step
        if (step === 1) {
            draft.step1 = {
                positionId: data.positionId || undefined,
                department: data.department,
                jobType: data.jobType,
                workMode: data.workMode,
                location: data.location,
                vacancy: data.vacancy
            };
            draft.currentStep = 1;
        } else if (step === 2) {
            draft.step2 = {
                jobTitle: data.jobTitle,
                salaryMin: data.salaryMin,
                salaryMax: data.salaryMax,
                experienceMin: data.experienceMin,
                experienceMax: data.experienceMax,
                priority: data.priority,
                visibility: data.visibility || 'Public',
                hiringManager: data.hiringManager || undefined,
                interviewPanel: (data.interviewPanel && data.interviewPanel.length > 0) ? data.interviewPanel : []
            };
            draft.currentStep = 2;
        } else if (step === 3) {
            draft.step3 = {
                description: data.description,
                responsibilities: data.responsibilities,
                requiredSkills: data.requiredSkills,
                optionalSkills: data.optionalSkills,
                education: data.education,
                certifications: data.certifications,
                keywords: data.keywords
            };
            draft.currentStep = 3;
        } else if (step === 4) {
            draft.step4 = {
                pipelineStages: data.pipelineStages || data.workflow || []
            };
            draft.currentStep = 4;
        }

        return await draft.save();
    }

    /**
     * Final Transition from Draft to Requirement
     */
    async publishJob(tenantId, draftId, userId) {
        const { Requirement, Position, RequirementDraft } = await this.getModels(tenantId);

        const draft = await RequirementDraft.findById(draftId);
        if (!draft) throw new Error("Draft session expired or not found.");

        // 1. Generate ID
        const jobId = await this.generateJobId(tenantId, { department: draft.step1.department });

        // 2. Validate and sanitize interviewer ObjectIds
        const validateObjectId = (id) => {
            if (!id) return null;
            if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
                return new mongoose.Types.ObjectId(id);
            }
            if (id instanceof mongoose.Types.ObjectId) return id;
            return null;
        };

        const sanitizedHiringManager = validateObjectId(draft.step2.hiringManager);
        const sanitizedInterviewPanel = (draft.step2.interviewPanel || [])
            .map(validateObjectId)
            .filter(id => id !== null);

        const sanitizedPipelineStages = (draft.step4.pipelineStages || []).map((stage, index) => ({
            ...stage._doc, // Ensure we copy clean data + virtuals if any? No, just copy properties
            ...stage, // If stage is plain object
            orderIndex: index + 1,
            assignedInterviewers: (stage.assignedInterviewers || [])
                .map(validateObjectId)
                .filter(id => id !== null)
        }));

        // 3. Map data to Requirement Model (matching Requirement.js schema)
        const requirement = new Requirement({
            tenant: tenantId,
            jobOpeningId: jobId,
            positionId: draft.step1.positionId,
            department: draft.step1.department,
            jobTitle: draft.step2.jobTitle || draft.step1.jobTitle,

            jobDetails: {
                salaryMin: draft.step2.salaryMin,
                salaryMax: draft.step2.salaryMax,
                experienceMin: draft.step2.experienceMin,
                experienceMax: draft.step2.experienceMax,
                priority: draft.step2.priority,
                visibility: draft.step2.visibility,
                workMode: draft.step1.workMode,
                jobType: draft.step1.jobType,
                hiringManager: sanitizedHiringManager,
                interviewPanel: sanitizedInterviewPanel
            },

            jobDescription: {
                roleOverview: draft.step3.description,
                responsibilities: draft.step3.responsibilities,
                keywords: draft.step3.keywords,
                education: draft.step3.education,
                certifications: draft.step3.certifications
            },

            requiredSkills: (draft.step3.requiredSkills || []).map(s => ({ name: s, weight: 40 })),
            preferredSkills: (draft.step3.optionalSkills || []).map(s => ({ name: s, weight: 10 })),

            // Initialize matchingConfig with default weights
            matchingConfig: {
                skillWeight: 40,
                experienceWeight: 20,
                educationWeight: 10,
                similarityWeight: 20,
                preferredBonus: 10
            },

            pipelineStages: sanitizedPipelineStages,

            vacancy: draft.step1.vacancy || 1,
            status: 'Open',
            createdBy: userId
        });

        const saved = await requirement.save();

        // 4. Update Position status (if linked to a position master)
        if (draft.step1.positionId) {
            await Position.findByIdAndUpdate(draft.step1.positionId, { hiringStatus: 'Open' });
        }

        // 5. Cleanup Draft
        await RequirementDraft.deleteOne({ _id: draftId });

        return saved;
    }


    // Helper to generate next Job ID
    async generateJobId(tenantId, data = {}) {
        try {
            const companyIdConfig = require('../controllers/companyIdConfig.controller');
            const result = await companyIdConfig.generateIdInternal({
                tenantId: tenantId,
                entityType: 'JOB',
                increment: true,
                extraReplacements: {
                    '{{DEPT}}': data.department || 'GEN'
                }
            });
            return result.id;
        } catch (err) {
            console.error('Error generating Job ID:', err);
            // Fallback
            return `JOB-${Date.now()}`;
        }
    }

    async createRequirement(tenantId, data, userId) {
        try {
            console.log('[DEBUG] createRequirement START', { tenantId, userId });
            const { Requirement, Position } = await this.getModels(tenantId);

            // 1. Resolve Position details if positionId provided
            let finalData = { ...data };
            if (data.positionId) {
                const pos = await Position.findById(data.positionId);
                if (pos) {
                    finalData.position = pos.jobTitle;
                    finalData.jobTitle = pos.jobTitle;
                    finalData.department = pos.department;
                    // Auto-link hiring status?
                    await Position.findByIdAndUpdate(data.positionId, { hiringStatus: 'Open' });
                }
            }

            // 2. Auto-generate Job ID via helper
            const jobOpeningId = await this.generateJobId(tenantId, finalData);
            console.log('[DEBUG] Generated Job ID:', jobOpeningId);

            const requirement = new Requirement({
                ...finalData,
                tenant: tenantId,
                jobOpeningId,
                createdBy: userId
            });
            return await requirement.save();

        } catch (err) {
            console.error('[CRITICAL ERROR] createRequirement failed:', err);
            throw err; // Re-throw to controller
        }
    }

    async getRequirements(tenantId, query) {
        const { Requirement } = await this.getModels(tenantId);
        const filter = { tenant: tenantId };

        // Enhance safe filtering logic...
        if (query.status) filter.status = query.status;
        if (query.visibility) filter.visibility = query.visibility;

        if (query && (query.$or || query.visibility || query.status)) {
            Object.assign(filter, query);
        }

        // Pagination Logic
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Requirement.countDocuments(filter);
        const requirements = await Requirement.find(filter)
            .sort({ updatedAt: -1 }) // Sort by last updated, newest first
            .skip(skip)
            .limit(limit);

        // Auto-patch missing Job IDs and hydrate pipelineStages for legacy data
        try {
            const updates = requirements.map(async (req) => {
                try {
                    let changed = false;

                    if (!req.jobOpeningId) {
                        console.log(`[Backfill] Generating ID for Requirement ${req._id}`);
                        req.jobOpeningId = await this.generateJobId(tenantId);
                        changed = true;
                    }

                    // Hydrate pipelineStages from workflow if missing
                    if ((!req.pipelineStages || req.pipelineStages.length === 0) && req.workflow && req.workflow.length > 0) {
                        console.log(`[Migration] Hydrating pipelineStages for Requirement ${req._id}`);
                        req.pipelineStages = req.workflow
                            .filter(stage => !['Applied', 'Finalized', 'Rejected'].includes(stage))
                            .map((stage, idx) => ({
                                stageName: stage,
                                stageType: stage.toLowerCase().includes('interview') ? 'Interview' : 'Round',
                                order: idx + 1,
                                durationMinutes: 30,
                                mode: 'In-person'
                            }));
                        changed = true;
                    }

                    if (changed) {
                        await req.save();
                    }
                } catch (err) {
                    console.error(`[getRequirements] Failed to patch requirement ${req._id}:`, err.message);
                    // Continue with other requirements even if one fails
                }
            });
            await Promise.all(updates);
        } catch (err) {
            console.error('[getRequirements] Auto-patch failed, continuing anyway:', err.message);
            // Don't throw - return requirements even if patching fails
        }


        return {
            requirements,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getRequirementById(tenantId, id) {
        const { Requirement } = await this.getModels(tenantId);
        return await Requirement.findOne({ _id: id, tenant: tenantId });
    }

    async updateRequirement(tenantId, id, data, userId) {
        const { Requirement } = await this.getModels(tenantId);
        const reqDoc = await Requirement.findOne({ _id: id, tenant: tenantId });

        if (!reqDoc) {
            throw new Error("Requirement not found");
        }

        if (data.status === 'Closed' && reqDoc.positionId) {
            const { Position } = await this.getModels(tenantId);
            await Position.findByIdAndUpdate(reqDoc.positionId, { hiringStatus: 'Closed' });
        }

        // Use findByIdAndUpdate to perform partial update without validating unrelated fields
        const updates = { ...data, updatedBy: userId };
        delete updates._id;
        delete updates.tenant;
        delete updates.jobCode;
        delete updates.createdAt;
        delete updates.jobOpeningId; // immutable

        return await Requirement.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );
    }

    async submitForApproval(tenantId, id, userId) {
        const { Requirement } = await this.getModels(tenantId);
        const req = await Requirement.findOne({ _id: id, tenant: tenantId });
        if (!req) throw new Error("Requirement not found");

        req.approvalStatus = 'Pending';
        req.status = 'PendingApproval';
        return await req.save();
    }

    async approveReject(tenantId, id, status, remarks, userId) {
        const { Requirement } = await this.getModels(tenantId);
        const req = await Requirement.findOne({ _id: id, tenant: tenantId });
        if (!req) throw new Error("Requirement not found");

        if (status === 'Approved') {
            req.approvalStatus = 'Approved';
            req.approvedBy = userId;
            // Do we auto-open? Maybe not.
        } else if (status === 'Rejected') {
            req.approvalStatus = 'Rejected';
            // req.remarks = remarks;
        }
        return await req.save();
    }

    async publish(tenantId, id, userId) {
        const { Requirement } = await this.getModels(tenantId);
        const req = await Requirement.findOne({ _id: id, tenant: tenantId });
        if (!req) throw new Error("Requirement not found");
        // if (req.approvalStatus !== 'Approved') throw new Error("Job must be approved before publishing");

        req.status = 'Open';
        req.publishedAt = new Date();
        return await req.save();
    }

    async close(tenantId, id, userId) {
        const { Requirement, Position } = await this.getModels(tenantId);
        const req = await Requirement.findOne({ _id: id, tenant: tenantId });
        if (!req) throw new Error("Requirement not found");

        req.status = 'Closed';
        req.closedAt = new Date();
        req.closedBy = userId;
        const saved = await req.save();

        if (req.positionId) {
            await Position.findByIdAndUpdate(req.positionId, { hiringStatus: 'Closed' });
        }
        return saved;
    }

    async deleteRequirement(tenantId, id) {
        const { Requirement } = await this.getModels(tenantId);
        return await Requirement.deleteOne({ _id: id, tenant: tenantId });
    }

    // --- Applicants ---

    async getTenantApplications(tenantId) {
        const { Applicant } = await this.getModels(tenantId);
        const db = await getTenantDB(tenantId);

        // Auto-expire offers on every fetch (backend-controlled)
        const now = new Date();
        try {
            await Applicant.updateMany(
                {
                    tenant: tenantId,
                    offerStatus: 'SENT',
                    offerExpiryAt: { $exists: true, $ne: null, $lt: now }
                },
                {
                    $set: { offerStatus: 'EXPIRED', status: 'Offer Expired' },
                    $push: {
                        timeline: {
                            status: 'Offer Expired',
                            message: 'Offer expired automatically (system).',
                            updatedBy: 'System',
                            timestamp: now
                        }
                    }
                }
            );
        } catch (e) {
            console.warn('[RecruitmentService.getTenantApplications] Auto-expiry skipped:', e.message);
        }

        // Defensive: Ensure EmployeeSalarySnapshot is registered for populate to work
        if (!db.models.EmployeeSalarySnapshot) {
            try { db.model('EmployeeSalarySnapshot', require('../models/EmployeeSalarySnapshot')); } catch (e) { }
        }

        // Need to populate correctly
        const applicants = await Applicant.find({ tenant: tenantId })
            .populate('requirementId', 'jobTitle jobOpeningId')
            .populate('candidateId', 'name email mobile')
            .populate('salarySnapshotId')
            .sort({ createdAt: -1 })
            .lean();

        // Attach BGV status to each applicant.
        // Some BGV cases are employee-linked only and may have null applicationId.
        let bgvByApplicationId = new Map();
        try {
            const { BGVCase } = await getBGVModels(tenantId);
            const bgvCases = await BGVCase.find({
                tenant: tenantId,
                applicationId: { $exists: true, $ne: null }
            })
                .select('_id applicationId overallStatus')
                .lean();

            bgvByApplicationId = new Map(
                bgvCases
                    .filter((b) => b && b.applicationId)
                    .map((b) => [String(b.applicationId), b])
            );
        } catch (e) {
            // Do not fail applicant listing due to optional BGV linkage issues.
            console.warn('[RecruitmentService.getTenantApplications] BGV lookup skipped:', e.message);
        }

        const applicantsWithBGV = applicants.map((app) => {
            const bgv = bgvByApplicationId.get(String(app._id));
            return {
                ...app,
                bgvStatus: bgv ? bgv.overallStatus : 'NOT_INITIATED',
                bgvId: bgv ? bgv._id : null
            };
        });

        return applicantsWithBGV;
    }

    async applyForJob(jobId, candidateId, data) {
        // ... existing legacy code ...
        throw new Error("applyForJob in Service requires tenantId refactoring. Use public controller logic.");
    }

    async applyInternal(tenantId, requirementId, userTokenPayload) {
        const db = await getTenantDB(tenantId);
        const Applicant = db.model('Applicant');
        const Requirement = db.model('Requirement');

        let employeeData = null;

        // 1. Fetch Employee Details if Role is Employee
        if (userTokenPayload.role === 'employee' || userTokenPayload.employeeId) {
            const Employee = db.model('Employee');
            const emp = await Employee.findById(userTokenPayload.id);
            if (!emp) throw new Error("Employee profile not found");

            employeeData = {
                name: `${emp.firstName} ${emp.lastName}`,
                email: emp.email,
                mobile: emp.mobile || 'N/A',
                employeeId: emp.employeeId
            };
        } else {
            // Fallback for non-employees (e.g. Admin testing) - requires email in token
            if (!userTokenPayload.email) throw new Error("User email not found for application");
            employeeData = {
                name: userTokenPayload.name || 'Unknown User',
                email: userTokenPayload.email,
                mobile: 'N/A',
                employeeId: null
            };
        }

        // 2. Check Requirement
        const job = await Requirement.findOne({ _id: requirementId, tenant: tenantId });
        if (!job) throw new Error("Job not found");
        if (job.status !== 'Open') throw new Error("Job is not open");
        if (!['Internal', 'Both'].includes(job.visibility)) throw new Error("This job is not open for internal application");

        // 3. Check Duplicate
        const existing = await Applicant.findOne({
            requirementId: requirementId,
            email: employeeData.email
        });
        if (existing) throw new Error("You have already applied for this position");

        // 4. Create Applicant
        // Default to 'Applied' if no pipeline is defined, else use first stage
        const defaultStatus = (job.pipelineStages && job.pipelineStages.length > 0)
            ? job.pipelineStages[0].stageName
            : 'Applied';

        const applicant = new Applicant({
            tenant: tenantId,
            requirementId: requirementId,
            name: employeeData.name,
            email: employeeData.email,
            mobile: employeeData.mobile,
            status: defaultStatus,
            timeline: [{
                status: defaultStatus,
                message: `Application submitted via Internal Channel (Role: ${userTokenPayload.role})`,
                timestamp: new Date()
            }],
            intro: `Internal Application (ID: ${employeeData.employeeId || 'N/A'})`,
            source: 'Internal'
        });

        return await applicant.save();
    }


    async getApplicantApplications(tenantId, userTokenPayload) {
        const db = await getTenantDB(tenantId);
        const Applicant = db.model('Applicant');

        // Resolve Email
        let emailToSearch = userTokenPayload.email;

        // If no email in token (employee case), fetch from DB
        if (!emailToSearch && (userTokenPayload.role === 'employee' || userTokenPayload.employeeId)) {
            const Employee = db.model('Employee');
            const emp = await Employee.findById(userTokenPayload.id);
            if (emp) emailToSearch = emp.email;
        }

        if (!emailToSearch) {
            // If still no email found, return empty or throw
            return [];
        }

        return await Applicant.find({ email: emailToSearch })
            .populate('requirementId', 'jobTitle department location status jobOpeningId')
            .sort({ createdAt: -1 });
    }
}

module.exports = new RecruitmentService();
