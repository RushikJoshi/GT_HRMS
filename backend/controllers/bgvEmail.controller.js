const { getBGVModels } = require('../utils/bgvModels');
const bgvEmailService = require('../services/bgvEmail.service');

/**
 * 🔐 BGV Email Controller
 * 
 * Handles BGV email-related API endpoints
 * All emails are logged for compliance and legal traceability
 */

/**
 * Send BGV Email
 * POST /api/bgv/:caseId/send-email
 */
exports.sendEmail = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const {
            emailType,
            recipientType,
            customMessage,
            checkId,
            customRecipientEmail,
            customRecipientName,
            additionalRecipients
        } = req.body;

        // Validate required fields
        if (!emailType) {
            return res.status(400).json({
                success: false,
                message: 'Email type is required'
            });
        }

        if (!recipientType) {
            return res.status(400).json({
                success: false,
                message: 'Recipient type is required'
            });
        }

        if (recipientType === 'CUSTOM' && !customRecipientEmail) {
            return res.status(400).json({
                success: false,
                message: 'Custom recipient email is required'
            });
        }

        // Get BGV Case to validate permissions
        const { BGVCase } = await getBGVModels(req);
        const bgvCase = await BGVCase.findById(caseId);

        if (!bgvCase) {
            return res.status(404).json({
                success: false,
                message: 'BGV Case not found'
            });
        }

        // Validate permissions
        try {
            bgvEmailService.validateEmailPermissions(
                emailType,
                req.user?.role || 'user',
                bgvCase
            );
        } catch (permError) {
            return res.status(403).json({
                success: false,
                message: permError.message
            });
        }

        // Send email
        const result = await bgvEmailService.sendBGVEmail({
            tenantId: req.tenantId,
            caseId,
            checkId,
            emailType,
            recipientType,
            customRecipientEmail,
            customRecipientName,
            additionalRecipients,
            customMessage,
            user: req.user,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({
            success: true,
            message: 'Email sent successfully',
            data: result
        });

    } catch (err) {
        console.error('[BGV_SEND_EMAIL_ERROR]', err);
        next(err);
    }
};

/**
 * Get Email History for BGV Case
 * GET /api/bgv/:caseId/email-history
 */
exports.getEmailHistory = async (req, res, next) => {
    try {
        const { caseId } = req.params;

        const emails = await bgvEmailService.getEmailHistory(
            req.tenantId,
            caseId
        );

        res.json({
            success: true,
            data: emails
        });

    } catch (err) {
        console.error('[BGV_GET_EMAIL_HISTORY_ERROR]', err);
        next(err);
    }
};

/**
 * Get Available Email Templates
 * GET /api/bgv/email-templates
 */
exports.getEmailTemplates = async (req, res, next) => {
    try {
        const { BGVEmailTemplate } = await getBGVModels(req);

        const templates = await BGVEmailTemplate.find({
            tenant: req.tenantId,
            isActive: true
        }).sort({ emailType: 1, version: -1 });

        // Group by emailType and get latest version
        const templateMap = new Map();
        templates.forEach(template => {
            if (!templateMap.has(template.emailType)) {
                templateMap.set(template.emailType, template);
            }
        });

        const latestTemplates = Array.from(templateMap.values());

        res.json({
            success: true,
            data: latestTemplates
        });

    } catch (err) {
        console.error('[BGV_GET_EMAIL_TEMPLATES_ERROR]', err);
        next(err);
    }
};

/**
 * Get Email Template by Type
 * GET /api/bgv/email-template/:emailType
 */
exports.getEmailTemplateByType = async (req, res, next) => {
    try {
        const { emailType } = req.params;
        const { BGVEmailTemplate } = await getBGVModels(req);

        let template = await BGVEmailTemplate.findOne({
            tenant: req.tenantId,
            emailType,
            isActive: true
        }).sort({ version: -1 });

        // If no custom template, return default
        if (!template) {
            const defaultTemplates = BGVEmailTemplate.schema.statics.getDefaultTemplates();
            const defaultTemplate = defaultTemplates.find(t => t.emailType === emailType);

            if (defaultTemplate) {
                template = defaultTemplate;
            }
        }

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.json({
            success: true,
            data: template
        });

    } catch (err) {
        console.error('[BGV_GET_EMAIL_TEMPLATE_ERROR]', err);
        next(err);
    }
};

/**
 * Create/Update Email Template
 * POST /api/bgv/email-template
 * (Admin only)
 */
exports.createOrUpdateEmailTemplate = async (req, res, next) => {
    try {
        const { emailType, name, description, subject, htmlBody, supportedVariables } = req.body;

        // Only admins can create/update templates
        if (!['admin', 'company_admin'].includes(req.user?.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can create or update email templates'
            });
        }

        const { BGVEmailTemplate } = await getBGVModels(req);

        // Check if template exists
        const existingTemplate = await BGVEmailTemplate.findOne({
            tenant: req.tenantId,
            emailType,
            isActive: true
        }).sort({ version: -1 });

        let newTemplate;

        if (existingTemplate) {
            // Create new version
            newTemplate = await BGVEmailTemplate.create({
                tenant: req.tenantId,
                emailType,
                name,
                description,
                subject,
                htmlBody,
                supportedVariables,
                defaultRecipientType: existingTemplate.defaultRecipientType,
                allowedRoles: existingTemplate.allowedRoles,
                version: existingTemplate.version + 1,
                previousVersionId: existingTemplate._id,
                isActive: true,
                isDefault: false,
                createdBy: req.user._id || req.user.id,
                updatedBy: req.user._id || req.user.id
            });

            // Deactivate old version
            existingTemplate.isActive = false;
            await existingTemplate.save();

        } else {
            // Create new template
            newTemplate = await BGVEmailTemplate.create({
                tenant: req.tenantId,
                emailType,
                name,
                description,
                subject,
                htmlBody,
                supportedVariables,
                defaultRecipientType: 'CANDIDATE',
                allowedRoles: ['hr', 'admin', 'company_admin'],
                version: 1,
                isActive: true,
                isDefault: false,
                createdBy: req.user._id || req.user.id,
                updatedBy: req.user._id || req.user.id
            });
        }

        res.json({
            success: true,
            message: 'Email template created/updated successfully',
            data: newTemplate
        });

    } catch (err) {
        console.error('[BGV_CREATE_EMAIL_TEMPLATE_ERROR]', err);
        next(err);
    }
};

/**
 * Initialize Default Email Templates
 * POST /api/bgv/email-templates/initialize
 * (Admin only - run once per tenant)
 */
exports.initializeDefaultTemplates = async (req, res, next) => {
    try {
        // Only admins can initialize templates
        if (!['admin', 'company_admin'].includes(req.user?.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can initialize email templates'
            });
        }

        const { BGVEmailTemplate } = await getBGVModels(req);

        // Check if templates already exist
        const existingCount = await BGVEmailTemplate.countDocuments({
            tenant: req.tenantId,
            isActive: true
        });

        if (existingCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email templates already initialized for this tenant'
            });
        }

        // Get default templates
        const defaultTemplates = BGVEmailTemplate.schema.statics.getDefaultTemplates();

        // Create all default templates
        const createdTemplates = [];
        for (const template of defaultTemplates) {
            const newTemplate = await BGVEmailTemplate.create({
                tenant: req.tenantId,
                ...template,
                createdBy: req.user._id || req.user.id,
                updatedBy: req.user._id || req.user.id
            });
            createdTemplates.push(newTemplate);
        }

        res.json({
            success: true,
            message: `${createdTemplates.length} default email templates initialized successfully`,
            data: createdTemplates
        });

    } catch (err) {
        console.error('[BGV_INITIALIZE_TEMPLATES_ERROR]', err);
        next(err);
    }
};

module.exports = {
    sendEmail: exports.sendEmail,
    getEmailHistory: exports.getEmailHistory,
    getEmailTemplates: exports.getEmailTemplates,
    getEmailTemplateByType: exports.getEmailTemplateByType,
    createOrUpdateEmailTemplate: exports.createOrUpdateEmailTemplate,
    initializeDefaultTemplates: exports.initializeDefaultTemplates
};
