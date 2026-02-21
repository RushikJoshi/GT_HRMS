/**
 * ═══════════════════════════════════════════════════════════════════════
 * RECRUITMENT WORKFLOW CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Orchestrates the complete recruitment workflow:
 * Job → Candidate → Application → Interview → Offer → Employee
 * 
 * This controller enforces ALL business rules and status validations.
 * 
 * @version 2.0
 * @author HRMS Architect
 */

const mongoose = require('mongoose');
const {
    generateApplicationId,
    generateOfferId,
    generateEmployeeId,
    generateInterviewId
} = require('../utils/idGenerator');

/**
 * Get models for tenant database
 */
function getModels(db) {
    if (!db) throw new Error('Tenant database not available');
    const Application = db.models?.Application || db.model('Application', require('../models/Application'));
    const Offer = db.models?.Offer || db.model('Offer', require('../models/Offer'));
    const Requirement = db.models?.Requirement || db.model('Requirement', require('../models/Requirement'));
    const Candidate = db.models?.Candidate || db.model('Candidate', require('../models/Candidate'));
    const Employee = db.models?.Employee || db.model('Employee', require('../models/Employee'));
    const Interview = db.models?.Interview || db.model('Interview', require('../models/Interview'));
    const SalaryStructure = db.models?.SalaryStructure || db.model('SalaryStructure', require('../models/SalaryStructure'));

    return { Application, Offer, Requirement, Candidate, Employee, Interview, SalaryStructure };
}

// ═══════════════════════════════════════════════════════════════════
// 1. CREATE APPLICATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Create new job application
 * 
 * Business Rules:
 * - Job must be OPEN
 * - Candidate cannot apply to same job twice
 * - All required candidate info must be provided
 */
exports.createApplication = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId || req.body.tenantId;
        const { jobId, candidateId, candidateInfo } = req.body;

        const { Application, Requirement, Candidate } = getModels(db);

        // ─────────────────────────────────────────────────────────────────
        // VALIDATION 1: Check if job exists and is OPEN
        // ─────────────────────────────────────────────────────────────────
        const job = await Requirement.findOne({ _id: jobId, tenant: tenantId });

        if (!job) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (job.status !== 'Open') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot apply. Job status is: ${job.status}`,
                code: 'JOB_NOT_OPEN'
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // VALIDATION 2: Check if candidate exists
        // ─────────────────────────────────────────────────────────────────
        const candidate = await Candidate.findOne({ _id: candidateId, tenant: tenantId });

        if (!candidate) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Candidate not found'
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // VALIDATION 3: Check for duplicate application
        // ─────────────────────────────────────────────────────────────────
        const hasApplied = await Application.hasApplied(tenantId, jobId, candidateId);

        if (hasApplied) {
            await session.abortTransaction();
            return res.status(409).json({
                success: false,
                message: 'Candidate has already applied to this job',
                code: 'DUPLICATE_APPLICATION'
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // CREATE APPLICATION
        // ─────────────────────────────────────────────────────────────────
        const applicationId = await generateApplicationId(db);

        const application = new Application({
            applicationId,
            tenant: tenantId,
            jobId,
            jobOpeningId: job.jobOpeningId,
            candidateId,
            candidateReadableId: candidate.candidateId, // Assuming candidate has this field
            candidateInfo: {
                name: candidateInfo.name || candidate.name,
                email: candidateInfo.email || candidate.email,
                mobile: candidateInfo.mobile || candidate.mobile,
                fatherName: candidateInfo.fatherName,
                dob: candidateInfo.dob,
                address: candidateInfo.address,
                experience: candidateInfo.experience,
                currentCompany: candidateInfo.currentCompany,
                currentDesignation: candidateInfo.currentDesignation,
                currentCTC: candidateInfo.currentCTC,
                expectedCTC: candidateInfo.expectedCTC,
                noticePeriod: candidateInfo.noticePeriod,
                resume: candidateInfo.resume || candidate.resume,
                coverLetter: candidateInfo.coverLetter
            },
            status: 'APPLIED',
            source: req.body.source || 'CAREER_PORTAL',
            priority: req.body.priority || 'MEDIUM',
            tags: req.body.tags || []
        });

        // Add initial status history
        application.statusHistory.push({
            to: 'APPLIED',
            changedBy: candidate.name,
            changedById: candidateId,
            reason: 'Application submitted',
            timestamp: new Date()
        });

        await application.save({ session });
        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: {
                applicationId: application.applicationId,
                _id: application._id,
                status: application.status,
                jobTitle: job.jobTitle,
                appliedDate: application.createdAt
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Create Application Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create application',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// ═══════════════════════════════════════════════════════════════════
// 2. CHANGE APPLICATION STATUS
// ═══════════════════════════════════════════════════════════════════

/**
 * Update application status with validation
 * 
 * Allowed transitions are enforced by the Application model
 */
exports.updateApplicationStatus = async (req, res) => {
    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId;
        const user = req.user;
        const { applicationId } = req.params;
        const { status, reason } = req.body;

        const { Application } = getModels(db);

        const application = await Application.findOne({
            _id: applicationId,
            tenant: tenantId
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // Use the model's changeStatus method (includes validation)
        try {
            application.changeStatus(status, user._id, user.name || user.email, reason);
            await application.save();

            res.json({
                success: true,
                message: `Application status updated to ${status}`,
                data: {
                    applicationId: application.applicationId,
                    status: application.status,
                    previousStatus: application.previousStatus
                }
            });

        } catch (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError.message,
                code: 'INVALID_STATUS_TRANSITION'
            });
        }

    } catch (error) {
        console.error('Update Application Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update application status',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════════
// 3. SCHEDULE INTERVIEW
// ═══════════════════════════════════════════════════════════════════

/**
 * Schedule interview for application
 * 
 * Business Rules:
 * - Application must be SHORTLISTED or INTERVIEW status
 * - Interview details must be complete
 */
exports.scheduleInterview = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId;
        const user = req.user;
        const { applicationId } = req.params;
        const interviewData = req.body;

        const { Application, Interview } = getModels(db);

        // ─────────────────────────────────────────────────────────────────
        // VALIDATION: Check application status
        // ─────────────────────────────────────────────────────────────────
        const application = await Application.findOne({
            _id: applicationId,
            tenant: tenantId
        });

        if (!application) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        if (!application.canScheduleInterview) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot schedule interview. Current status: ${application.status}`,
                code: 'INVALID_STATUS_FOR_INTERVIEW'
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // CREATE INTERVIEW
        // ─────────────────────────────────────────────────────────────────
        const interviewId = await generateInterviewId(db);

        const interview = new Interview({
            interviewId,
            tenant: tenantId,
            applicationId: application._id,
            candidateId: application.candidateId,
            jobId: application.jobId,
            round: application.interviews.length + 1,
            date: interviewData.date,
            time: interviewData.time,
            mode: interviewData.mode,
            location: interviewData.location,
            interviewerName: interviewData.interviewerName,
            interviewerId: interviewData.interviewerId,
            notes: interviewData.notes,
            status: 'SCHEDULED'
        });

        await interview.save({ session });

        // ─────────────────────────────────────────────────────────────────
        // UPDATE APPLICATION
        // ─────────────────────────────────────────────────────────────────
        application.addInterview(interview._id);
        await application.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Interview scheduled successfully',
            data: {
                interviewId: interview.interviewId,
                round: interview.round,
                date: interview.date,
                time: interview.time,
                applicationStatus: application.status
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Schedule Interview Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to schedule interview',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// ═══════════════════════════════════════════════════════════════════
// 4. CREATE OFFER
// ═══════════════════════════════════════════════════════════════════

/**
 * Create offer letter for selected candidate
 * 
 * Business Rules:
 * - Application must be SELECTED
 * - No existing offer for this application
 * - Salary structure must be provided
 */
exports.createOffer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId;
        const user = req.user;
        const { applicationId } = req.params;
        const offerData = req.body;

        const { Application, Offer, SalaryStructure } = getModels(db);

        // ─────────────────────────────────────────────────────────────────
        // VALIDATION 1: Check application
        // ─────────────────────────────────────────────────────────────────
        const application = await Application.findOne({
            _id: applicationId,
            tenant: tenantId
        }).populate('jobId candidateId');

        if (!application) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        if (!application.canCreateOffer) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot create offer. Status: ${application.status}, Existing offer: ${!!application.offerId}`,
                code: 'CANNOT_CREATE_OFFER'
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // VALIDATION 2: Check salary structure
        // ─────────────────────────────────────────────────────────────────
        const salaryStructure = await SalaryStructure.findOne({
            _id: offerData.salaryStructureId,
            tenant: tenantId
        });

        if (!salaryStructure) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Salary structure not found'
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // CREATE OFFER
        // ─────────────────────────────────────────────────────────────────
        const offerId = await generateOfferId(db);

        // Calculate validity (default: 7 days from now)
        const validUntil = offerData.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const offer = new Offer({
            offerId,
            tenant: tenantId,
            applicationId: application._id,
            applicationReadableId: application.applicationId,
            candidateId: application.candidateId,
            jobId: application.jobId,
            version: 1,

            candidateInfo: {
                name: application.candidateInfo.name,
                email: application.candidateInfo.email,
                mobile: application.candidateInfo.mobile,
                fatherName: application.candidateInfo.fatherName,
                address: application.candidateInfo.address
            },

            jobDetails: {
                title: application.jobId.jobTitle,
                department: offerData.department || application.jobId.department,
                designation: offerData.designation,
                location: offerData.location,
                reportingTo: offerData.reportingTo
            },

            salaryStructureId: salaryStructure._id,
            salarySnapshot: {
                ctc: salaryStructure.ctc,
                grossSalary: salaryStructure.grossSalary,
                netSalary: salaryStructure.netSalary,
                earnings: salaryStructure.earnings || [],
                deductions: salaryStructure.deductions || [],
                employerContributions: salaryStructure.employerContributions || []
            },

            joiningDate: offerData.joiningDate,
            probationPeriod: offerData.probationPeriod || 3,
            noticePeriod: offerData.noticePeriod || 30,
            workingDays: offerData.workingDays || 'Monday to Friday',
            workingHours: offerData.workingHours || '9:00 AM to 6:00 PM',

            validUntil,

            benefits: offerData.benefits || [],
            specialTerms: offerData.specialTerms || [],

            status: 'DRAFT'
        });

        await offer.save({ session });

        // ─────────────────────────────────────────────────────────────────
        // UPDATE APPLICATION
        // ─────────────────────────────────────────────────────────────────
        application.linkOffer(offer._id, offer.offerId);
        await application.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Offer created successfully',
            data: {
                offerId: offer.offerId,
                _id: offer._id,
                status: offer.status,
                validUntil: offer.validUntil,
                ctc: offer.salarySnapshot.ctc
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Create Offer Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create offer',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// ═══════════════════════════════════════════════════════════════════
// 5. SEND OFFER
// ═══════════════════════════════════════════════════════════════════

/**
 * Send offer letter to candidate
 */
exports.sendOffer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId;
        const user = req.user;
        const { offerId } = req.params;
        const { sentAt, expiryAt } = req.body;

        const { Offer, Application } = getModels(db);

        const offer = await Offer.findOne({ _id: offerId, tenant: tenantId });

        if (!offer) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        try {
            offer.send(user.id || user._id, user.name || user.email, { sentAt, expiryAt });
            await offer.save({ session });

            const application = await Application.findById(offer.applicationId);
            if (application) {
                application.markOfferSent();
                application.offerSentDate = offer.sentAt || offer.sentDate;
                application.offerExpiryDate = offer.expiryAt || offer.validUntil;
                await application.save({ session });
            }

            await session.commitTransaction();

            res.json({
                success: true,
                message: 'Offer sent successfully',
                data: {
                    offerId: offer.offerId,
                    status: offer.status,
                    version: offer.version,
                    sentAt: offer.sentAt || offer.sentDate,
                    expiryAt: offer.expiryAt || offer.validUntil
                }
            });

        } catch (validationError) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: validationError.message
            });
        }

    } catch (error) {
        await session.abortTransaction();
        console.error('Send Offer Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send offer',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// ═══════════════════════════════════════════════════════════════════
// 6. ACCEPT OFFER (Candidate Action)
// ═══════════════════════════════════════════════════════════════════

/**
 * Candidate accepts offer
 */
exports.acceptOffer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId;
        const { offerId } = req.params;
        const { acceptanceNotes } = req.body;

        const { Offer, Application } = getModels(db);

        await Offer.markExpiredOffers(tenantId);

        const offer = await Offer.findOne({ _id: offerId, tenant: tenantId });

        if (!offer) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        if (offer.status === 'EXPIRED' || offer.isExpired) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Offer has expired. Cannot accept.',
                code: 'OFFER_EXPIRED'
            });
        }

        if (offer.status !== 'SENT') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot accept offer. Status: ${offer.status}`,
                code: 'INVALID_OFFER_STATUS'
            });
        }

        const expiry = offer.expiryAt || offer.validUntil;
        if (expiry && new Date() >= expiry) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Offer has expired. Cannot accept.',
                code: 'OFFER_EXPIRED'
            });
        }

        const candidateId = req.candidate?.id || req.user?.id || null;
        const candidateName = req.candidate?.name || req.user?.name || offer.candidateInfo?.name || 'Candidate';

        try {
            offer.accept(acceptanceNotes, 'PORTAL', { candidateId, candidateName });
            await offer.save({ session });

            const application = await Application.findById(offer.applicationId);
            if (application) {
                application.acceptOffer();
                application.offerAcceptedDate = new Date();
                await application.save({ session });
            }

            await session.commitTransaction();

            res.json({
                success: true,
                message: 'Offer accepted successfully! Employee account will be created shortly.',
                data: {
                    offerId: offer.offerId,
                    status: offer.status,
                    version: offer.version,
                    acceptedAt: offer.acceptedAt || offer.acceptedDate
                }
            });

        } catch (validationError) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: validationError.message
            });
        }

    } catch (error) {
        await session.abortTransaction();
        console.error('Accept Offer Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept offer',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// ═══════════════════════════════════════════════════════════════════
// 6A. GET LATEST OFFER
// ═══════════════════════════════════════════════════════════════════

/**
 * Get latest offer for application (active or any - with expiry check)
 */
exports.getLatestOffer = async (req, res) => {
    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId;
        const { applicationId } = req.params;

        const { Offer } = getModels(db);

        await Offer.markExpiredOffers(tenantId);

        const offer = await Offer.getLatestOfferForApplication(tenantId, applicationId);

        if (!offer) {
            return res.status(404).json({ success: false, message: 'No offer found' });
        }

        const expiry = offer.expiryAt || offer.validUntil;
        const isExpired = expiry && new Date() >= expiry;
        const canAccept = offer.status === 'SENT' && !isExpired && !offer.isExpired;
        const canRevise = ['EXPIRED', 'REJECTED'].includes(offer.status);

        res.json({
            success: true,
            data: {
                ...offer.toObject(),
                isExpired: isExpired || offer.isExpired,
                canAccept,
                canRevise
            }
        });
    } catch (error) {
        console.error('Get Latest Offer Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get offer',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════════
// 6B. REVISE OFFER
// ═══════════════════════════════════════════════════════════════════

/**
 * Revise offer - Create new offer version when latest is EXPIRED or REJECTED
 * - Previous offer status → REVISED
 * - New offer with new version, new expiry window, status SENT
 */
exports.reviseOffer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId;
        const user = req.user;
        const { applicationId } = req.params;
        const { sentAt, expiryAt, ...offerData } = req.body;

        if (!expiryAt) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'expiryAt (offer expiry date/time) is mandatory for revise',
                code: 'MISSING_EXPIRY'
            });
        }

        const { Application, Offer, SalaryStructure } = getModels(db);

        const application = await Application.findOne({
            _id: applicationId,
            tenant: tenantId
        }).populate('jobId candidateId');

        if (!application) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        const canRevise = await Offer.canRevise(tenantId, applicationId);
        if (!canRevise) {
            await session.abortTransaction();
            const latest = await Offer.getLatestOfferForApplication(tenantId, applicationId);
            return res.status(400).json({
                success: false,
                message: `Cannot revise offer. Latest offer status: ${latest?.status || 'N/A'}. Revise only when EXPIRED or REJECTED.`,
                code: 'CANNOT_REVISE'
            });
        }

        const previousOffer = await Offer.getLatestOfferForApplication(tenantId, applicationId);
        if (!previousOffer) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'No previous offer found' });
        }

        if (previousOffer.status === 'ACCEPTED') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Cannot revise an accepted offer',
                code: 'OFFER_ALREADY_ACCEPTED'
            });
        }

        const salaryStructureId = offerData.salaryStructureId || previousOffer.salaryStructureId;
        const salaryStructure = await SalaryStructure.findOne({ _id: salaryStructureId, tenant: tenantId });
        if (!salaryStructure) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Salary structure not found' });
        }

        previousOffer.status = 'REVISED';
        previousOffer.statusHistory = previousOffer.statusHistory || [];
        previousOffer.statusHistory.push({
            from: previousOffer.status,
            to: 'REVISED',
            changedBy: user?.name || user?.email,
            changedById: user?.id || user?._id,
            reason: 'Superseded by revised offer',
            timestamp: new Date()
        });
        await previousOffer.save({ session });

        const newOfferId = await generateOfferId(db);
        const validUntil = expiryAt ? new Date(expiryAt) : (offerData.validUntil ? new Date(offerData.validUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

        const newOffer = new Offer({
            offerId: newOfferId,
            tenant: tenantId,
            applicationId: application._id,
            applicationReadableId: application.applicationId,
            candidateId: application.candidateId,
            jobId: application.jobId,
            version: previousOffer.version + 1,
            revisedFromOfferId: previousOffer._id,

            candidateInfo: previousOffer.candidateInfo,
            jobDetails: {
                ...(typeof previousOffer.jobDetails?.toObject === 'function' ? previousOffer.jobDetails.toObject() : (previousOffer.jobDetails || {})),
                ...(offerData.department && { department: offerData.department }),
                ...(offerData.designation && { designation: offerData.designation }),
                ...(offerData.location && { location: offerData.location }),
                ...(offerData.reportingTo && { reportingTo: offerData.reportingTo })
            },

            salaryStructureId: salaryStructure._id,
            salarySnapshot: {
                ctc: salaryStructure.ctc,
                grossSalary: salaryStructure.grossSalary,
                netSalary: salaryStructure.netSalary,
                earnings: salaryStructure.earnings || [],
                deductions: salaryStructure.deductions || [],
                employerContributions: salaryStructure.employerContributions || []
            },

            joiningDate: offerData.joiningDate || previousOffer.joiningDate,
            probationPeriod: offerData.probationPeriod ?? previousOffer.probationPeriod,
            noticePeriod: offerData.noticePeriod ?? previousOffer.noticePeriod,
            workingDays: offerData.workingDays || previousOffer.workingDays,
            workingHours: offerData.workingHours || previousOffer.workingHours,

            validUntil,
            benefits: offerData.benefits || previousOffer.benefits || [],
            specialTerms: offerData.specialTerms || previousOffer.specialTerms || [],

            status: 'DRAFT'
        });

        await newOffer.save({ session });

        const sentAtVal = sentAt ? new Date(sentAt) : new Date();
        const expiryAtVal = expiryAt ? new Date(expiryAt) : validUntil;

        if (expiryAtVal <= sentAtVal) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Expiry must be after sent date/time' });
        }

        newOffer.send(user?.id || user?._id, user?.name || user?.email, { sentAt: sentAtVal, expiryAt: expiryAtVal });
        await newOffer.save({ session });

        application.linkRevisedOffer(newOffer._id, newOffer.offerId);
        application.markOfferSent();
        application.offerSentDate = newOffer.sentAt || newOffer.sentDate;
        application.offerExpiryDate = newOffer.expiryAt || newOffer.validUntil;
        await application.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Offer revised and sent successfully',
            data: {
                offerId: newOffer.offerId,
                _id: newOffer._id,
                version: newOffer.version,
                status: newOffer.status,
                sentAt: newOffer.sentAt || newOffer.sentDate,
                expiryAt: newOffer.expiryAt || newOffer.validUntil,
                revisedFromOfferId: previousOffer._id
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Revise Offer Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revise offer',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// ═══════════════════════════════════════════════════════════════════
// 7. CONVERT TO EMPLOYEE
// ═══════════════════════════════════════════════════════════════════

/**
 * Convert accepted offer to employee
 * 
 * Business Rules:
 * - Offer must be ACCEPTED
 * - No existing employee for this offer
 * - Creates employee with all details from offer
 */
exports.convertToEmployee = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId;
        const user = req.user;
        const { offerId } = req.params;
        const { actualJoiningDate, department } = req.body;

        const { Offer, Application, Employee } = getModels(db);

        // ─────────────────────────────────────────────────────────────────
        // VALIDATION: Check offer
        // ─────────────────────────────────────────────────────────────────
        const offer = await Offer.findOne({ _id: offerId, tenant: tenantId });

        if (!offer) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Offer not found'
            });
        }

        if (!offer.canCreateEmployee) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Cannot create employee. Offer status: ${offer.status}, Existing employee: ${!!offer.employeeId}`,
                code: 'CANNOT_CREATE_EMPLOYEE'
            });
        }

        // ─────────────────────────────────────────────────────────────────
        // CREATE EMPLOYEE
        // ─────────────────────────────────────────────────────────────────
        const deptCode = department || offer.jobDetails.department || 'GEN';
        const employeeId = await generateEmployeeId(db, deptCode);

        const employee = new Employee({
            employeeId,
            tenant: tenantId,

            // Personal Info
            firstName: offer.candidateInfo.name.split(' ')[0],
            lastName: offer.candidateInfo.name.split(' ').slice(1).join(' '),
            email: offer.candidateInfo.email,
            contactNo: offer.candidateInfo.mobile,
            fatherName: offer.candidateInfo.fatherName,

            // Job Info
            department: offer.jobDetails.department,
            designation: offer.jobDetails.designation,
            joiningDate: actualJoiningDate || offer.joiningDate,

            // Salary
            salaryTemplateId: offer.salaryStructureId,
            currentSalarySnapshotId: null, // Will be set when salary snapshot is created

            // Status
            status: 'Active',
            role: 'employee',

            meta: {
                createdFrom: 'OFFER',
                offerId: offer.offerId,
                applicationId: offer.applicationReadableId
            }
        });

        await employee.save({ session });

        // ─────────────────────────────────────────────────────────────────
        // UPDATE OFFER
        // ─────────────────────────────────────────────────────────────────
        offer.linkEmployee(employee._id, employee.employeeId);
        await offer.save({ session });

        // ─────────────────────────────────────────────────────────────────
        // UPDATE APPLICATION
        // ─────────────────────────────────────────────────────────────────
        const application = await Application.findById(offer.applicationId);
        if (application) {
            application.convertToEmployee(employee._id, employee.employeeId, actualJoiningDate);
            await application.save({ session });
        }

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: {
                employeeId: employee.employeeId,
                _id: employee._id,
                name: `${employee.firstName} ${employee.lastName}`,
                email: employee.email,
                department: employee.department,
                designation: employee.designation,
                joiningDate: employee.joiningDate
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Convert to Employee Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create employee',
            error: error.message
        });
    } finally {
        session.endSession();
    }
};

// ═══════════════════════════════════════════════════════════════════
// 8. GET APPLICATION PIPELINE
// ═══════════════════════════════════════════════════════════════════

/**
 * Get recruitment pipeline statistics
 */
exports.getRecruitmentPipeline = async (req, res) => {
    try {
        const db = req.tenantDB || req.db;
        const tenantId = req.tenantId || req.user?.tenantId;
        const { jobId } = req.query;

        const { Application } = getModels(db);

        const matchStage = { tenant: tenantId, isActive: true };
        if (jobId) {
            matchStage.jobId = mongoose.Types.ObjectId(jobId);
        }

        const pipeline = await Application.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    applications: {
                        $push: {
                            id: '$_id',
                            applicationId: '$applicationId',
                            candidateName: '$candidateInfo.name',
                            createdAt: '$createdAt'
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                pipeline,
                total: pipeline.reduce((sum, stage) => sum + stage.count, 0)
            }
        });

    } catch (error) {
        console.error('Get Pipeline Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pipeline',
            error: error.message
        });
    }
};

module.exports = exports;
