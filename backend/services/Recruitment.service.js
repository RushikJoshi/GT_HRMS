const mongoose = require('mongoose');
const getTenantDB = require('../utils/tenantDB');
const { getBGVModels } = require('../utils/bgvModels');
const OfferSchema = require('../models/Offer');
// Define GlobalOfferModel to access the shared 'offers' collection
const GlobalOfferModel = mongoose.models.GlobalOffer || mongoose.model('GlobalOffer', OfferSchema, 'offers');

class RecruitmentService {

    // Helper to resolve Tenant DB models dynamically
    async getModels(tenantId) {
        if (!tenantId) throw new Error("Tenant ID is required for Recruitment Service");
        const db = await getTenantDB(tenantId);
        return {
            Requirement: db.model('Requirement'),
            Applicant: db.model('Applicant'),
            Position: db.model('Position'),
            Department: db.model('Department'),
            JobPipeline: db.model('JobPipeline'),
            PipelineTemplate: db.model('PipelineTemplate'),
            CandidateStageHistory: db.model('CandidateStageHistory')
        };
    }

    // Helper to generate next Job ID
    async generateJobId(tenantId, data = {}) {
        try {
            const companyIdConfig = require('../controllers/companyIdConfig.controller');
            // Resolve Department Code if Name is provided
            let deptCode = 'GEN';
            if (data.department) {
                try {
                    const { Department } = await this.getModels(tenantId);
                    const dept = await Department.findOne({ name: data.department });
                    if (dept && dept.code) {
                        deptCode = dept.code;
                    } else if (data.department.length > 0) {
                        deptCode = data.department.substring(0, 3).toUpperCase();
                    }
                } catch (e) {
                    console.warn("Error fetching department code for Job ID:", e.message);
                }
            }

            const result = await companyIdConfig.generateIdInternal({
                tenantId: tenantId,
                entityType: 'JOB_OPENING',
                increment: true,
                extraReplacements: {
                    '{{DEPT}}': deptCode
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
            if (!data.positionId) {
                throw new Error("Job Opening must be linked to a valid Position ID.");
            }

            if (data.positionId) {
                const pos = await Position.findById(data.positionId);
                if (!pos) throw new Error("Linked Position not found.");

                // 1. Position Status Validation
                if (['Filled', 'Cancelled', 'Inactive'].includes(pos.status)) {
                    throw new Error(`Position ${pos.positionId} is currently '${pos.status}'. Recruitment cannot be initialized.`);
                }

                // 2. Duplicate Job Check
                const existingOpenJob = await Requirement.findOne({
                    tenant: tenantId,
                    positionId: data.positionId,
                    status: 'Open'
                });
                if (existingOpenJob) {
                    throw new Error(`A Job Opening (${existingOpenJob.jobOpeningId}) is already OPEN for this Position. Please close it before creating a new one.`);
                }

                // 3. Headcount Validation
                // Count vacancies in OTHER Open jobs for this position (though we just blocked duplicates above, logic kept for future multi-posting support)
                const openJobs = await Requirement.find({
                    tenant: tenantId,
                    positionId: data.positionId,
                    status: 'Open'
                });

                const reservedVacancy = openJobs.reduce((acc, job) => acc + (job.vacancy || 0), 0);
                const currentFilled = pos.filledCount || 0;
                const totalHeadCount = pos.headCount || 1;
                const requestedVacancy = Number(data.vacancy) || 1;

                const available = totalHeadCount - currentFilled - reservedVacancy;

                if (requestedVacancy > available) {
                    throw new Error(`Vacancy exceeds Position Head Count limit.\n\nTotal Approved: ${totalHeadCount}\nCurrently Filled: ${currentFilled}\nOpen Requirements: ${reservedVacancy}\n\nAvailable: ${available} (Requested: ${requestedVacancy})`);
                }

                finalData.position = pos.jobTitle;
                finalData.jobTitle = pos.jobTitle;
                finalData.department = pos.department;

                // Salary Validation logic
                const jobMin = Number(data.salaryMin) || 0;
                const jobMax = Number(data.salaryMax) || 0;
                const posMin = pos.baseSalaryRange?.min || 0;
                const posMax = pos.baseSalaryRange?.max || 0;

                if (jobMin > jobMax) {
                    throw new Error("Minimum salary cannot be greater than Maximum salary.");
                }

                if (!data.isSalaryOverride) {
                    if (jobMin < posMin) {
                        throw new Error(`Minimum Salary (₹${jobMin.toLocaleString()}) is below the Approved Position Budget (₹${posMin.toLocaleString()}). Enable 'Manual Override' to proceed.`);
                    }
                    if (jobMax > posMax) {
                        throw new Error(`Maximum Salary (₹${jobMax.toLocaleString()}) exceeds the Approved Position Budget (₹${posMax.toLocaleString()}). Enable 'Manual Override' to proceed.`);
                    }
                }
            }

            // 3. External Posting Validation
            if (finalData.visibility === 'External' || finalData.visibility === 'Both') {
                // Role Overview Length
                if (!finalData.description || finalData.description.trim().length < 50) {
                    throw new Error("Role Overview (Description) must be at least 50 characters for public postings.");
                }

                // Responsibilities Cleaning & Validation
                const rawResponsibilities = Array.isArray(finalData.responsibilities) ? finalData.responsibilities : [];

                // Clean: Trim & Filter Empty & Unique
                const cleanedResponsibilities = [...new Set(
                    rawResponsibilities
                        .map(r => String(r).trim())
                        .filter(r => r.length > 0)
                )];

                // Min Count (Configurable: Default 1 for External)
                if (cleanedResponsibilities.length < 1) {
                    throw new Error("At least 1 Key Responsibility is required for public postings.");
                }

                // Min Length per Item (Configurable: Default 5 chars)
                cleanedResponsibilities.forEach((r, idx) => {
                    if (r.length < 5) {
                        throw new Error(`Responsibility #${idx + 1} ("${r.substring(0, 15)}...") is too short. Minimum 5 characters required.`);
                    }
                });

                // Update finalData with standardized clean array
                finalData.responsibilities = cleanedResponsibilities;

                // Skills check
                if (!Array.isArray(finalData.requiredSkills) || finalData.requiredSkills.length < 1) {
                    throw new Error("At least 1 Required Skill is mandatory.");
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
            const savedReq = await requirement.save();

            // Create Dedicated Job Pipeline
            const JobPipeline = (await this.getModels(tenantId)).JobPipeline;
            const jobPipeline = new JobPipeline({
                tenant: tenantId,
                requirementId: savedReq._id,
                stages: finalData.detailedWorkflow || [],
                createdBy: userId
            });
            await jobPipeline.save();

            return savedReq;

        } catch (err) {
            console.error('[CRITICAL ERROR] createRequirement failed:', err);
            throw err; // Re-throw to controller
        }
    }

    async getRequirements(tenantId, query) {
        const { Requirement, Applicant } = await this.getModels(tenantId);
        const filter = { tenant: tenantId };

        if (query.status) filter.status = query.status;
        if (query.visibility) filter.visibility = query.visibility;
        if (query.positionId) filter.positionId = query.positionId;

        // Handle $or specifically if passed, but be careful
        if (query.$or) filter.$or = query.$or;

        // NOTE: We do NOT spread `query` into `filter` to avoid `limit`, `page`, etc. leaking into the DB query.

        // Pagination Logic
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Requirement.countDocuments(filter);
        const requirements = await Requirement.find(filter)
            .sort({ updatedAt: -1 }) // Sort by last updated, newest first
            .skip(skip)
            .limit(limit)
            .lean();

        // Calculate hiredCount for each requirement and backfill IDs
        const enhancedRequirements = await Promise.all(requirements.map(async (req) => {
            // 1. Count Onboarded Applicants
            const hiredCount = await Applicant.countDocuments({
                requirementId: req._id,
                isOnboarded: true
            });

            // 2. Auto-patch missing Job IDs for legacy data
            if (!req.jobOpeningId) {
                console.log(`[Backfill] Generating ID for Requirement ${req._id}`);
                req.jobOpeningId = await this.generateJobId(tenantId, req);
                await Requirement.findByIdAndUpdate(req._id, { jobOpeningId: req.jobOpeningId });
            }

            return {
                ...req,
                hiredCount
            };
        }));

        return {
            requirements: enhancedRequirements,
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

        // Merge updates
        Object.keys(data).forEach(key => {
            // Prevent updating immutable fields if necessary, or let Mongoose handle it
            // For now allow flexible updates but audit who updated
            if (key !== '_id' && key !== 'tenant' && key !== 'jobCode' && key !== 'createdAt') {
                reqDoc[key] = data[key];
            }
        });

        reqDoc.updatedBy = userId;

        // This will trigger pre('save') validation hooks
        return await reqDoc.save();
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
        const { Requirement } = await this.getModels(tenantId);
        const req = await Requirement.findOne({ _id: id, tenant: tenantId });
        if (!req) throw new Error("Requirement not found");

        req.status = 'Closed';
        req.closedAt = new Date();
        req.closedBy = userId;
        return await req.save();
    }

    async deleteRequirement(tenantId, id) {
        const { Requirement } = await this.getModels(tenantId);
        return await Requirement.deleteOne({ _id: id, tenant: tenantId });
    }

    // --- Applicants ---

    async getTenantApplications(tenantId) {
        const { Applicant } = await this.getModels(tenantId);
        const db = await getTenantDB(tenantId);

        // Defensive: Ensure EmployeeSalarySnapshot is registered for populate to work
        if (!db.models.EmployeeSalarySnapshot) {
            try { db.model('EmployeeSalarySnapshot', require('../models/EmployeeSalarySnapshot')); } catch (e) { }
        }

        // Need to populate correctly (Manually populate Offer from Global Collection)
        const applicants = await Applicant.find({ tenant: tenantId })
            .populate('requirementId', 'jobTitle jobOpeningId vacancy')
            .populate('candidateId', 'name email mobile')
            .populate('salarySnapshotId')
            .sort({ createdAt: -1 })
            .lean();

        // Manual Population of Offer
        const offerIds = applicants.map(a => a.offerId).filter(id => id);
        let offers = [];
        if (offerIds.length > 0) {
            try {
                offers = await GlobalOfferModel.find({ _id: { $in: offerIds } }).lean();
            } catch (err) {
                console.error("Error fetching global offers:", err);
            }
        }

        const applicantsWithOffers = applicants.map(app => {
            if (app.offerId) {
                app.offerId = offers.find(o => o._id.toString() === app.offerId.toString()) || app.offerId;
            }
            return app;
        });

        // Attach BGV Status and calculate hiredCount for requirements
        const { BGVCase } = await getBGVModels(tenantId);
        const bgvCases = await BGVCase.find({ tenant: tenantId });

        // Optimization: Get hired counts for all requirements involved
        const reqIds = [...new Set(applicantsWithOffers.map(a => a.requirementId?._id).filter(id => id))];
        const hiredCounts = await Promise.all(reqIds.map(async (id) => {
            const count = await Applicant.countDocuments({ requirementId: id, isOnboarded: true });
            return { id: id.toString(), count };
        }));

        const applicantsWithExtras = applicantsWithOffers.map(app => {
            const bgv = bgvCases.find(b => b.applicationId.toString() === app._id.toString());

            // Attach hiredCount to the requirementId object if it exists
            if (app.requirementId && typeof app.requirementId === 'object') {
                const hc = hiredCounts.find(h => h.id === app.requirementId._id.toString());
                app.requirementId.hiredCount = hc ? hc.count : 0;
            }

            return {
                ...app,
                bgvStatus: bgv ? bgv.overallStatus : 'NOT_INITIATED',
                bgvId: bgv ? bgv._id : null
            };
        });

        return applicantsWithExtras;
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
        const applicant = new Applicant({
            tenant: tenantId,
            requirementId: requirementId,
            name: employeeData.name,
            email: employeeData.email,
            mobile: employeeData.mobile,
            status: 'Applied',
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

        const applicants = await Applicant.find({ email: emailToSearch })
            .populate('requirementId', 'jobTitle department location status jobOpeningId')
            .sort({ createdAt: -1 })
            .lean();

        // Manual Population of Offer from Global Collection
        const offerIds = applicants.map(a => a.offerId).filter(id => id);
        if (offerIds.length > 0) {
            try {
                const offers = await GlobalOfferModel.find({ _id: { $in: offerIds } }).lean();
                applicants.forEach(app => {
                    if (app.offerId) {
                        app.offerId = offers.find(o => o._id.toString() === app.offerId.toString()) || app.offerId;
                    }
                });
            } catch (err) {
                console.error("Error populating global offers:", err);
            }
        }

        return applicants;
    }
}

module.exports = new RecruitmentService();
