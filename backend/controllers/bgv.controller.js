const { getBGVModels } = require('../utils/bgvModels');
const path = require('path');
const fs = require('fs');

/**
 * BGV Package Definitions
 */
const BGV_PACKAGES = {
    BASIC: ['IDENTITY', 'ADDRESS', 'EMPLOYMENT'],
    STANDARD: ['IDENTITY', 'ADDRESS', 'EMPLOYMENT', 'EDUCATION', 'CRIMINAL'],
    PREMIUM: ['IDENTITY', 'ADDRESS', 'EMPLOYMENT', 'EDUCATION', 'CRIMINAL', 'SOCIAL_MEDIA', 'REFERENCE']
};

/**
 * Helper: Create timeline entry
 */
async function createTimelineEntry(BGVTimeline, data) {
    try {
        await BGVTimeline.create(data);
    } catch (err) {
        console.error('[BGV_TIMELINE_ERROR]', err);
    }
}

/**
 * Helper: Add log to case
 */
function addCaseLog(bgvCase, action, user, req, oldStatus = null, newStatus = null, remarks = '') {
    bgvCase.logs.push({
        action,
        performedBy: user?.name || user?.email || 'System',
        performedById: user?._id || user?.id || null,
        oldStatus,
        newStatus,
        remarks,
        ip: req?.ip || null,
        userAgent: req?.get('user-agent') || null,
        timestamp: new Date()
    });
}

/**
 * STEP 2: HR Initiates BGV
 * POST /api/bgv/initiate
 */
exports.initiateBGV = async (req, res, next) => {
    try {
        let { applicationId, candidateId, package: selectedPackage, slaDays } = req.body;

        console.log('[BGV_INITIATE] Request:', { applicationId, candidateId, selectedPackage, slaDays });

        const { BGVCase, BGVCheck, BGVTimeline, Applicant } = await getBGVModels(req);

        // Validate required fields
        if (!applicationId) {
            return res.status(400).json({ success: false, message: "applicationId is required" });
        }

        if (!selectedPackage || !['BASIC', 'STANDARD', 'PREMIUM'].includes(selectedPackage)) {
            return res.status(400).json({ success: false, message: "Valid package (BASIC/STANDARD/PREMIUM) is required" });
        }

        // Fetch candidateId from applicant if not provided
        if (!candidateId) {
            const applicant = await Applicant.findById(applicationId).select('candidateId');
            if (!applicant) {
                return res.status(404).json({ success: false, message: "Applicant not found" });
            }
            candidateId = applicant.candidateId;
        }

        // Check if BGV already exists
        const existingCase = await BGVCase.findOne({ applicationId, tenant: req.tenantId });
        if (existingCase) {
            return res.status(400).json({
                success: false,
                message: "BGV already initiated for this application",
                caseId: existingCase.caseId
            });
        }

        // Generate unique Case ID
        const count = await BGVCase.countDocuments({ tenant: req.tenantId });
        const caseId = `BGV-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;

        // Create BGV Case
        const newCase = await BGVCase.create({
            caseId,
            tenant: req.tenantId,
            applicationId,
            candidateId,
            package: selectedPackage,
            initiatedBy: req.user?._id || req.user?.id,
            overallStatus: 'PENDING',
            sla: {
                targetDays: slaDays || 7
            }
        });

        // Add initial log
        addCaseLog(newCase, 'CASE_INITIATED', req.user, req, null, 'PENDING', `BGV ${selectedPackage} package initiated`);
        await newCase.save();

        // STEP 3: Auto-generate checks based on package
        const checksToCreate = BGV_PACKAGES[selectedPackage];
        const checkPromises = checksToCreate.map(checkType => {
            return BGVCheck.create({
                caseId: newCase._id,
                tenant: req.tenantId,
                type: checkType,
                status: 'NOT_STARTED',
                slaDays: 5
            });
        });

        const createdChecks = await Promise.all(checkPromises);

        // Create timeline entry
        await createTimelineEntry(BGVTimeline, {
            tenant: req.tenantId,
            caseId: newCase._id,
            eventType: 'CASE_INITIATED',
            title: 'BGV Process Initiated',
            description: `Background verification initiated with ${selectedPackage} package (${checksToCreate.length} checks)`,
            performedBy: {
                userId: req.user?._id || req.user?.id,
                userName: req.user?.name || req.user?.email,
                userRole: req.user?.role
            },
            newStatus: 'PENDING',
            visibleTo: ['ALL'],
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.status(201).json({
            success: true,
            message: "BGV initiated successfully",
            data: {
                case: newCase,
                checks: createdChecks,
                checksCount: createdChecks.length
            }
        });

    } catch (err) {
        console.error('[BGV_INITIATE_ERROR]', err);
        next(err);
    }
};

/**
 * Get all BGV cases (HR Dashboard)
 * GET /api/bgv/cases
 */
exports.getAllCases = async (req, res, next) => {
    try {
        const { status, package: pkg, search, page = 1, limit = 20 } = req.query;
        const { BGVCase, BGVCheck } = await getBGVModels(req);

        // Build query
        const query = { tenant: req.tenantId };
        if (status) query.overallStatus = status;
        if (pkg) query.package = pkg;

        // Search by case ID or candidate name
        if (search) {
            query.$or = [
                { caseId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const cases = await BGVCase.find(query)
            .populate({
                path: 'applicationId',
                select: 'name email mobile requirementId',
                populate: {
                    path: 'requirementId',
                    select: 'jobOpeningId jobTitle'
                }
            })
            .populate('candidateId', 'name email mobile')
            .populate('initiatedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await BGVCase.countDocuments(query);

        // Attach check details
        const casesWithDetails = await Promise.all(cases.map(async (c) => {
            const checks = await BGVCheck.find({ caseId: c._id }).select('type status').lean();
            const verifiedCount = checks.filter(ch => ch.status === 'VERIFIED').length;
            const failedCount = checks.filter(ch => ch.status === 'FAILED').length;

            return {
                ...c,
                candidateName: c.candidateId?.name || c.applicationId?.name || "Unknown",
                candidateEmail: c.candidateId?.email || c.applicationId?.email,
                jobTitle: c.applicationId?.requirementId?.jobTitle || "N/A",
                checks,
                checksProgress: {
                    total: checks.length,
                    verified: verifiedCount,
                    failed: failedCount,
                    pending: checks.length - verifiedCount - failedCount,
                    percentage: Math.round((verifiedCount / checks.length) * 100)
                }
            };
        }));

        res.json({
            success: true,
            data: casesWithDetails,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('[BGV_GET_ALL_ERROR]', err);
        next(err);
    }
};

/**
 * Get single BGV case detail
 * GET /api/bgv/case/:id
 */
exports.getCaseDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { BGVCase, BGVCheck, BGVDocument, BGVTimeline } = await getBGVModels(req);

        const bgvCase = await BGVCase.findById(id)
            .populate({
                path: 'applicationId',
                select: 'name email mobile requirementId',
                populate: {
                    path: 'requirementId',
                    select: 'jobOpeningId jobTitle'
                }
            })
            .populate('candidateId', 'name email mobile dob address')
            .populate('initiatedBy', 'name email')
            .populate('closedBy', 'name email')
            .lean();

        if (!bgvCase) {
            return res.status(404).json({ success: false, message: "BGV Case not found" });
        }

        // Get all checks
        const checks = await BGVCheck.find({ caseId: bgvCase._id })
            .populate('assignedTo', 'name email')
            .lean();

        // Get timeline
        const timeline = await BGVTimeline.find({ caseId: bgvCase._id })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        // Get documents
        const documents = await BGVDocument.find({ caseId: bgvCase._id, isDeleted: false })
            .sort({ uploadedAt: -1 })
            .lean();

        res.json({
            success: true,
            data: {
                ...bgvCase,
                candidateName: bgvCase.candidateId?.name || bgvCase.applicationId?.name || "Unknown",
                candidateEmail: bgvCase.candidateId?.email || bgvCase.applicationId?.email,
                jobTitle: bgvCase.applicationId?.requirementId?.jobTitle || "N/A",
                checks,
                timeline,
                documents
            }
        });
    } catch (err) {
        console.error('[BGV_GET_DETAIL_ERROR]', err);
        next(err);
    }
};

/**
 * STEP 1: Candidate uploads documents
 * POST /api/bgv/case/:caseId/upload-document
 */
exports.uploadDocument = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const { documentType, checkType } = req.body;
        const { BGVCase, BGVCheck, BGVDocument, BGVTimeline } = await getBGVModels(req);

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        // Verify case exists
        const bgvCase = await BGVCase.findById(caseId);
        if (!bgvCase) {
            return res.status(404).json({ success: false, message: "BGV Case not found" });
        }

        // Check if case is closed
        if (bgvCase.isClosed) {
            return res.status(400).json({ success: false, message: "Cannot upload documents to a closed BGV case" });
        }

        // Move file to tenant directory
        const tenantId = req.tenantId.toString();
        const bgvDir = path.join(__dirname, '..', 'uploads', tenantId, 'bgv', caseId.toString());

        if (!fs.existsSync(bgvDir)) {
            fs.mkdirSync(bgvDir, { recursive: true });
        }

        const ext = path.extname(req.file.originalname);
        const filename = `${documentType}_${Date.now()}${ext}`;
        const finalPath = path.join(bgvDir, filename);
        const relativeUrl = `/uploads/${tenantId}/bgv/${caseId}/${filename}`;

        fs.renameSync(req.file.path, finalPath);

        // Find related check
        let checkId = null;
        if (checkType) {
            const check = await BGVCheck.findOne({ caseId, type: checkType });
            if (check) {
                checkId = check._id;

                // Update check status to PENDING if NOT_STARTED
                if (check.status === 'NOT_STARTED') {
                    check.status = 'PENDING';
                    await check.save();
                }
            }
        }

        // Get version number
        const existingDocs = await BGVDocument.find({
            caseId,
            documentType,
            isDeleted: false
        });
        const version = existingDocs.length + 1;

        // Create document record
        const document = await BGVDocument.create({
            tenant: req.tenantId,
            caseId,
            checkId,
            candidateId: bgvCase.candidateId,
            documentType,
            fileName: filename,
            originalName: req.file.originalname,
            filePath: relativeUrl,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            version,
            uploadedBy: {
                userId: req.user?._id || req.user?.id,
                userName: req.user?.name || req.user?.email,
                userRole: req.user?.role
            }
        });

        // Create timeline entry
        await createTimelineEntry(BGVTimeline, {
            tenant: req.tenantId,
            caseId,
            checkId,
            eventType: 'DOCUMENT_UPLOADED',
            title: 'Document Uploaded',
            description: `${documentType} document uploaded (${req.file.originalname})`,
            performedBy: {
                userId: req.user?._id || req.user?.id,
                userName: req.user?.name || req.user?.email,
                userRole: req.user?.role
            },
            visibleTo: ['ALL'],
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: { documentId: document._id, documentType, version }
        });

        res.json({
            success: true,
            message: "Document uploaded successfully",
            data: document
        });

    } catch (err) {
        console.error('[BGV_UPLOAD_DOC_ERROR]', err);
        next(err);
    }
};

/**
 * STEP 4 & 5: Verify individual check
 * POST /api/bgv/check/:checkId/verify
 */
exports.verifyCheck = async (req, res, next) => {
    try {
        const { checkId } = req.params;
        const { status, internalRemarks, verificationMethod } = req.body;
        const { BGVCase, BGVCheck, BGVTimeline } = await getBGVModels(req);

        const check = await BGVCheck.findById(checkId);
        if (!check) {
            return res.status(404).json({ success: false, message: "Check not found" });
        }

        const oldStatus = check.status;
        check.status = status;
        if (internalRemarks) check.internalRemarks = internalRemarks;

        // Add verification details
        check.verificationDetails = {
            verifiedBy: req.user?._id || req.user?.id,
            verifiedAt: new Date(),
            verificationMethod: verificationMethod || 'MANUAL'
        };

        await check.save();

        // Create timeline entry
        await createTimelineEntry(BGVTimeline, {
            tenant: req.tenantId,
            caseId: check.caseId,
            checkId: check._id,
            eventType: status === 'VERIFIED' ? 'CHECK_VERIFIED' : status === 'FAILED' ? 'CHECK_FAILED' : 'CHECK_IN_PROGRESS',
            title: `${check.type} Check ${status}`,
            description: internalRemarks || `Check status updated to ${status}`,
            performedBy: {
                userId: req.user?._id || req.user?.id,
                userName: req.user?.name || req.user?.email,
                userRole: req.user?.role
            },
            oldStatus,
            newStatus: status,
            visibleTo: status === 'FAILED' ? ['HR', 'ADMIN'] : ['ALL'],
            remarks: internalRemarks,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Update overall case status
        const bgvCase = await BGVCase.findById(check.caseId);
        addCaseLog(bgvCase, `CHECK_${status}_${check.type}`, req.user, req, oldStatus, status, internalRemarks);

        // Recalculate overall status
        const allChecks = await BGVCheck.find({ caseId: bgvCase._id });
        let overall = 'IN_PROGRESS';

        const failed = allChecks.some(c => c.status === 'FAILED');
        const allVerified = allChecks.every(c => c.status === 'VERIFIED');
        const hasDiscrepancy = allChecks.some(c => c.status === 'DISCREPANCY');
        const anyRemarks = allChecks.some(c => c.internalRemarks && c.status === 'VERIFIED');

        if (failed) {
            overall = 'FAILED';
        } else if (allVerified && (anyRemarks || hasDiscrepancy)) {
            overall = 'VERIFIED_WITH_DISCREPANCIES';
        } else if (allVerified) {
            overall = 'VERIFIED';
        }

        const oldOverallStatus = bgvCase.overallStatus;
        bgvCase.overallStatus = overall;

        if (['VERIFIED', 'VERIFIED_WITH_DISCREPANCIES', 'FAILED'].includes(overall)) {
            bgvCase.completedAt = new Date();
        }

        await bgvCase.save();

        // Auto-reject applicant if BGV failed
        if (overall === 'FAILED') {
            try {
                const { Applicant } = await getBGVModels(req);
                const applicant = await Applicant.findById(bgvCase.applicationId);
                if (applicant && applicant.status !== 'Rejected') {
                    applicant.status = 'Rejected';
                    applicant.timeline.push({
                        status: 'Rejected',
                        message: 'Candidate rejected due to Failed Background Verification (BGV).',
                        updatedBy: 'System (BGV Auto-Reject)',
                        timestamp: new Date()
                    });
                    await applicant.save();
                    console.log(`[BGV_AUTO_REJECT] Applicant ${applicant._id} rejected.`);
                }
            } catch (err) {
                console.error('[BGV_AUTO_REJECT_ERROR]', err);
            }
        }

        res.json({
            success: true,
            message: "Check verified successfully",
            data: {
                check,
                overallStatus: overall,
                statusChanged: oldOverallStatus !== overall
            }
        });

    } catch (err) {
        console.error('[BGV_VERIFY_CHECK_ERROR]', err);
        next(err);
    }
};

/**
/**
 * STEP 7: Close & Approve BGV
 * POST /api/bgv/case/:id/close
 * Auto-generates and downloads report
 */
exports.closeBGV = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { decision, remarks } = req.body; // APPROVED, REJECTED, RECHECK_REQUIRED
        const { BGVCase, BGVCheck, BGVReport, BGVTimeline, Applicant } = await getBGVModels(req);
        const BGVReportService = require('../services/BGVReportService');

        const bgvCase = await BGVCase.findById(id);
        if (!bgvCase) {
            return res.status(404).json({ success: false, message: "BGV Case not found" });
        }

        if (bgvCase.isClosed) {
            return res.status(400).json({ success: false, message: "BGV Case is already closed" });
        }

        // Validate decision
        if (!['APPROVED', 'REJECTED', 'RECHECK_REQUIRED'].includes(decision)) {
            return res.status(400).json({ success: false, message: "Invalid decision. Must be APPROVED, REJECTED, or RECHECK_REQUIRED" });
        }

        // Update case
        const oldStatus = bgvCase.overallStatus;
        bgvCase.decision = decision;
        bgvCase.decisionBy = req.user?._id || req.user?.id;
        bgvCase.decisionAt = new Date();
        bgvCase.decisionRemarks = remarks;

        if (decision !== 'RECHECK_REQUIRED') {
            bgvCase.isClosed = true;
            bgvCase.closedAt = new Date();
            bgvCase.closedBy = req.user?._id || req.user?.id;
            bgvCase.overallStatus = 'CLOSED';
            bgvCase.isImmutable = true; // Make immutable after closure
        }

        addCaseLog(bgvCase, 'CASE_CLOSED', req.user, req, oldStatus, 'CLOSED', `BGV closed with decision: ${decision}. ${remarks || ''}`);
        await bgvCase.save();

        // Create timeline entry
        await createTimelineEntry(BGVTimeline, {
            tenant: req.tenantId,
            caseId: bgvCase._id,
            eventType: 'CASE_CLOSED',
            title: `BGV Case ${decision}`,
            description: `Background verification closed with decision: ${decision}. ${remarks || ''}`,
            performedBy: {
                userId: req.user?._id || req.user?.id,
                userName: req.user?.name || req.user?.email,
                userRole: req.user?.role
            },
            oldStatus,
            newStatus: 'CLOSED',
            remarks,
            visibleTo: ['HR', 'ADMIN'],
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        // Update applicant status
        if (decision === 'APPROVED') {
            const applicant = await Applicant.findById(bgvCase.applicationId);
            if (applicant) {
                // Move to onboarding if BGV approved
                applicant.timeline.push({
                    status: 'BGV Cleared',
                    message: 'Background verification completed successfully. Ready for onboarding.',
                    updatedBy: req.user?.name || 'HR',
                    timestamp: new Date()
                });
                await applicant.save();
            }
        } else if (decision === 'REJECTED') {
            const applicant = await Applicant.findById(bgvCase.applicationId);
            if (applicant && applicant.status !== 'Rejected') {
                applicant.status = 'Rejected';
                applicant.timeline.push({
                    status: 'Rejected',
                    message: `Candidate rejected after BGV review. Reason: ${remarks || 'BGV not cleared'}`,
                    updatedBy: req.user?.name || 'HR',
                    timestamp: new Date()
                });
                await applicant.save();
            }
        }

        // Auto-generate report when case is closed
        let reportData = null;
        try {
            console.log('[BGV_CLOSE] Auto-generating report for case:', bgvCase.caseId);

            // Fetch case with populated fields
            const populatedCase = await BGVCase.findById(id)
                .populate('candidateId', 'name email mobile dob address')
                .populate('applicationId', 'name email');

            const checks = await BGVCheck.find({ caseId: bgvCase._id }).lean();

            // Calculate summary
            const summary = {
                totalChecks: checks.length,
                verifiedChecks: checks.filter(c => c.status === 'VERIFIED').length,
                failedChecks: checks.filter(c => c.status === 'FAILED').length,
                discrepancyChecks: checks.filter(c => c.status === 'DISCREPANCY').length,
                overallDecision: decision,
                riskLevel: decision === 'APPROVED' ? 'LOW' : decision === 'REJECTED' ? 'HIGH' : 'MEDIUM'
            };

            // Generate PDF report
            const reportResult = await BGVReportService.generateBGVReport(
                populatedCase,
                checks,
                summary,
                req.tenantId
            );

            // Create report record in database
            const report = await BGVReport.create({
                tenant: req.tenantId,
                caseId: bgvCase._id,
                reportType: 'FINAL',
                fileName: reportResult.fileName,
                filePath: reportResult.filePath,
                fileFormat: 'PDF',
                summary,
                generatedBy: {
                    userId: req.user?._id || req.user?.id,
                    userName: req.user?.name || req.user?.email
                },
                status: 'GENERATED'
            });

            // Update case with final report
            await BGVCase.findByIdAndUpdate(id, {
                finalReport: {
                    id: report._id,
                    path: reportResult.filePath,
                    fileName: reportResult.fileName,
                    generatedAt: new Date(),
                    generatedBy: req.user?._id || req.user?.id
                }
            });

            // Create timeline entry for report generation
            await createTimelineEntry(BGVTimeline, {
                tenant: req.tenantId,
                caseId: bgvCase._id,
                eventType: 'REPORT_GENERATED',
                title: 'BGV Report Auto-Generated',
                description: 'Final background verification report generated automatically upon case closure',
                performedBy: {
                    userId: req.user?._id || req.user?.id,
                    userName: req.user?.name || req.user?.email,
                    userRole: req.user?.role
                },
                visibleTo: ['HR', 'ADMIN'],
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });

            reportData = {
                reportId: report._id,
                fileName: reportResult.fileName,
                filePath: reportResult.filePath,
                generatedAt: report.createdAt
            };

            console.log('[BGV_CLOSE] Report generated successfully:', reportResult.fileName);
        } catch (reportErr) {
            console.error('[BGV_CLOSE] Report generation failed (non-blocking):', reportErr.message);
            // Don't fail the closure if report generation fails
        }

        res.json({
            success: true,
            message: `BGV case ${decision.toLowerCase()} successfully${reportData ? ' and report generated' : ''}`,
            data: {
                caseId: bgvCase._id,
                caseStatus: bgvCase.caseId,
                decision,
                closedAt: bgvCase.closedAt,
                report: reportData
            }
        });

    } catch (err) {
        console.error('[BGV_CLOSE_ERROR]', err);
        next(err);
    }
};

/**
 * Get BGV status for candidate (limited view)
 * GET /api/bgv/candidate/:candidateId
 */
exports.getBGVStatus = async (req, res, next) => {
    try {
        const { candidateId } = req.params;
        const { BGVCase, BGVCheck, BGVTimeline } = await getBGVModels(req);

        const bgvCase = await BGVCase.findOne({ candidateId, tenant: req.tenantId }).lean();
        if (!bgvCase) {
            return res.status(404).json({ success: false, message: "No BGV case found for this candidate" });
        }

        const checks = await BGVCheck.find({ caseId: bgvCase._id })
            .select('-internalRemarks -verificationDetails') // Hide internal data
            .lean();

        // Get candidate-visible timeline only
        const timeline = await BGVTimeline.find({
            caseId: bgvCase._id,
            visibleTo: { $in: ['CANDIDATE', 'ALL'] }
        })
            .sort({ timestamp: -1 })
            .limit(20)
            .lean();

        // Remove sensitive logs
        delete bgvCase.logs;
        delete bgvCase.decisionRemarks;

        res.json({
            success: true,
            data: {
                ...bgvCase,
                checks,
                timeline
            }
        });

    } catch (err) {
        console.error('[BGV_GET_STATUS_ERROR]', err);
        next(err);
    }
};

/**
 * Generate BGV Report (PDF)
 * POST /api/bgv/case/:id/generate-report
 */
exports.generateReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { BGVCase, BGVCheck, BGVReport, BGVTimeline } = await getBGVModels(req);
        const BGVReportService = require('../services/BGVReportService');

        const bgvCase = await BGVCase.findById(id)
            .populate('candidateId', 'name email mobile dob address')
            .populate('applicationId', 'name email');

        if (!bgvCase) {
            return res.status(404).json({ success: false, message: "BGV Case not found" });
        }

        const checks = await BGVCheck.find({ caseId: bgvCase._id }).lean();

        // Calculate summary
        const summary = {
            totalChecks: checks.length,
            verifiedChecks: checks.filter(c => c.status === 'VERIFIED').length,
            failedChecks: checks.filter(c => c.status === 'FAILED').length,
            discrepancyChecks: checks.filter(c => c.status === 'DISCREPANCY').length,
            overallDecision: bgvCase.decision,
            riskLevel: bgvCase.decision === 'APPROVED' ? 'LOW' : bgvCase.decision === 'REJECTED' ? 'HIGH' : 'MEDIUM'
        };

        try {
            // Generate PDF report using BGVReportService
            const reportResult = await BGVReportService.generateBGVReport(
                bgvCase,
                checks,
                summary,
                req.tenantId
            );

            // Create report record in database
            const report = await BGVReport.create({
                tenant: req.tenantId,
                caseId: bgvCase._id,
                reportType: 'FINAL',
                fileName: reportResult.fileName,
                filePath: reportResult.filePath,
                fileFormat: 'PDF',
                fileSize: 0, // Will be updated when file is generated
                summary,
                generatedBy: {
                    userId: req.user?._id || req.user?.id,
                    userName: req.user?.name || req.user?.email
                },
                status: 'GENERATED'
            });

            // Update case with final report
            await BGVCase.findByIdAndUpdate(id, {
                finalReport: {
                    id: report._id,
                    path: reportResult.filePath,
                    fileName: reportResult.fileName,
                    generatedAt: new Date(),
                    generatedBy: req.user?._id || req.user?.id
                }
            });

            // Create timeline entry
            await createTimelineEntry(BGVTimeline, {
                tenant: req.tenantId,
                caseId: bgvCase._id,
                eventType: 'REPORT_GENERATED',
                title: 'BGV Report Generated',
                description: 'Final background verification report generated successfully',
                performedBy: {
                    userId: req.user?._id || req.user?.id,
                    userName: req.user?.name || req.user?.email,
                    userRole: req.user?.role
                },
                visibleTo: ['HR', 'ADMIN'],
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });

            res.json({
                success: true,
                message: "Report generated successfully",
                data: {
                    reportId: report._id,
                    fileName: reportResult.fileName,
                    filePath: reportResult.filePath,
                    generatedAt: report.createdAt
                }
            });

        } catch (pdfErr) {
            console.error('[BGV_PDF_GENERATION_ERROR]', pdfErr);
            res.status(500).json({
                success: false,
                message: "Failed to generate PDF report",
                error: pdfErr.message
            });
        }

    } catch (err) {
        console.error('[BGV_GENERATE_REPORT_ERROR]', err);
        next(err);
    }
};

/**
 * Get BGV statistics (Dashboard)
 * GET /api/bgv/stats
 */
exports.getStats = async (req, res, next) => {
    try {
        const { BGVCase } = await getBGVModels(req);

        const stats = await BGVCase.aggregate([
            { $match: { tenant: req.tenantId } },
            {
                $group: {
                    _id: '$overallStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = await BGVCase.countDocuments({ tenant: req.tenantId });
        const pending = await BGVCase.countDocuments({ tenant: req.tenantId, overallStatus: { $in: ['PENDING', 'IN_PROGRESS'] } });
        const verified = await BGVCase.countDocuments({ tenant: req.tenantId, overallStatus: 'VERIFIED' });
        const failed = await BGVCase.countDocuments({ tenant: req.tenantId, overallStatus: 'FAILED' });
        const overdue = await BGVCase.countDocuments({ tenant: req.tenantId, 'sla.isOverdue': true, isClosed: false });

        res.json({
            success: true,
            data: {
                total,
                pending,
                verified,
                failed,
                overdue,
                breakdown: stats
            }
        });

    } catch (err) {
        console.error('[BGV_STATS_ERROR]', err);
        next(err);
    }
};
/**
 * Download BGV Report
 * GET /api/bgv/report/:reportId/download
 */
exports.downloadReport = async (req, res, next) => {
    try {
        const { reportId } = req.params;
        const { BGVReport } = await getBGVModels(req);
        const BGVReportService = require('../services/BGVReportService');

        // Find report record
        const report = await BGVReport.findOne({
            _id: reportId,
            tenant: req.tenantId
        });

        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        // Get file path
        const filePath = await BGVReportService.getReportFile(report.filePath);

        // Send file
        res.download(filePath, report.fileName, (err) => {
            if (err) {
                console.error('[BGV_DOWNLOAD_ERROR]', err);
            }
        });

    } catch (err) {
        console.error('[BGV_DOWNLOAD_ERROR]', err);
        res.status(500).json({ success: false, message: "Failed to download report", error: err.message });
    }
};

/**
 * Download BGV Report by Case ID
 * GET /api/bgv/case/:caseId/report/download
 */
exports.downloadReportByCase = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const { BGVCase, BGVReport } = await getBGVModels(req);
        const BGVReportService = require('../services/BGVReportService');

        // Find case
        const bgvCase = await BGVCase.findById(caseId);
        if (!bgvCase) {
            return res.status(404).json({ success: false, message: "BGV Case not found" });
        }

        // Check if report exists
        if (!bgvCase.finalReport || !bgvCase.finalReport.id) {
            return res.status(404).json({ success: false, message: "No report generated for this case" });
        }

        // Find report
        const report = await BGVReport.findById(bgvCase.finalReport.id);
        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        // Get file path
        const filePath = await BGVReportService.getReportFile(report.filePath);

        // Send file
        res.download(filePath, report.fileName, (err) => {
            if (err) {
                console.error('[BGV_DOWNLOAD_ERROR]', err);
            }
        });

    } catch (err) {
        console.error('[BGV_DOWNLOAD_ERROR]', err);
        res.status(500).json({ success: false, message: "Failed to download report", error: err.message });
    }
};