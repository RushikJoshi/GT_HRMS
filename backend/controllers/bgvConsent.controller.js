/**
 * BGV Consent Controller
 * Handles digital consent capture, validation, and withdrawal
 */

const { getBGVModels } = require('../utils/bgvModels');

/**
 * Capture digital consent from candidate
 * POST /api/bgv/case/:caseId/consent
 */
exports.captureConsent = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const {
            consentGiven,
            signatureType,
            signatureData,
            scopeAgreed,
            location
        } = req.body;

        const { BGVCase, BGVConsent, BGVTimeline } = await getBGVModels(req);

        // Verify case exists
        const bgvCase = await BGVCase.findById(caseId);
        if (!bgvCase) {
            return res.status(404).json({ success: false, message: "BGV Case not found" });
        }

        // Check if consent already exists
        const existingConsent = await BGVConsent.findOne({ caseId });
        if (existingConsent && !existingConsent.isWithdrawn) {
            return res.status(400).json({
                success: false,
                message: "Consent already captured for this case"
            });
        }

        // Get candidate ID
        const candidateId = bgvCase.candidateId || bgvCase.employeeId || bgvCase.applicationId;

        // Prepare consent text (should be from a template)
        const consentText = `I hereby authorize the company to conduct background verification checks including identity, address, employment, education, criminal records, and references. I understand that this information will be used solely for employment verification purposes.`;

        // Create consent record
        const consent = new BGVConsent({
            tenant: req.tenantId,
            caseId,
            candidateId,
            consentGiven: consentGiven === true,
            consentTextVersion: process.env.BGV_CONSENT_VERSION || 'v1.0',
            consentText,
            signatureType: signatureType || 'TYPED_NAME',
            signatureData,
            consentTimestamp: new Date(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            deviceInfo: {
                browser: req.get('user-agent')?.split(' ')[0],
                os: req.get('user-agent')?.includes('Windows') ? 'Windows' :
                    req.get('user-agent')?.includes('Mac') ? 'Mac' : 'Other'
            },
            location: location || {},
            scopeAgreed: scopeAgreed || [],
            isImmutable: true
        });

        await consent.save();

        // Update BGV case with consent flag
        bgvCase.consentCaptured = true;
        bgvCase.consentCapturedAt = new Date();
        await bgvCase.save();

        // Create timeline entry
        await BGVTimeline.create({
            tenant: req.tenantId,
            caseId,
            eventType: 'CONSENT_CAPTURED',
            title: 'Digital Consent Captured',
            description: `Candidate provided consent via ${signatureType}`,
            performedBy: {
                userId: candidateId,
                userName: 'Candidate',
                userRole: 'CANDIDATE'
            },
            visibleTo: ['ALL'],
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: { consentId: consent._id }
        });

        res.json({
            success: true,
            message: "Consent captured successfully",
            data: {
                consentId: consent._id,
                consentGiven: consent.consentGiven,
                consentTimestamp: consent.consentTimestamp
            }
        });

    } catch (err) {
        console.error('[BGV_CONSENT_CAPTURE_ERROR]', err);
        next(err);
    }
};

/**
 * Get consent details for a case
 * GET /api/bgv/case/:caseId/consent
 */
exports.getConsent = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const { BGVConsent } = await getBGVModels(req);

        const consent = await BGVConsent.findOne({ caseId })
            .populate('candidateId', 'name email')
            .lean();

        if (!consent) {
            return res.status(404).json({
                success: false,
                message: "No consent found for this case"
            });
        }

        // Don't expose signature data in GET request for security
        const safeConsent = {
            ...consent,
            signatureData: consent.signatureType === 'DIGITAL_SIGNATURE' ? '[REDACTED]' : consent.signatureData,
            isValid: consent.consentGiven && !consent.isWithdrawn
        };

        res.json({
            success: true,
            data: safeConsent
        });

    } catch (err) {
        console.error('[BGV_CONSENT_GET_ERROR]', err);
        next(err);
    }
};

/**
 * Withdraw consent
 * POST /api/bgv/case/:caseId/consent/withdraw
 */
exports.withdrawConsent = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const { withdrawalReason } = req.body;

        const { BGVCase, BGVConsent, BGVTimeline } = await getBGVModels(req);

        const consent = await BGVConsent.findOne({ caseId });
        if (!consent) {
            return res.status(404).json({
                success: false,
                message: "No consent found for this case"
            });
        }

        if (consent.isWithdrawn) {
            return res.status(400).json({
                success: false,
                message: "Consent already withdrawn"
            });
        }

        // Withdraw consent
        consent.isWithdrawn = true;
        consent.withdrawnAt = new Date();
        consent.withdrawalReason = withdrawalReason || 'Candidate requested withdrawal';
        consent.withdrawnBy = req.user?._id || req.user?.id;

        await consent.save();

        // Update BGV case
        const bgvCase = await BGVCase.findById(caseId);
        if (bgvCase) {
            bgvCase.consentWithdrawn = true;
            bgvCase.consentWithdrawnAt = new Date();
            // Optionally pause or cancel the BGV process
            if (bgvCase.overallStatus !== 'CLOSED') {
                bgvCase.overallStatus = 'CONSENT_WITHDRAWN';
            }
            await bgvCase.save();
        }

        // Create timeline entry
        await BGVTimeline.create({
            tenant: req.tenantId,
            caseId,
            eventType: 'CONSENT_WITHDRAWN',
            title: 'Consent Withdrawn',
            description: withdrawalReason || 'Candidate withdrew consent',
            performedBy: {
                userId: req.user?._id || req.user?.id,
                userName: req.user?.name || 'Candidate',
                userRole: req.user?.role || 'CANDIDATE'
            },
            visibleTo: ['ALL'],
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({
            success: true,
            message: "Consent withdrawn successfully",
            data: {
                withdrawnAt: consent.withdrawnAt,
                withdrawalReason: consent.withdrawalReason
            }
        });

    } catch (err) {
        console.error('[BGV_CONSENT_WITHDRAW_ERROR]', err);
        next(err);
    }
};

/**
 * Check if consent is valid for a case
 * GET /api/bgv/case/:caseId/consent/validate
 */
exports.validateConsent = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const { BGVConsent } = await getBGVModels(req);

        const hasValidConsent = await BGVConsent.hasValidConsent(caseId);

        res.json({
            success: true,
            data: {
                hasValidConsent,
                message: hasValidConsent
                    ? 'Valid consent exists'
                    : 'No valid consent found. BGV cannot proceed.'
            }
        });

    } catch (err) {
        console.error('[BGV_CONSENT_VALIDATE_ERROR]', err);
        next(err);
    }
};
