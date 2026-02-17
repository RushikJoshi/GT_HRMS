const mongoose = require('mongoose');
const SalaryStructure = require('../models/SalaryStructure'); // Global Model
const letterPDFGenerator = require('../services/letterPDFGenerator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const joiningLetterUtils = require('../utils/joiningLetterUtils');
const emailService = require('../services/email.service');

// PDF conversion uses LibreOfficeService (reliable cross-platform solution)
console.log('🚀 LETTER CONTROLLER VERSION: 3.1 (LibreOffice PDF conversion)');

async function extractPlaceholders(filePath) {
    try {
        const buffer = await fsPromises.readFile(filePath);
        const zip = new PizZip(buffer);
        const xmlParts = zip.file(/word\/(document|header\d*|footer\d*)\.xml/);
        if (!Array.isArray(xmlParts) || xmlParts.length === 0) return [];

        const placeholderRegex = /\{\{([^}]+)\}\}/g;
        const placeholders = new Set();

        const decodeXmlEntities = (value) => value
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");

        for (const xmlEntry of xmlParts) {
            const xmlText = decodeXmlEntities(
                xmlEntry
                    .asText()
                    .replace(/<w:tab\/>/g, '\t')
                    .replace(/<w:br\/>/g, '\n')
                    .replace(/<w:p\b[^>]*>/g, '\n')
                    .replace(/<[^>]+>/g, '')
            );

            let match;
            while ((match = placeholderRegex.exec(xmlText)) !== null) {
                const cleaned = sanitizePlaceholderToken(match[1]);
                if (cleaned) placeholders.add(cleaned);
            }
        }

        return Array.from(placeholders);
    } catch (error) {
        console.warn('⚠️ Error extracting placeholders (non-critical):', error.message);
        return [];
    }
}

function sanitizePlaceholderToken(raw) {
    const cleaned = String(raw || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) return null;
    if (cleaned.length > 120) return null;
    if (/mergefield/i.test(cleaned)) return null;
    if (/^w:/i.test(cleaned)) return null;
    if (!/[a-z0-9]/i.test(cleaned)) return null;

    return cleaned;
}

function sanitizePlaceholderList(placeholders = []) {
    if (!Array.isArray(placeholders)) return [];
    const seen = new Set();
    const result = [];

    for (const token of placeholders) {
        const cleaned = sanitizePlaceholderToken(token);
        if (!cleaned || seen.has(cleaned)) continue;
        seen.add(cleaned);
        result.push(cleaned);
    }

    return result;
}

function sanitizeDocxTemplateDelimiters(zip) {
    try {
        const files = zip.file(/word\/(document|header\d*|footer\d*)\.xml/);
        if (!Array.isArray(files) || files.length === 0) return;

        files.forEach((entry) => {
            const xml = entry.asText();
            const sanitized = xml
                // Convert triple/quadruple brace runs to standard docxtemplater delimiters.
                .replace(/\{{3,}/g, '{{')
                .replace(/\}{3,}/g, '}}');

            if (sanitized !== xml) {
                zip.file(entry.name, sanitized);
            }
        });
    } catch (e) {
        console.warn('⚠️ [DOCX SANITIZE] Failed to sanitize template delimiters:', e.message);
    }
}

function buildTemplateCompileError(error) {
    const issues = Array.isArray(error?.properties?.errors) ? error.properties.errors : [];
    const details = issues.map((item) => ({
        id: item?.properties?.id || item?.id || 'template_error',
        file: item?.properties?.file || 'word/document.xml',
        context: item?.properties?.context || item?.properties?.xtag || item?.message || 'Invalid template tag'
    }));

    return {
        success: false,
        code: 'INVALID_TEMPLATE_SYNTAX',
        message: 'Template contains invalid placeholder syntax. Use {{placeholder}} format with exactly two braces.',
        details
    };
}

// Helper to get models from tenant database
function getModels(req) {
    if (!req.tenantDB) {
        throw new Error("Tenant database connection not available");
    }
    const db = req.tenantDB;
    try {
        // Safe Lazy Loading for all required models
        if (!db.models.GeneratedLetter) {
            try { db.model('GeneratedLetter', require('../models/GeneratedLetter')); } catch (e) { }
        }
        if (!db.models.LetterTemplate) {
            try { db.model('LetterTemplate', require('../models/LetterTemplate')); } catch (e) { }
        }
        if (!db.models.Applicant) {
            try { db.model('Applicant', require('../models/Applicant')); } catch (e) { }
        }
        if (!db.models.Candidate) {
            try { db.model('Candidate', require('../models/Candidate')); } catch (e) { }
        }
        if (!db.models.Employee) {
            try { db.model('Employee', require('../models/Employee')); } catch (e) { }
        }
        if (!db.models.CompanyProfile) {
            try { db.model('CompanyProfile', require('../models/CompanyProfile')); } catch (e) { }
        }
        if (!db.models.LetterApproval) {
            try { db.model('LetterApproval', require('../models/LetterApproval')); } catch (e) { }
        }

        return {
            GeneratedLetter: db.model("GeneratedLetter"),
            LetterTemplate: db.model("LetterTemplate"),
            Applicant: db.model("Applicant"),
            Candidate: db.model("Candidate"),
            Employee: db.model("Employee"),
            CompanyProfile: db.model("CompanyProfile"),
            LetterApproval: db.model("LetterApproval")
        };
    } catch (err) {
        console.error("[letter.controller] Error retrieving models:", err);
        throw new Error(`Failed to retrieve models from tenant database: ${err.message}`);
    }
}
// Helper to get correct Applicant model (for backward compatibility)
function getApplicantModel(req) {
    if (req.tenantDB) {
        return req.tenantDB.model("Applicant");
    } else {
        return mongoose.model("Applicant");
    }
}

function formatCustomDate(date, format = 'Do MMM. YYYY') {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = d.getDate();
    const monthIndex = d.getMonth();
    const year = d.getFullYear();

    // Helpers
    const pad = (n) => n < 10 ? '0' + n : n;
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Ordinal Suffix logic
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';

    // Switch based on requested format
    switch (format) {
        case 'DD/MM/YYYY':
            return `${pad(day)}/${pad(monthIndex + 1)}/${year}`;
        case 'YYYY-MM-DD':
            return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
        case 'Do MMMM YYYY':
            return `${day}${suffix} ${monthsLong[monthIndex]} ${year}`;
        case 'Do MMM. YYYY':
        default:
            return `${day}${suffix} ${monthsShort[monthIndex]}. ${year}`;
    }
}

// Helper to format currency safe
const safeCur = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Math.round(val).toLocaleString('en-IN');
};

// Helper to format date safe
const safeDate = (d) => {
    if (!d) return '';
    const timestamp = Date.parse(d);
    if (isNaN(timestamp)) return '';
    return new Date(timestamp).toLocaleDateString('en-IN');
};

// =========================================================================
// A) UNIVERSAL SALARY KEY NORMALIZER (STABLE FOREVER)
// =========================================================================
const normalizeSalaryKey = (name) => {
    if (!name) return 'unknown';
    const n = name.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '_')   // spaces/dashes to underscores
        .replace(/^_+|_+$/g, '');      // trim underscores

    if (/basic|sal/i.test(n)) return 'basic';
    if (/hra|house|rent/i.test(n)) return 'hra';
    if (/medical|health/i.test(n)) return 'medical';
    if (/conveyance|travel/i.test(n)) return 'conveyance';
    if (/transport/i.test(n)) return 'transport';
    if (/education/i.test(n)) return 'education';
    if (/book|periodical/i.test(n)) return 'books';
    if (/uniform/i.test(n)) return 'uniform';
    if (/mobile|phone/i.test(n)) return 'mobile';
    if (/compensatory/i.test(n)) return 'compensatory';
    if (/leave/i.test(n)) return 'leave';
    if (/special|allowance/i.test(n)) return 'special';
    if (/pt|prof|tax/i.test(n)) return 'pt';
    if (/^pf$|provident/i.test(n) && !/employer/i.test(n)) return 'pf';
    if (/employer_pf|employer_contribution_to_pf/i.test(n)) return 'employer_pf';
    if (/gratuity/i.test(n)) return 'gratuity';
    if (/insur/i.test(n)) return 'insurance';
    if (/gross_a|gross_earnings|gross_salary/i.test(n)) return 'gross_a';
    if (/gross_b|annual_benefits|benefit_b/i.test(n)) return 'gross_b';
    if (/gross_c|retirals|benefit_c/i.test(n)) return 'gross_c';
    if (/ctc|total_ctc|cost_to_company/i.test(n)) return 'total_ctc';
    if (/net|take_home/i.test(n)) return 'net_salary';

    return n;
};

// =========================================================================
// B) UNIVERSAL SAFE PATCH ENGINE (PREVENTS BLANK FIELDS)
// =========================================================================
const applyUniversalSalaryPatches = (data, snapshot, totals) => {
    let patched = { ...data };

    // 1. Normalized Global Keys (e.g., {{basic}}, {{hra}}, {{pf}})
    if (snapshot) {
        const allComponents = [
            ...(snapshot.earnings || []),
            ...(snapshot.employeeDeductions || snapshot.deductions || []),
            ...(snapshot.benefits || [])
        ];

        allComponents.forEach(comp => {
            const canonical = normalizeSalaryKey(comp.name);
            const m = comp.monthlyAmount || comp.monthly || 0;
            const y = comp.yearlyAmount || comp.yearly || (m * 12) || 0;

            patched[`${canonical}_monthly`] = safeCur(m);
            patched[`${canonical}_yearly`] = safeCur(y);
            patched[`${canonical}_annual`] = safeCur(y);

            // Hardcoded specific match for "Basic Salary"
            if (canonical === 'basic') {
                patched['basic_salary_monthly'] = safeCur(m);
                patched['basic_salary_yearly'] = safeCur(y);
            }
        });
    }

    // 2. Totals Hardening
    if (totals) {
        const tMap = {
            gross_a: totals.grossA,
            gross_b: totals.grossB,
            gross_c: totals.grossC,
            ctc: totals.computedCTC || totals.totalCTC || totals.ctc,
            net_salary: totals.netSalary || totals.net
        };

        Object.entries(tMap).forEach(([key, val]) => {
            if (val) {
                patched[`${key}_monthly`] = val.formattedM || safeCur(val.monthly);
                patched[`${key}_yearly`] = val.formattedY || safeCur(val.yearly);
                patched[`${key}_annual`] = val.formattedY || safeCur(val.yearly);
            }
        });
    }

    // 3. Support for ALL DOCX placeholder variants (Case-Insensitive, Space vs Underscore)
    const expanded = { ...patched };
    Object.keys(patched).forEach(key => {
        const val = patched[key];
        if (typeof val !== 'string' && typeof val !== 'number') return;

        expanded[key.toUpperCase()] = val;
        expanded[key.toLowerCase()] = val;

        const spaced = key.replace(/_/g, ' ');
        expanded[spaced] = val;
        expanded[spaced.toUpperCase()] = val;

        const underscored = key.replace(/ /g, '_');
        expanded[underscored] = val;
        expanded[underscored.toUpperCase()] = val;
    });

    return expanded;
};

// Helper function to normalize file paths (always absolute)
// Helper function to normalize file paths (always absolute)
function normalizeFilePath(filePath) {
    if (!filePath) return null;

    // 1. Try treating as absolute
    let candidates = [];
    if (path.isAbsolute(filePath)) {
        candidates.push(path.normalize(filePath));
    }

    // 2. Try resolving relative to backend/uploads
    candidates.push(path.resolve(__dirname, '../uploads', filePath));

    // 3. Try resolving just the basename in backend/uploads/templates (Smart Fallback)
    const fileName = path.basename(filePath);
    const fallbackPath = path.resolve(__dirname, '../uploads/templates', fileName);
    candidates.push(fallbackPath);

    // Check availability
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }

    // Default to first candidate if none exist (let caller handle 404)
    return candidates[0];
}

// Configure multer for Word template upload (supports both offer and joining)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use consistent templates directory for both offer and joining templates
        const dest = path.join(__dirname, '../uploads/templates');
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
            console.log(`✅ [MULTER] Created templates directory: ${dest}`);
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.docx';
        // Get type from body (offer or joining) - default to 'template' if not specified
        const letterType = (req.body && req.body.type) ? req.body.type : 'template';
        const timestamp = Date.now();
        const name = `${letterType}-template-${timestamp}${ext}`;
        console.log(`📁 [MULTER] Generated filename: ${name} for type: ${letterType}`);
        cb(null, name);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (ext === '.docx') {
            cb(null, true);
        } else {
            cb(new Error('Only .docx files are allowed'));
        }
    }
});

/** 
 * COMPANY PROFILE 
 */
exports.getCompanyProfile = async (req, res) => {
    try {
        const { CompanyProfile } = getModels(req);
        const profile = await CompanyProfile.findOne({ tenantId: req.user.tenantId });
        res.json(profile || { _isNew: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCompanyProfile = async (req, res) => {
    try {
        const { CompanyProfile } = getModels(req);
        const { companyName, address, contactEmail, signatory, branding } = req.body;
        let profile = await CompanyProfile.findOne({ tenantId: req.user.tenantId });

        if (!profile) {
            profile = new CompanyProfile({ tenantId: req.user.tenantId });
        }

        if (companyName) profile.companyName = companyName;
        if (address) profile.address = address;
        if (contactEmail) profile.contactEmail = contactEmail;
        if (signatory) profile.signatory = signatory;
        if (branding) profile.branding = branding;

        await profile.save();
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/** 
 * TEMPLATES MANAGEMENT
 */

exports.getTemplates = async (req, res) => {
    try {
        const { type } = req.query;
        const query = { isActive: true };
        if (req.user?.tenantId) {
            query.tenantId = req.user.tenantId;
        }

        // Strict Type Filtering
        if (type) {
            query.type = type; // 'offer' or 'joining'
        }

        const { LetterTemplate } = getModels(req);
        const templates = await LetterTemplate.find(query).sort('-createdAt');

        // Transform response based on type
        const responseData = await Promise.all(templates.map(async (template) => {
            const base = {
                _id: template._id,
                name: template.name,
                type: template.type,
                isDefault: template.isDefault,
                createdAt: template.createdAt
            };

            let resolvedPlaceholders = sanitizePlaceholderList(template.placeholders || []);
            if (template.templateType === 'WORD' && resolvedPlaceholders.length === 0 && template.filePath) {
                const normalizedPath = normalizeFilePath(template.filePath);
                if (normalizedPath && fs.existsSync(normalizedPath)) {
                    resolvedPlaceholders = await extractPlaceholders(normalizedPath);
                }
            }

            if (template.templateType === 'WORD') {
                // Word templates (both offer and joining)
                return {
                    ...base,
                    filePath: template.filePath,
                    placeholders: resolvedPlaceholders,
                    status: template.status,
                    version: template.version,
                    templateType: 'WORD'
                };
            } else if (template.type === 'offer') {
                // HTML-based offer templates
                return {
                    ...base,
                    bodyContent: template.bodyContent,
                    headerContent: template.headerContent,
                    footerContent: template.footerContent,
                    headerHeight: template.headerHeight,
                    footerHeight: template.footerHeight,
                    hasHeader: template.hasHeader,
                    hasFooter: template.hasFooter,
                    templateType: template.templateType // 'BLANK' or 'LETTER_PAD'
                };
            } else if (template.type === 'joining') {
                // Legacy joining templates (should be Word, but keeping for compatibility)
                return {
                    ...base,
                    filePath: template.filePath,
                    placeholders: resolvedPlaceholders,
                    status: template.status,
                    version: template.version,
                    templateType: 'WORD'
                };
            }
            return base;
        }));

        res.json(responseData);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
};

exports.createTemplate = async (req, res) => {
    // Mostly for Offer Letters (HTML based)
    try {
        // Get tenant-specific model
        const { LetterTemplate } = getModels(req);

        const { name, type, bodyContent, headerContent, footerContent, headerHeight, footerHeight, hasHeader, hasFooter, templateType, isDefault } = req.body;

        if (isDefault) {
            await LetterTemplate.updateMany(
                { tenantId: req.user.tenantId, type, isDefault: true },
                { isDefault: false }
            );
        }

        const template = new LetterTemplate({
            tenantId: req.user.tenantId,
            name,
            type: type || 'offer',
            bodyContent, headerContent, footerContent,
            headerHeight, footerHeight, hasHeader, hasFooter,
            templateType: templateType || 'BLANK',
            isDefault,
            createdBy: req.user.userId
        });

        await template.save();
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        // Get tenant-specific model
        const { LetterTemplate } = getModels(req);

        const template = await LetterTemplate.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!template) return res.status(404).json({ message: 'Template not found' });

        // basic update logic...
        Object.assign(template, req.body);

        if (req.body.isDefault) {
            await LetterTemplate.updateMany(
                { tenantId: req.user.tenantId, type: template.type, isDefault: true, _id: { $ne: template._id } },
                { isDefault: false }
            );
        }

        await template.save();
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};;

exports.getTemplateById = async (req, res) => {
    try {
        const { id } = req.params;

        // Log request for debugging
        console.log(`🔍 [GET TEMPLATE BY ID] Request for ID: ${id}`);
        console.log(`🔍 [GET TEMPLATE BY ID] User:`, req.user ? { userId: req.user.userId, role: req.user.role, tenantId: req.user.tenantId } : 'null');
        console.log(`🔍 [GET TEMPLATE BY ID] TenantDB:`, req.tenantDB ? 'available' : 'not available');

        // Validate ID format
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            console.error(`🔍 [GET TEMPLATE BY ID] Invalid ID format: ${id}`);
            return res.status(400).json({ message: 'Invalid template ID format' });
        }

        // Get tenant-specific model
        const { LetterTemplate } = getModels(req);

        // Build query - handle missing req.user gracefully
        const query = { _id: id };
        if (req.user?.tenantId) {
            query.tenantId = req.user.tenantId;
            console.log(`🔍 [GET TEMPLATE BY ID] Filtering by tenantId: ${req.user.tenantId}`);
        } else {
            console.warn(`🔍 [GET TEMPLATE BY ID] No tenantId in request, searching without tenant filter`);
        }

        // Find template
        const template = await LetterTemplate.findOne(query);

        if (!template) {
            console.error(`🔍 [GET TEMPLATE BY ID] Template not found for ID: ${id}`);
            return res.status(404).json({ message: 'Template not found' });
        }

        console.log(`🔍 [GET TEMPLATE BY ID] Template found:`, {
            id: template._id,
            name: template.name,
            type: template.type,
            templateType: template.templateType,
            hasFilePath: !!template.filePath
        });

        // Transform response for safety and proper handling
        const responseData = {
            _id: template._id,
            name: template.name,
            type: template.type,
            templateType: template.templateType,
            isDefault: template.isDefault,
            isActive: template.isActive,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
        };

        // Handle WORD templates - validate filePath exists
        if (template.templateType === 'WORD') {
            responseData.templateType = 'WORD';
            responseData.placeholders = sanitizePlaceholderList(template.placeholders || []);
            responseData.version = template.version;
            responseData.status = template.status;

            // Check if filePath exists and file is accessible
            if (template.filePath) {
                try {
                    // Normalize file path before checking
                    const normalizedPath = normalizeFilePath(template.filePath);
                    const fileExists = fs.existsSync(normalizedPath);
                    if (fileExists) {
                        if (responseData.placeholders.length === 0) {
                            responseData.placeholders = await extractPlaceholders(normalizedPath);
                        }
                        // Return normalized filePath for WORD templates (needed for preview)
                        responseData.filePath = normalizedPath;
                        responseData.hasFile = true;
                        console.log(`✅ [GET TEMPLATE BY ID] File exists at: ${normalizedPath}`);
                    } else {
                        console.error(`❌ [GET TEMPLATE BY ID] File NOT FOUND at path: ${normalizedPath}`);
                        console.error(`❌ [GET TEMPLATE BY ID] Original path from DB: ${template.filePath}`);
                        responseData.hasFile = false;
                        responseData.filePath = null;
                        responseData.fileError = 'Template file not found on server. Please re-upload the template.';
                        responseData.code = 'FILE_NOT_FOUND';
                    }
                } catch (fsError) {
                    console.error(`❌ [GET TEMPLATE BY ID] Error checking file: ${fsError.message}`);
                    console.error(`❌ [GET TEMPLATE BY ID] Stack:`, fsError.stack);
                    responseData.hasFile = false;
                    responseData.filePath = null;
                    responseData.fileError = 'Error accessing template file: ' + fsError.message;
                    responseData.code = 'FILE_ACCESS_ERROR';
                }
            } else {
                console.warn(`⚠️ [GET TEMPLATE BY ID] WORD template missing filePath in database`);
                responseData.hasFile = false;
                responseData.filePath = null;
                responseData.fileError = 'Template file path not set in database. Please re-upload the template.';
                responseData.code = 'FILE_PATH_MISSING';
            }
        } else {
            // HTML-based templates (BLANK, LETTER_PAD)
            responseData.bodyContent = template.bodyContent;
            responseData.headerContent = template.headerContent;
            responseData.footerContent = template.footerContent;
            responseData.headerHeight = template.headerHeight;
            responseData.footerHeight = template.footerHeight;
            responseData.hasHeader = template.hasHeader;
            responseData.hasFooter = template.hasFooter;
        }

        res.json(responseData);
    } catch (error) {
        console.error(`❌ [GET TEMPLATE BY ID] Error:`, error);
        console.error(`❌ [GET TEMPLATE BY ID] Stack:`, error.stack);

        // Ensure we always return a response
        if (!res.headersSent) {
            res.status(500).json({
                message: 'Failed to fetch template',
                error: error.message
            });
        }
    }
};

/**
 * DELETE TEMPLATE
 * - Remove file from disk
 * - Remove from DB
 */
exports.deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const userTenantId = req.user.tenantId;

        console.log(`🔥 [DELETE TEMPLATE] Request for ID: ${id}`);
        console.log(`🔥 [DELETE TEMPLATE] User:`, { userId: req.user.userId, role: req.user.role, tenantId: userTenantId });

        // Get tenant-specific model
        const { LetterTemplate } = getModels(req);

        // 1. Find by ID only first
        const template = await LetterTemplate.findById(id);

        if (!template) {
            console.log("🔥 [DELETE TEMPLATE] Template not found by ID.");
            return res.status(404).json({ message: "Template not found (Invalid ID)" });
        }

        console.log(`🔥 [DELETE TEMPLATE] Template found:`, { templateId: template._id, templateTenantId: template.tenantId, templateName: template.name });

        // 2. Security Check
        // Allow delete if:
        // - Tenant IDs match
        // - OR Template has NO tenantId (Corrupt record cleanup)
        // - OR User has admin role (can delete any template)

        const isOwner = template.tenantId && template.tenantId.toString() === userTenantId.toString();
        const isCorrupt = !template.tenantId; // If tenantId is missing, allow cleanup
        const isAdmin = req.user.role === 'admin'; // Admin can delete any template

        console.log(`🔥 [DELETE TEMPLATE] Ownership check:`, { isOwner, isCorrupt, isAdmin, templateTenant: template.tenantId, userTenant: userTenantId, userRole: req.user.role });

        if (!isOwner && !isCorrupt && !isAdmin) {
            console.log(`🔥 [DELETE TEMPLATE] Security Block. Template Tenant: ${template.tenantId}, User Tenant: ${userTenantId}, User Role: ${req.user.role}`);
            return res.status(403).json({
                message: "You do not have permission to delete this template.",
                reason: "Template belongs to a different tenant. Only admins can delete templates from other tenants."
            });
        }

        // 3. Delete File if exists (use normalized path)
        if (template.filePath) {
            try {
                const normalizedPath = normalizeFilePath(template.filePath);
                if (fs.existsSync(normalizedPath)) {
                    fs.unlinkSync(normalizedPath);
                    console.log(`✅ [DELETE TEMPLATE] Deleted template file: ${normalizedPath}`);
                } else {
                    console.warn(`⚠️ [DELETE TEMPLATE] File not found at path: ${normalizedPath} (continuing with DB deletion)`);
                }
            } catch (err) {
                console.error("❌ [DELETE TEMPLATE] Error deleting template file:", err);
                // Continue to delete DB record even if file delete fails
            }
        }

        // 4. Delete DB Record
        await LetterTemplate.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "Template deleted successfully" });
    } catch (error) {
        console.error("Delete template error:", error);
        res.status(500).json({ message: "Failed to delete template", error: error.message });
    }
};

/**
 * UPLOAD WORD TEMPLATE (Offer & Joining Letters)
 * - Uses Multer
 * - Extracts Placeholders
 * - Saves Metadata
 * - NO PDF GENERATION HERE
 */
exports.uploadWordTemplate = [
    upload.single('wordFile'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No Word file uploaded' });
            }

            // Get tenant-specific model
            const { LetterTemplate } = getModels(req);

            // Normalize file path to ensure it's absolute and consistent
            const normalizedPath = normalizeFilePath(req.file.path);
            console.log(`📁 [UPLOAD TEMPLATE] Original path: ${req.file.path}`);
            console.log(`📁 [UPLOAD TEMPLATE] Normalized path: ${normalizedPath}`);

            // Verify file exists after normalization
            if (!fs.existsSync(normalizedPath)) {
                console.error(`❌ [UPLOAD TEMPLATE] File not found at normalized path: ${normalizedPath}`);
                return res.status(500).json({ success: false, message: 'Uploaded file not found on server' });
            }

            // Extract placeholders
            const placeholders = await extractPlaceholders(normalizedPath);

            // Validate tenantId is present
            if (!req.user?.tenantId) {
                console.error('❌ [UPLOAD TEMPLATE] Missing tenantId in request');
                return res.status(400).json({
                    success: false,
                    message: 'User authentication or tenant information missing. Please log in again.'
                });
            }

            // Support both offer and joining letter types
            const letterType = req.body.type || 'joining'; // Default to joining for backward compatibility
            const templateName = req.body.name || `${letterType === 'offer' ? 'Offer' : 'Joining'} Template ${Date.now()}`;

            const template = new LetterTemplate({
                tenantId: req.user.tenantId, // Ensure tenantId is set (not optional)
                name: templateName,
                type: letterType, // 'offer' or 'joining'
                templateType: 'WORD',
                filePath: normalizedPath, // Store normalized absolute path
                version: req.body.version || 'v1.0',
                status: req.body.status || 'Active',
                placeholders,
                isDefault: req.body.isDefault === 'true' || false,
                isActive: true
            });

            try {
                await template.save();
                console.log(`✅ [UPLOAD TEMPLATE] Template saved: ${template._id}, filePath: ${normalizedPath}`);
            } catch (saveError) {
                // Handle duplicate key error from old MongoDB index - AUTO FIX
                if (saveError.code === 11000 && (saveError.message.includes('tenant_1_letterType_1_templateName_1') || saveError.message.includes('tenant') && saveError.message.includes('letterType'))) {
                    console.warn('⚠️ [UPLOAD TEMPLATE] Old MongoDB index detected. Attempting to auto-fix...');

                    try {
                        // Get the collection and drop the old index
                        const collection = req.tenantDB.collection('lettertemplates');
                        const indexes = await collection.indexes();

                        // Find and drop the problematic index
                        for (const idx of indexes) {
                            if (idx.name === 'tenant_1_letterType_1_templateName_1' ||
                                (idx.key && idx.key.tenant && idx.key.letterType && idx.key.templateName)) {
                                console.log(`🗑️ [UPLOAD TEMPLATE] Dropping old index: ${idx.name}`);
                                await collection.dropIndex(idx.name);
                                console.log(`✅ [UPLOAD TEMPLATE] Old index dropped successfully`);

                                // Retry saving the template
                                await template.save();
                                console.log(`✅ [UPLOAD TEMPLATE] Template saved after index fix: ${template._id}`);

                                // Return success response
                                return res.status(200).json({
                                    success: true,
                                    message: `${letterType === 'offer' ? 'Offer' : 'Joining'} letter template uploaded successfully`,
                                    templateId: template._id,
                                    placeholders,
                                    note: 'Old database index was automatically removed'
                                });
                            }
                        }

                        // If index not found but error persists, throw original error
                        throw saveError;
                    } catch (fixError) {
                        // If auto-fix fails, return helpful error
                        return res.status(500).json({
                            success: false,
                            message: 'Database index error. Please contact administrator.',
                            code: 'INDEX_ERROR',
                            error: fixError.message
                        });
                    }
                }
                throw saveError; // Re-throw if not the expected error
            }

            res.status(200).json({
                success: true,
                message: `${letterType === 'offer' ? 'Offer' : 'Joining'} letter template uploaded successfully`,
                templateId: template._id,
                placeholders
            });
        } catch (error) {
            console.error('❌ [UPLOAD TEMPLATE] Error:', error);
            console.error('❌ [UPLOAD TEMPLATE] Stack:', error.stack);
            // Cleanup on error
            if (req.file && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                    console.log(`🧹[UPLOAD TEMPLATE] Cleaned up file: ${req.file.path} `);
                } catch (e) {
                    console.error('⚠️ [UPLOAD TEMPLATE] Failed to cleanup file:', e.message);
                }
            }
            res.status(500).json({ success: false, message: error.message });
        }
    }
];

/**
 * PREVIEW WORD TEMPLATE AS PDF (Synchronous via LibreOffice)
 */
exports.previewWordTemplatePDF = async (req, res) => {
    try {
        const { templateId } = req.params;

        console.log(`🔍[PREVIEW WORD TEMPLATE PDF] Request for templateId: ${templateId} `);

        // Validate ID format
        if (!templateId || !mongoose.Types.ObjectId.isValid(templateId)) {
            console.error(`🔍[PREVIEW WORD TEMPLATE PDF] Invalid templateId format: ${templateId} `);
            return res.status(400).json({ message: "Invalid template ID format" });
        }

        // Get tenant-specific model
        const { LetterTemplate } = getModels(req);

        // Build query with tenant filtering if available
        const query = { _id: templateId };
        if (req.user?.tenantId) {
            query.tenantId = req.user.tenantId;
        }

        const template = await LetterTemplate.findOne(query);

        if (!template) {
            console.error(`🔍[PREVIEW WORD TEMPLATE PDF] Template not found for ID: ${templateId} `);
            return res.status(404).json({ message: "Template not found" });
        }

        // Validate template type
        if (template.templateType !== 'WORD') {
            console.error(`🔍[PREVIEW WORD TEMPLATE PDF] Template is not a WORD template: ${template.templateType} `);
            return res.status(400).json({ message: "Template is not a WORD template. Preview is only available for WORD templates." });
        }

        // Validate filePath exists
        if (!template.filePath) {
            console.error(`🔍[PREVIEW WORD TEMPLATE PDF] Template filePath is missing`);
            return res.status(400).json({ message: "Template file path not set. Please re-upload the template." });
        }

        // Normalize and validate file path
        const normalizedFilePath = normalizeFilePath(template.filePath);
        console.log(`🔍[PREVIEW WORD TEMPLATE PDF] Original path: ${template.filePath} `);
        console.log(`🔍[PREVIEW WORD TEMPLATE PDF] Normalized path: ${normalizedFilePath} `);

        // Check if file exists
        if (!fs.existsSync(normalizedFilePath)) {
            console.error(`❌[PREVIEW WORD TEMPLATE PDF] Template file NOT FOUND at path: ${normalizedFilePath} `);
            console.error(`❌[PREVIEW WORD TEMPLATE PDF] Original path from DB: ${template.filePath} `);
            return res.status(404).json({
                message: "Template file not found on server. Please re-upload the template.",
                code: "FILE_NOT_FOUND"
            });
        }

        const templateDir = path.dirname(normalizedFilePath);
        const templateBaseName = path.basename(normalizedFilePath, '.docx');
        let pdfPath = path.join(templateDir, `${templateBaseName}.pdf`);

        // For joining letters, create a preview with sample data
        if (template.type === 'joining') {
            // Create a temporary DOCX with sample data replaced
            const content = await fsPromises.readFile(normalizedFilePath);
            let zip, doc;
            try {
                zip = new PizZip(content);
                doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    nullGetter: function (tag) { return ''; },
                    delimiters: { start: '{{', end: '}}' }
                });
            } catch (error) {
                console.error('Template load failed:', error);
                return res.status(400).json({ message: "Template load failed", error: error.message });
            }

            // Sample data for preview
            const sampleData = {
                employee_name: 'John Doe',
                father_name: 'Mr. Doe Sr.',
                designation: 'Software Engineer',
                department: 'IT Department',
                joining_date: new Date().toLocaleDateString('en-IN'),
                location: 'Mumbai, India',
                candidate_address: '123 Sample Street, Mumbai - 400001',
                offer_ref_code: 'OFFER/2024/001',
                current_date: new Date().toLocaleDateString('en-IN')
            };

            try {
                doc.render(sampleData);
            } catch (renderError) {
                console.error('Preview render failed:', renderError);
                // Continue with original template if render fails
            }

            // Generate temporary DOCX
            const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
            const tempDocxPath = path.join(templateDir, `${templateBaseName}_preview.docx`);
            await fsPromises.writeFile(tempDocxPath, buf);

            // Update pdfPath to use the preview version
            pdfPath = path.join(templateDir, `${templateBaseName}_preview.pdf`);

            // Convert the preview DOCX to PDF
            try {
                console.log('🔄 [PREVIEW] Converting preview template to PDF (LibreOffice)...');
                const libreOfficeService = require('../services/LibreOfficeService');
                libreOfficeService.convertToPdfSync(tempDocxPath, templateDir);
            } catch (err) {
                console.error('⚠️ [PREVIEW] Preview conversion failed:', err.message);
                // Fallback to original PDF if it exists
                pdfPath = path.join(templateDir, `${templateBaseName}.pdf`);
                if (!fs.existsSync(pdfPath)) {
                    return res.status(500).json({ message: "PDF preview generation failed", error: err.message });
                }
            }
        } else {
            // For non-joining templates, use original logic
            // Check/Convert
            try {
                // Check if PDF exists and is newer than DOCX
                let needsConversion = true;
                if (fs.existsSync(pdfPath)) {
                    const docxStats = fs.statSync(normalizedFilePath);
                    const pdfStats = fs.statSync(pdfPath);
                    if (pdfStats.mtime >= docxStats.mtime) {
                        needsConversion = false;
                    }
                }

                if (needsConversion) {
                    console.log('🔄 [PREVIEW] Converting template to PDF (LibreOffice)...');
                    const libreOfficeService = require('../services/LibreOfficeService');
                    libreOfficeService.convertToPdfSync(normalizedFilePath, templateDir);
                }
            } catch (err) {
                console.error('⚠️ [PREVIEW] Conversion failed:', err.message);
                // If PDF exists (even if old), try to serve it, otherwise error
                if (!fs.existsSync(pdfPath)) {
                    return res.status(500).json({ message: "PDF preview generation failed", error: err.message });
                }
            }
        }

        // Verify PDF exists before serving
        if (!fs.existsSync(pdfPath)) {
            console.error(`🔍[PREVIEW WORD TEMPLATE PDF] Generated PDF not found at: ${pdfPath}`);
            return res.status(500).json({ message: "PDF preview generation failed. The PDF file was not created." });
        }

        // Serve PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename = "${templateBaseName}.pdf"`);
        const pdfStream = fs.createReadStream(pdfPath);

        // Handle stream errors
        pdfStream.on('error', (streamError) => {
            console.error(`❌[PREVIEW WORD TEMPLATE PDF] Stream error: `, streamError);
            if (!res.headersSent) {
                res.status(500).json({ message: "Error reading PDF file", error: streamError.message });
            }
        });

        pdfStream.pipe(res);

    } catch (error) {
        console.error('❌ [PREVIEW WORD TEMPLATE PDF] Error:', error);
        console.error('❌ [PREVIEW WORD TEMPLATE PDF] Stack:', error.stack);
        if (!res.headersSent) {
            res.status(500).json({ message: "Failed to generate PDF preview", error: error.message });
        }
    }
};

/**
 * DOWNLOAD ORIGINAL WORD TEMPLATE FILE (.docx)
 */
exports.downloadWordTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;

        // Validate ID
        if (!templateId || !mongoose.Types.ObjectId.isValid(templateId)) {
            return res.status(400).json({ message: "Invalid template ID format" });
        }

        // Get tenant-specific model
        const { LetterTemplate } = getModels(req);

        // Build query with tenant filtering if available
        const query = { _id: templateId };
        if (req.user?.tenantId) {
            query.tenantId = req.user.tenantId;
        }

        const template = await LetterTemplate.findOne(query);

        if (!template) {
            console.error(`❌[DOWNLOAD WORD] Template not found: ${templateId}`);
            return res.status(404).json({ message: "Template not found" });
        }

        if (template.templateType !== 'WORD') {
            return res.status(400).json({ message: "This endpoint is only for WORD templates" });
        }

        if (!template.filePath) {
            console.error(`❌[DOWNLOAD WORD] Template filePath missing for template: ${templateId} `);
            return res.status(400).json({ message: "Template file path not set. Please re-upload the template." });
        }

        // Normalize file path
        const normalizedFilePath = normalizeFilePath(template.filePath);

        if (!fs.existsSync(normalizedFilePath)) {
            console.error(`❌[DOWNLOAD WORD] Template file NOT FOUND at: ${normalizedFilePath} `);
            return res.status(404).json({
                message: "Template file not found on server. Please re-upload the template.",
                code: "FILE_NOT_FOUND"
            });
        }

        // Serve the Word file
        const fileName = path.basename(normalizedFilePath);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename = "${template.name || fileName}"`);
        const fileStream = fs.createReadStream(normalizedFilePath);

        fileStream.on('error', (streamError) => {
            console.error(`❌[DOWNLOAD WORD] Stream error: `, streamError);
            if (!res.headersSent) {
                res.status(500).json({ message: "Error reading template file", error: streamError.message });
            }
        });

        fileStream.pipe(res);

    } catch (error) {
        console.error('❌ [DOWNLOAD WORD] Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};

/**
 * DOWNLOAD WORD TEMPLATE AS PDF (Synchronous via LibreOffice)
 */
exports.downloadWordTemplatePDF = async (req, res) => {
    try {
        const { templateId } = req.params;

        // Validate ID
        if (!templateId || !mongoose.Types.ObjectId.isValid(templateId)) {
            return res.status(400).json({ message: "Invalid template ID format" });
        }

        // Get tenant-specific model
        const { LetterTemplate } = getModels(req);

        const template = await LetterTemplate.findById(templateId);

        if (!template) {
            console.error(`❌[DOWNLOAD PDF] Template not found: ${templateId} `);
            return res.status(404).json({ message: "Template not found" });
        }

        if (!template.filePath) {
            console.error(`❌[DOWNLOAD PDF] Template filePath missing for template: ${templateId} `);
            return res.status(400).json({ message: "Template file path not set. Please re-upload the template." });
        }

        // Normalize file path
        const normalizedFilePath = normalizeFilePath(template.filePath);

        if (!fs.existsSync(normalizedFilePath)) {
            console.error(`❌[DOWNLOAD PDF] Template file NOT FOUND at: ${normalizedFilePath} `);
            return res.status(404).json({
                message: "Template file not found on server. Please re-upload the template.",
                code: "FILE_NOT_FOUND"
            });
        }

        const templateDir = path.dirname(normalizedFilePath);
        const templateBaseName = path.basename(normalizedFilePath, '.docx');
        const pdfPath = path.join(templateDir, `${templateBaseName}.pdf`);

        // Check/Convert
        try {
            let needsConversion = true;
            if (fs.existsSync(pdfPath)) {
                const docxStats = fs.statSync(normalizedFilePath);
                const pdfStats = fs.statSync(pdfPath);
                if (pdfStats.mtime >= docxStats.mtime) {
                    needsConversion = false;
                }
            }

            if (needsConversion) {
                console.log('🔄 [DOWNLOAD PDF] Converting template to PDF (LibreOffice)...');
                const libreOfficeService = require('../services/LibreOfficeService');
                libreOfficeService.convertToPdfSync(normalizedFilePath, templateDir);
            }
        } catch (err) {
            console.error('⚠️ [DOWNLOAD] Conversion failed:', err.message);
            if (!fs.existsSync(pdfPath)) {
                return res.status(500).json({ message: "PDF generation failed", error: err.message });
            }
        }

        // Serve PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename = "${templateBaseName}.pdf"`);
        const pdfStream = fs.createReadStream(pdfPath);
        pdfStream.pipe(res);

    } catch (error) {
        console.error('Download Error:', error);
        if (!res.headersSent) res.status(500).json({ message: error.message });
    }
};

/**
 * GENERATE JOINING LETTER (Word -> PDF)
 * - Load Word Template
 * - Replace placeholders
 * - Convert to PDF
 */
exports.generateJoiningLetter = async (req, res) => {
    try {
        console.log('🔥 [JOINING LETTER] Request received:', {
            bodyKeys: Object.keys(req.body),
            userId: req.user?.id,
            tenantId: req.user?.tenantId
        });

        const { applicantId, employeeId, templateId, refNo, issueDate } = req.body;
        const Applicant = getApplicantModel(req);
        const { Employee, LetterTemplate, GeneratedLetter } = getModels(req);

        console.log('🔥 [JOINING LETTER] Request received:', { applicantId, employeeId, templateId, refNo, issueDate });

        // Validate input
        if (!templateId || (!applicantId && !employeeId)) {
            return res.status(400).json({ message: "templateId and (applicantId or employeeId) are required" });
        }

        // Fetch target
        let target;
        let targetType;
        if (employeeId) {
            target = await Employee.findById(employeeId);
            targetType = 'employee';
        } else {
            target = await Applicant.findById(applicantId).populate('requirementId');
            targetType = 'applicant';
        }

        if (targetType === 'applicant' && !applicantId) {
            throw new Error("Missing applicantId in generateJoiningLetter");
        }

        const template = await LetterTemplate.findOne({ _id: templateId, tenantId: req.user.tenantId });

        if (!target || !template) {
            console.error('🔥 [JOINING LETTER] Missing target or template');
            return res.status(404).json({ message: "Employee/Applicant or Template not found" });
        }

        const applicantData = target;
        console.log('🔥 [JOINING LETTER] Target Ready:', applicantData?.name || "N/A");

        // 1. MUST BE LOCKED
        if (!target.salaryLocked) {
            console.error('🔥 [JOINING LETTER] BLOCKED: Salary not locked for', targetType, target._id);
            return res.status(400).json({ message: "Salary must be confirmed and locked before generating joining letter." });
        }

        // STRICT REQUIREMENT for applicants: Fail if Offer Letter does not exist
        if (targetType === 'applicant' && !target.offerLetterPath) {
            console.error('🔥 [JOINING LETTER] BLOCKED: Applicant has no Offer Letter generated.');
            return res.status(400).json({ message: "Offer Letter must be generated before Joining Letter." });
        }

        if (template.type !== 'joining') {
            return res.status(400).json({ message: "Invalid template type for joining letter" });
        }

        // 1. Validate and normalize file path
        if (!template.filePath) {
            console.error('🔥 [JOINING LETTER] Template filePath is missing in database');
            return res.status(400).json({
                message: "Template file path is missing. Please re-upload the template.",
                code: "FILE_PATH_MISSING"
            });
        }

        // Normalize file path (handle both absolute and relative paths)
        const normalizedFilePath = normalizeFilePath(template.filePath);
        console.log('🔥 [JOINING LETTER] Original filePath:', template.filePath);
        console.log('🔥 [JOINING LETTER] Normalized filePath:', normalizedFilePath);

        if (!fs.existsSync(normalizedFilePath)) {
            console.error('❌ [JOINING LETTER] Template file NOT FOUND at path:', normalizedFilePath);
            console.error('❌ [JOINING LETTER] Original path from DB:', template.filePath);
            return res.status(404).json({
                message: "Template file not found on server. Please re-upload the template.",
                code: "FILE_NOT_FOUND",
                templateId: template._id.toString()
            });
        }

        console.log('✅ [JOINING LETTER] Template file found, reading...');
        const content = await fsPromises.readFile(normalizedFilePath);

        // 2. Initialize Docxtemplater SAFE MODE
        let doc;
        try {
            const zip = new PizZip(content);
            doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: function (tag) { return ''; }, // Return empty string for ANY missing tag
                delimiters: { start: '{{', end: '}}' }
            });
        } catch (error) {
            console.error('🔥 [JOINING LETTER] Docxtemplater Init Failed:', error);
            return res.status(400).json({ message: "Template load failed", error: error.message });
        }


        // 3. Prepare Data - FETCH FROM EmployeeSalarySnapshot (Single Source of Truth)
        const EmployeeSalarySnapshot = req.tenantDB.model('EmployeeSalarySnapshot');

        // ALWAYS fetch from database - embedded snapshots may be incomplete
        console.log('?? [JOINING LETTER] Fetching snapshot from database...');
        const query = employeeId ? { employee: employeeId } : { applicant: applicantId };
        let snapshot = await EmployeeSalarySnapshot.findOne(query).sort({ createdAt: -1 }).lean();

        if (snapshot) {
            console.log('? [JOINING LETTER] Found DB Snapshot:', {
                id: snapshot._id,
                locked: snapshot.locked,
                earningsCount: (snapshot.earnings || []).length,
                deductionsCount: (snapshot.employeeDeductions || []).length,
                benefitsCount: (snapshot.benefits || []).length,
                ctc: snapshot.ctc
            });
        }

        // Robust Fallback: Check target's specific snapshot references
        if (!snapshot && target) {
            console.log(`[JOINING LETTER] Snapshot not found by query, trying target references for ${targetType}`);
            const snapId = target.currentSalarySnapshotId || target.salarySnapshotId;
            if (snapId) {
                snapshot = await EmployeeSalarySnapshot.findById(snapId).lean();
            }
            // If still not found and is employee, check their snapshots array
            if (!snapshot && targetType === 'employee' && target.salarySnapshots?.length > 0) {
                const lastSnapId = target.salarySnapshots[target.salarySnapshots.length - 1];
                snapshot = await EmployeeSalarySnapshot.findById(lastSnapId).lean();
            }
        }

        if (!snapshot) {
            console.error(`[JOINING LETTER] EmployeeSalarySnapshot not found for ${targetType}: ${employeeId || applicantId}. Checked query and target refs.`);
            return res.status(400).json({ message: "Salary snapshot not found. Please complete Salary Assignment first." });
        }

        // Helper to format currency
        const cur = (val) => Math.round(val || 0).toLocaleString('en-IN');

        const earnings = (snapshot.earnings || []).map(e => ({
            ...e,
            monthly: e.monthlyAmount || e.monthly || 0,
            yearly: e.yearlyAmount || e.yearly || e.annualAmount || (e.monthlyAmount * 12) || 0
        }));

        const employeeDeductions = (snapshot.employeeDeductions || snapshot.deductions || []).map(d => ({
            ...d,
            monthly: d.monthlyAmount || d.monthly || 0,
            yearly: d.yearlyAmount || d.yearly || d.annualAmount || (d.monthlyAmount * 12) || 0
        }));

        const benefits = (snapshot.benefits || []).map(b => ({
            ...b,
            monthly: b.monthlyAmount || b.monthly || 0,
            yearly: b.yearlyAmount || b.yearly || b.annualAmount || (b.monthlyAmount * 12) || 0
        }));

        // Use pre-calculated totals from snapshot if available for consistency
        const grossAAnnual = snapshot.summary?.grossEarnings || snapshot.breakdown?.totalEarnings || earnings.reduce((sum, e) => sum + e.yearly, 0);
        const totalBenefitsAnnual = snapshot.summary?.totalBenefits || snapshot.breakdown?.totalBenefits || benefits.reduce((sum, b) => sum + b.yearly, 0);
        const totalDeductionsAnnual = snapshot.summary?.totalDeductions || snapshot.breakdown?.totalDeductions || employeeDeductions.reduce((sum, d) => sum + d.yearly, 0);
        const totalCTCAnnual = snapshot.ctc || snapshot.annualCTC || (grossAAnnual + totalBenefitsAnnual);
        const netAnnual = snapshot.summary?.netPay || snapshot.breakdown?.netPay || (grossAAnnual - totalDeductionsAnnual);


        // Categorize Benefits for Gross B (Annual) and Gross C (Retirals)
        const grossBListRaw = benefits.filter(b => /bonus|lta|leave|variable|annual|performance/i.test(b.name || ''));
        const grossCListRaw = benefits.filter(b => !/bonus|lta|leave|variable|annual|performance/i.test(b.name || ''));

        const grossBAnnualTotal = grossBListRaw.reduce((sum, b) => sum + (b.yearly || 0), 0);
        const grossCAnnualTotal = grossCListRaw.reduce((sum, b) => sum + (b.yearly || 0), 0);

        const totals = {
            grossA: {
                monthly: Math.round(grossAAnnual / 12),
                yearly: Math.round(grossAAnnual),
                formattedM: safeCur(grossAAnnual / 12),
                formattedY: safeCur(grossAAnnual)
            },
            grossB: {
                monthly: Math.round(grossBAnnualTotal / 12),
                yearly: Math.round(grossBAnnualTotal),
                formattedM: safeCur(grossBAnnualTotal / 12),
                formattedY: safeCur(grossBAnnualTotal)
            },
            grossC: {
                monthly: Math.round(grossCAnnualTotal / 12),
                yearly: Math.round(grossCAnnualTotal),
                formattedM: safeCur(grossCAnnualTotal / 12),
                formattedY: safeCur(grossCAnnualTotal)
            },
            deductions: {
                monthly: Math.round(totalDeductionsAnnual / 12),
                yearly: Math.round(totalDeductionsAnnual),
                formattedM: safeCur(totalDeductionsAnnual / 12),
                formattedY: safeCur(totalDeductionsAnnual)
            },
            net: {
                monthly: Math.round(netAnnual / 12),
                yearly: Math.round(netAnnual),
                formattedM: safeCur(netAnnual / 12),
                formattedY: safeCur(netAnnual)
            },
            computedCTC: {
                monthly: Math.round(totalCTCAnnual / 12),
                yearly: Math.round(totalCTCAnnual),
                formattedM: safeCur(totalCTCAnnual / 12),
                formattedY: safeCur(totalCTCAnnual)
            }
        };

        const flatData = {};
        earnings.forEach(e => { flatData[e.code] = cur(e.monthly || e.monthlyAmount); flatData[`${e.code} _ANNUAL`] = cur(e.yearly || e.yearlyAmount); });
        employeeDeductions.forEach(d => { flatData[d.code] = cur(d.monthly || d.monthlyAmount); flatData[`${d.code} _ANNUAL`] = cur(d.yearly || d.yearlyAmount); });
        benefits.forEach(b => { flatData[b.code] = cur(b.monthly || b.monthlyAmount); flatData[`${b.code} _ANNUAL`] = cur(b.yearly || b.yearlyAmount); });

        req.calculatedSalaryData = {
            earnings: earnings.map(e => ({ name: e.name, monthly: cur(e.monthly), yearly: cur(e.yearly) })),
            deductions: employeeDeductions.map(d => ({ name: d.name, monthly: cur(d.monthly), yearly: cur(d.yearly) })),
            benefits: benefits.map(b => ({ name: b.name, monthly: cur(b.monthly), yearly: cur(b.yearly) })),
            totals,
            flatData
        };
        req.flatSalaryData = flatData;

        // --- BUILD TABLE ---
        const salaryComponents = [];
        const earningsList = req.calculatedSalaryData.earnings;
        const deductionsList = req.calculatedSalaryData.deductions;
        const benefitsList = req.calculatedSalaryData.benefits;

        // A - Monthly Benefits (Gross A)
        salaryComponents.push({ name: 'A – Monthly Benefits', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        earnings.forEach(e => {
            const m = safeCur(e.monthly);
            const y = safeCur(e.yearly);
            salaryComponents.push({ name: e.name, monthly: m, yearly: y, annual: y, MONTHLY: m, YEARLY: y, ANNUAL: y });
        });
        salaryComponents.push({
            name: 'GROSS A',
            monthly: totals.grossA.formattedM, yearly: totals.grossA.formattedY, annual: totals.grossA.formattedY,
            MONTHLY: totals.grossA.formattedM, YEARLY: totals.grossA.formattedY, ANNUAL: totals.grossA.formattedY
        });

        // Deduction Section
        salaryComponents.push({ name: '', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        employeeDeductions.forEach(d => {
            const m = safeCur(d.monthly);
            const y = safeCur(d.yearly);
            salaryComponents.push({ name: d.name, monthly: m, yearly: y, annual: y, MONTHLY: m, YEARLY: y, ANNUAL: y });
        });
        salaryComponents.push({
            name: 'Total Deductions (B)',
            monthly: totals.deductions.formattedM, yearly: totals.deductions.formattedY, annual: totals.deductions.formattedY,
            MONTHLY: totals.deductions.formattedM, YEARLY: totals.deductions.formattedY, ANNUAL: totals.deductions.formattedY
        });
        salaryComponents.push({
            name: 'Take Home Package',
            monthly: totals.net.formattedM, yearly: totals.net.formattedY, annual: totals.net.formattedY,
            MONTHLY: totals.net.formattedM, YEARLY: totals.net.formattedY, ANNUAL: totals.net.formattedY
        });

        // B - Annual Benefits
        salaryComponents.push({ name: '', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        salaryComponents.push({ name: 'B – Annual Benefits', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        grossBListRaw.forEach(b => {
            const m = safeCur(b.monthly);
            const y = safeCur(b.yearly);
            salaryComponents.push({ name: b.name, monthly: m, yearly: y, annual: y, MONTHLY: m, YEARLY: y, ANNUAL: y });
        });
        salaryComponents.push({
            name: 'GROSS B',
            monthly: totals.grossB.formattedM, yearly: totals.grossB.formattedY, annual: totals.grossB.formattedY,
            MONTHLY: totals.grossB.formattedM, YEARLY: totals.grossB.formattedY, ANNUAL: totals.grossB.formattedY
        });

        // C - Retirals
        salaryComponents.push({ name: '', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        salaryComponents.push({ name: 'C – Retirals Company\'s Benefits', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        grossCListRaw.forEach(b => {
            const m = safeCur(b.monthly);
            const y = safeCur(b.yearly);
            salaryComponents.push({ name: b.name, monthly: m, yearly: y, annual: y, MONTHLY: m, YEARLY: y, ANNUAL: y });
        });
        salaryComponents.push({
            name: 'GROSS C',
            monthly: totals.grossC.formattedM, yearly: totals.grossC.formattedY, annual: totals.grossC.formattedY,
            MONTHLY: totals.grossC.formattedM, YEARLY: totals.grossC.formattedY, ANNUAL: totals.grossC.formattedY
        });

        // Final CTC
        salaryComponents.push({ name: '', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        salaryComponents.push({
            name: 'Computed CTC (A+B+C)',
            monthly: totals.computedCTC.formattedM, yearly: totals.computedCTC.formattedY, annual: totals.computedCTC.formattedY,
            MONTHLY: totals.computedCTC.formattedM, YEARLY: totals.computedCTC.formattedY, ANNUAL: totals.computedCTC.formattedY
        });

        console.log("salaryComponents (FINAL STRICT) =>", salaryComponents);

        // --- GENERATE APPOINTMENT REFERENCE NUMBER ---
        let generatedRefNo = null;
        try {
            const companyIdConfig = require('./companyIdConfig.controller');
            const tenantId = req.user?.tenantId || req.tenantId;

            // Fetch Company Profile for company code and branch code
            const { CompanyProfile } = getModels(req);
            const companyProfile = await CompanyProfile.findOne({ tenantId: tenantId });

            const companyCode = companyProfile?.companyCode || 'GTPL';
            const branchCode = companyProfile?.branchCode || 'AHM';

            // Get department code for reference number
            const deptName = targetType === 'employee' ? (target.department || 'GEN') : (target.requirementId?.department?.name || 'GEN');
            const deptCode = deptName.substring(0, 3).toUpperCase();

            console.log('🔍 [JOINING LETTER] ID Generation Context:', {
                companyCode,
                branchCode,
                deptCode,
                targetType,
                department: deptName
            });

            // Generate APPOINTMENT ID with all replacements
            const appointmentIdResult = await companyIdConfig.generateIdInternal({
                tenantId: tenantId,
                entityType: 'APPOINTMENT',
                increment: true,
                extraReplacements: {
                    '{{COMPANY}}': companyCode,
                    '{{BRANCH}}': branchCode,
                    '{{DEPT}}': deptCode
                }
            });

            generatedRefNo = appointmentIdResult.id;
            console.log('✅ [JOINING LETTER] Generated Reference Number:', generatedRefNo);
        } catch (idErr) {
            console.warn("⚠️ [JOINING LETTER] Could not generate reference number:", idErr.message);
            console.error("⚠️ [JOINING LETTER] ID Generation Error Stack:", idErr.stack);
            generatedRefNo = `APPT - ${new Date().getFullYear()} -${String(Math.floor(Math.random() * 10000)).padStart(5, '0')} `;
        }

        // A. Basic Placeholders
        // Normalize target for mapOfferToJoiningData
        const normalizedTarget = {
            ...(target.toObject ? target.toObject() : target),
            name: target.name || (target.firstName ? `${target.firstName} ${target.lastName || ''} `.trim() : ''),
            address: target.address || (target.tempAddress ? `${target.tempAddress.line1}, ${target.tempAddress.city} ` : '')
        };
        const basicData = joiningLetterUtils.mapOfferToJoiningData(normalizedTarget, {}, snapshot);

        // Build complete salaryStructure object for template
        const salaryStructure = {
            earnings: req.calculatedSalaryData?.earnings || [],
            deductions: req.calculatedSalaryData?.deductions || [],
            benefits: req.calculatedSalaryData?.benefits || [],
            totals: {
                grossA: req.calculatedSalaryData?.totals?.grossA || { monthly: 0, yearly: 0, formattedM: '0', formattedY: '0' },
                grossB: req.calculatedSalaryData?.totals?.grossB || { monthly: 0, yearly: 0, formattedM: '0', formattedY: '0' },
                grossC: req.calculatedSalaryData?.totals?.grossC || { monthly: 0, yearly: 0, formattedM: '0', formattedY: '0' },
                netSalary: req.calculatedSalaryData?.totals?.netSalary || { monthly: 0, yearly: 0 },
                totalCTC: req.calculatedSalaryData?.totals?.totalCTC || { monthly: 0, yearly: 0 },
                computedCTC: req.calculatedSalaryData?.totals?.computedCTC || { monthly: 0, yearly: 0, formattedM: '0', formattedY: '0' },
                ...(req.calculatedSalaryData?.totals || {})
            }
        };

        const initialData = {
            ...basicData,
            salaryComponents: salaryComponents,
            salaryStructure: salaryStructure,
            earnings: salaryStructure.earnings,
            deductions: salaryStructure.deductions,
            benefits: salaryStructure.benefits,
            totals: salaryStructure.totals,
            ...(req.calculatedSalaryData || {}),
            ...(req.flatSalaryData || {}),
            salary_table_text_block: salaryComponents.map(r => `${r.name} \t${r.monthly} \t${r.yearly} `).join('\n'),
            SALARY_TABLE: salaryComponents.map(r => `${r.name} \t${r.monthly} \t${r.yearly} `).join('\n'),

            // Custom Overrides for Ref No and Issue Date (Use generated APPOINTMENT ID)
            ref_no: refNo || generatedRefNo || basicData.ref_no,
            refNo: refNo || generatedRefNo || basicData.ref_no,
            ref_code: refNo || generatedRefNo || basicData.ref_no,
            reference_number: refNo || generatedRefNo || basicData.ref_no,
            appointment_id: generatedRefNo,
            APPOINTMENT_ID: generatedRefNo,
            issued_date: issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : (basicData.issued_date || new Date().toLocaleDateString('en-IN')),
            issuedDate: issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : (basicData.issued_date || new Date().toLocaleDateString('en-IN')),
            issue_date: issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : (basicData.issued_date || new Date().toLocaleDateString('en-IN')),
            current_date: issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : (basicData.current_date || new Date().toLocaleDateString('en-IN'))
        };

        // (Cleanup: removed redundant legacy validation and duplicate finalData declaration)
        console.log('✅ [JOINING LETTER] Explicit salary table built. Rows:', salaryComponents.length);

        // ========== UNIVERSAL STABLE PATCH ENGINE (STABLE FOREVER) ==========
        const finalData = applyUniversalSalaryPatches(initialData, snapshot, totals);

        // Log prepared keys
        console.log('🔥 [JOINING LETTER] Final data prepared:', Object.keys(finalData));

        // Final structural safety guard
        Object.keys(finalData).forEach(k => {
            if (finalData[k] === undefined || finalData[k] === null) {
                finalData[k] = "0";
            }
            // Ensure no nested objects survive to cause docxtemplater crashes
            if (typeof finalData[k] === 'object' && finalData[k] !== null) {
                finalData[k] = "";
            }
        });
        // ========== END SAFE PATCHES ==========

        // ========== END SAFE PATCHES ==========

        // 4. Render
        console.log('🔥 [JOINING LETTER] Rendering with data...');
        try {
            doc.render(finalData);
        } catch (renderError) {
            console.error('🔥 [JOINING LETTER] RENDER CRASH:', renderError);
            return res.status(500).json({
                message: "Joining letter generation failed due to template rendering issues.",
                error: renderError.message
            });
        }

        // 5. Generate Output (DOCX)
        const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
        const fileName = `Joining_Letter_${employeeId || applicantId || 'id'}_${Date.now()}`;
        const outputDir = path.join(__dirname, '../uploads/offers');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const docxPath = path.join(outputDir, `${fileName}.docx`);
        await fsPromises.writeFile(docxPath, buf);

        // 6. Convert to PDF Synchronously using LibreOffice
        let finalRelativePath;
        let finalPdfUrl;

        try {
            console.log('🔄 [JOINING LETTER] Starting Synchronous PDF Conversion (LibreOffice)...');
            const libreOfficeService = require('../services/LibreOfficeService');

            // Synchronous Call - blocks until done
            const pdfAbsolutePath = libreOfficeService.convertToPdfSync(docxPath, outputDir);
            const pdfFileName = path.basename(pdfAbsolutePath);

            finalRelativePath = `offers/${pdfFileName}`;
            finalPdfUrl = `/uploads/${finalRelativePath}`;

            console.log('✅ [JOINING LETTER] PDF Ready:', finalPdfUrl);

        } catch (pdfError) {
            console.error('⚠️ [JOINING LETTER] PDF Conversion Failed:', pdfError.message);
            return res.status(500).json({
                message: "PDF Generation Failed.",
                error: pdfError.message
            });
        }

        const generated = new GeneratedLetter({
            tenantId: req.user?.tenantId || req.tenantId,
            applicantId: applicantId, // Use correct schema key
            employeeId: employeeId || null,
            templateId,
            letterType: 'joining',
            pdfPath: finalRelativePath,
            pdfUrl: finalPdfUrl,
            status: 'generated',
            generatedBy: req.user?.id
        });

        await generated.save();

        // Increment Appointment ID Sequence (Consume the ID)
        try {
            const companyIdConfigController = require('./companyIdConfig.controller');
            await companyIdConfigController.generateIdInternal({
                tenantId: req.user.tenantId,
                entityType: 'APPOINTMENT',
                increment: true
            });
            console.log('✅ [JOINING LETTER] Incremented Appointment ID sequence');
        } catch (seqError) {
            console.warn('⚠️ [JOINING LETTER] Failed to increment sequence:', seqError.message);
        }

        // Update Applicant/Employee
        if (targetType === 'applicant') {
            target.joiningLetterPath = finalRelativePath;

            if (!target.timeline) target.timeline = [];
            target.timeline.push({
                status: 'Joining Letter Generated',
                message: 'Joining letter has been generated and is ready for download.',
                updatedBy: req.user?.name || "HR",
                timestamp: new Date()
            });

            await target.save();

            // -----------------------------------------------------
            // NOTIFICATIONS & EMAILS (Added via Request)
            // -----------------------------------------------------
            // 1. Update Status to 'Joining Letter Issued'
            target.status = 'Joining Letter Issued';
            await target.save();

            try {
                // Fetch Company Profile for Email
                const { CompanyProfile, Notification } = getModels(req);
                const companyProfile = await CompanyProfile.findOne({ tenantId: req.user.tenantId });
                const companyName = companyProfile?.companyName || 'Gitakshmi Technologies';

                // Construct absolute path for attachment
                const attachmentPath = path.join(__dirname, '../uploads', finalRelativePath);
                const jobTitle = target.requirementId?.jobTitle || 'Role';

                // 2. Send Email
                if (target.email) {
                    // emailService.sendJoiningLetterEmail(to, candidateName, jobTitle, companyName, joiningDate, pdfPath)
                    // issueDate is passed in body, format it
                    const formattedJoiningDate = (target.joiningDate || issueDate) ? new Date(target.joiningDate || issueDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

                    await emailService.sendJoiningLetterEmail(
                        target.email,
                        target.name,
                        jobTitle,
                        companyName,
                        formattedJoiningDate,
                        attachmentPath
                    );
                    console.log(`✅[JOINING LETTER] Email sent to ${target.email} `);
                }

                // 3. Create Notification for Candidate Portal
                if (target.candidateId) {
                    await Notification.create({
                        tenant: req.user.tenantId,
                        receiverId: target.candidateId,
                        receiverRole: 'candidate',
                        entityType: 'JoiningLetter',
                        entityId: generated._id,
                        title: 'Joining Letter Issued',
                        message: `Congratulations! Your joining letter for ${jobTitle} has been issued.Please check your email or download it from here.`,
                        isRead: false
                    });
                    console.log(`✅[JOINING LETTER] Notification created for candidate ${target.candidateId}`);
                }

            } catch (notifyErr) {
                console.error("⚠️ [JOINING LETTER] Failed to send notifications:", notifyErr.message);
                // Non-blocking error
            }
        }

        // RETURN PDF URL IMMEDIATELY
        console.log('✅ [JOINING LETTER] SUCCESS - Sending response:', {
            success: true,
            downloadUrl: finalPdfUrl,
            letterId: generated._id
        });

        return res.json({
            success: true,
            fileUrl: finalPdfUrl,
            downloadUrl: finalPdfUrl, // Compatibility with handleJoiningGenerate
            fileName: fileName,
            letterId: generated._id
        });

    } catch (error) {
        // Test comment
        console.error('🔥 [JOINING LETTER] FATAL ERROR:', error);
        res.status(500).json({
            success: false,
            message: "Generate Failed: " + error.message,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * GENERATE OFFER LETTER (HTML -> PDF)
 * - Uses Puppeteer/Images
 */
exports.generateOfferLetter = async (req, res) => {
    try {
        // Accept params from the Generate Modal
        const { applicantId, templateId, imageData, refNo, joiningDate, address, department, location, fatherName, salutation, issueDate, preview, name, dearName, dateFormat } = req.body;
        console.log('🐞 [DEBUG INPUTS] Salutation:', salutation, '| IssueDate:', issueDate, '| preview:', preview, '| Name:', name, '| DearName:', dearName, '| DateFormat:', dateFormat);
        const Applicant = getApplicantModel(req);

        // Get tenant-specific models
        const { LetterTemplate, GeneratedLetter } = getModels(req);

        // Get the template to check its type
        const template = await LetterTemplate.findOne({ _id: templateId, tenantId: req.tenantId || req.user.tenantId });
        if (!template) {
            console.error('❌ [OFFER LETTER] Template not found:', templateId);
            return res.status(404).json({ message: "Template not found" });
        }

        const applicant = await Applicant.findById(applicantId).populate('requirementId');
        if (!applicant) {
            console.error('❌ [OFFER LETTER] Applicant not found:', applicantId);
            return res.status(404).json({ message: "Applicant not found" });
        }

        console.log('✅ [OFFER LETTER] Found Applicant:', applicant.name, '| Template:', template.templateName);

        // --- BGV INTEGRATION ---
        const { BGVCase } = getModels(req);
        if (BGVCase) {
            try {
                const tenantId = req.tenantId || req.user.tenantId;
                const bgv = await BGVCase.findOne({ applicationId: applicant._id, tenant: tenantId });
                console.log(`🔍[OFFER LETTER] BGV Status: ${bgv ? bgv.overallStatus : 'NOT_FOUND'} `);

                if (bgv) {
                    if (bgv.overallStatus === 'FAILED') {
                        // Auto-reject if not already rejected
                        if (applicant.status !== 'Rejected') {
                            applicant.status = 'Rejected';
                            applicant.timeline.push({
                                status: 'Rejected',
                                message: 'Offer blocked: Background Verification (BGV) FAILED.',
                                updatedBy: 'System (BGV)',
                                timestamp: new Date()
                            });
                            await applicant.save();
                        }
                        return res.status(403).json({
                            message: "Offer letter blocked. Background Verification (BGV) FAILED for this candidate.",
                            bgvStatus: 'FAILED'
                        });
                    }

                    if (bgv.overallStatus === 'IN_PROGRESS') {
                        console.warn(`⚠️[OFFER LETTER] BGV is still IN_PROGRESS for ${applicant.name}.Proceeding with caution.`);
                        // Non-blocking: We allow generation but could add a warning to the response if needed.
                        // For now, let's just proceed to solve the user's issue.
                    }
                }
            } catch (bgvErr) {
                console.warn("⚠️ [OFFER LETTER] Failed to check BGV status:", bgvErr.message);
                // Continue despite BGV check failure (non-blocking)
            }
        }
        // -----------------------

        let relativePath;
        let downloadUrl;
        let templateType = template.templateType;
        let pdfFileName; // Store filename for database

        if (template.templateType === 'WORD') {
            // Handle Word template processing
            console.log('🔥 [OFFER LETTER] Processing Word template (Sync using LibreOffice)');

            if (!template.filePath) {
                console.error('❌ [OFFER LETTER] Template filePath is missing in database');
                return res.status(400).json({
                    message: "Template file path is missing. Please re-upload the template.",
                    code: "FILE_PATH_MISSING"
                });
            }

            // Normalize file path
            const normalizedFilePath = normalizeFilePath(template.filePath);
            console.log('🔥 [OFFER LETTER] Original filePath:', template.filePath);
            console.log('🔥 [OFFER LETTER] Normalized filePath:', normalizedFilePath);

            if (!fs.existsSync(normalizedFilePath)) {
                console.error('❌ [OFFER LETTER] Template file NOT FOUND at path:', normalizedFilePath);
                return res.status(404).json({
                    message: "Word template file not found on server. Please re-upload the template.",
                    code: "FILE_NOT_FOUND"
                });
            }

            console.log('✅ [OFFER LETTER] Template file found, reading...');
            const content = await fsPromises.readFile(normalizedFilePath);

            // Initialize Docxtemplater
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: function (tag) { return ''; },
                delimiters: { start: '{{', end: '}}' }
            });

            // Prepare data using inputs from Modal + Applicant DB
            const safeString = (val) => (val !== undefined && val !== null ? String(val) : '');

            // Get father name with priority: Modal Input -> DB
            const finalFatherName = safeString(fatherName || applicant.fatherName);
            console.log('🔥 [OFFER LETTER] Father name source:', {
                fromModal: fatherName,
                fromDB: applicant.fatherName,
                final: finalFatherName
            });

            // Extract placeholders for debugging
            const docPlaceholders = await extractPlaceholders(normalizedFilePath);
            console.log('🔍 [OFFER LETTER] Placeholders found in template:', docPlaceholders);

            // Get issued date - From Modal or TODAY's date
            // Format: Do MMM. YYYY (e.g., "16th Jan. 2026")
            // Format: Based on user selection
            const validIssueDate = issueDate ? new Date(issueDate) : new Date();
            const issuedDate = formatCustomDate(validIssueDate, dateFormat);
            console.log('📅 [OFFER LETTER] Issued Date set to:', issuedDate, 'Format:', dateFormat);

            const fullName = `${salutation ? salutation + ' ' : ''}${safeString(name || applicant.name)} `;
            // Construct Dear Name: "Ms. Rima" if user entered "Rima"
            const finalDearName = `${salutation ? salutation + ' ' : ''}${safeString(dearName || name || applicant.name)} `;

            console.log('👤 [OFFER LETTER] Full Name constructed:', fullName);
            console.log('👤 [OFFER LETTER] Dear Name constructed:', finalDearName);

            const offerData = {
                employee_name: fullName,
                candidate_name: fullName,
                name: fullName,
                Name: fullName,
                NAME: fullName,
                ApplicantName: fullName,
                CandidateName: fullName,

                // Father name - support multiple placeholder variations
                father_name: finalFatherName,
                father_names: finalFatherName,
                fatherName: finalFatherName,
                fatherNames: finalFatherName,
                FATHER_NAME: finalFatherName,
                FATHER_NAMES: finalFatherName,

                designation: safeString(applicant.requirementId?.jobTitle || applicant.currentDesignation),
                // Joining Date: HR Input (Modal) -> Applicant DB (Fallback)
                // Joining Date: Force format even if DB has ISO string
                joining_date: formatCustomDate(joiningDate || applicant.joiningDate, dateFormat),
                joiningDate: formatCustomDate(joiningDate || applicant.joiningDate, dateFormat),
                JOINING_DATE: formatCustomDate(joiningDate || applicant.joiningDate, dateFormat),

                // Location: HR Input (Modal) -> Applicant DB (Fallback)
                location: safeString(location || applicant.location || applicant.workLocation),

                // Address: Priority -> Modal Input (address) -> Database (applicant.address)
                address: safeString(address || applicant.address),
                candidate_address: safeString(address || applicant.address),
                // Ref No: HR Input (Modal) ONLY
                offer_ref_no: safeString(refNo),
                refNo: safeString(refNo),

                // Issued Date - support multiple placeholder variations
                issued_date: issuedDate,
                issuedDate: issuedDate, // CamelCase alias
                ISSUED_DATE: issuedDate, // Uppercase alias
                Date: issuedDate,
                DATE: issuedDate,
                today: issuedDate,
                Today: issuedDate,
                current_date: issuedDate,
                issue_date: issuedDate,
                ISSUE_DATE: issuedDate,

                // Specific "Dear X" placeholder
                dear_name: finalDearName,
                DearName: finalDearName,
                dear_name_only: safeString(dearName || name || applicant.name) // Without Ms./Mr.
            };

            const issuedDateStr = issuedDate;
            const finalSalutation = salutation;
            const candidateNameWithSalutation = fullName;

            console.log('🔥 [OFFER LETTER] Word template data:', offerData);
            console.log('📅 [OFFER LETTER] Issue Date:', issuedDateStr);
            console.log('👤 [OFFER LETTER] Salutation:', finalSalutation);
            console.log('👤 [OFFER LETTER] Candidate Name (with salutation):', candidateNameWithSalutation);
            console.log('📋 [OFFER LETTER] All Date Placeholders:', {
                issued_date: issuedDateStr,
                Date_odt: issuedDateStr,
                Date: issuedDateStr
            });

            // Render the document
            doc.render(offerData);

            // Generate DOCX output
            const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
            const fileName = `Offer_Letter_${applicantId}_${Date.now()}`;
            const outputDir = path.join(__dirname, '../uploads/offers');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            const docxPath = path.join(outputDir, `${fileName}.docx`);
            await fsPromises.writeFile(docxPath, buf);

            // --- SYNCHRONOUS PDF CONVERSION ---
            try {
                console.log('🔄 [OFFER LETTER] Starting Synchronous PDF Conversion...');
                const libreOfficeService = require('../services/LibreOfficeService');

                const pdfAbsolutePath = libreOfficeService.convertToPdfSync(docxPath, outputDir);
                pdfFileName = path.basename(pdfAbsolutePath);

                relativePath = `offers/${pdfFileName}`;
                downloadUrl = `/uploads/${relativePath}`;

                console.log('✅ [OFFER LETTER] PDF Conversion Successful:', downloadUrl);

            } catch (pdfError) {
                console.error('⚠️ [OFFER LETTER] PDF Conversion Failed:', pdfError.message);
                return res.status(500).json({
                    message: "PDF Generation Failed. Please ensure LibreOffice is installed.",
                    error: pdfError.message
                });
            }

        } else {
            // Handle HTML template processing (Now using LibreOffice)
            console.log('🔥 [OFFER LETTER] Processing HTML template (Sync using LibreOffice)');

            const safeString = (val) => (val !== undefined && val !== null ? String(val) : '');
            const finalFatherName = safeString(fatherName || applicant.fatherName);

            // Get issued date - From Modal or TODAY
            const validIssueDate = issueDate ? new Date(issueDate) : new Date();
            const issuedDate = formatCustomDate(validIssueDate, dateFormat);
            const issuedDateStr = issuedDate;

            const fullName = `${salutation ? salutation + ' ' : ''}${safeString(name || applicant.name)} `;

            const replacements = {
                '{{employee_name}}': fullName,
                '{{candidate_name}}': fullName,
                '{{father_name}}': finalFatherName,
                '{{father_names}}': finalFatherName,
                '{{designation}}': safeString(applicant.requirementId?.jobTitle || applicant.currentDesignation),
                '{{joining_date}}': safeString(joiningDate ? formatCustomDate(joiningDate, dateFormat) : (applicant.joiningDate ? formatCustomDate(applicant.joiningDate, dateFormat) : '')),
                '{{location}}': safeString(location || applicant.location || applicant.workLocation),
                '{{address}}': safeString(address || applicant.address),
                '{{offer_ref_no}}': safeString(refNo),
                '{{issued_date}}': issuedDateStr,
                '{{issuedDate}}': issuedDateStr,
                '{{ISSUED_DATE}}': issuedDateStr,
                '{{current_date}}': issuedDateStr,
                '{{Date}}': issuedDateStr,
                '{{DATE}}': issuedDateStr,
                '{{Date_odt}}': issuedDateStr,
                '{{date_odt}}': issuedDateStr,
                '{{DATE_ODT}}': issuedDateStr
            };

            let htmlContent = template.bodyContent || '';
            Object.keys(replacements).forEach(key => {
                const regex = new RegExp(key, 'g');
                htmlContent = htmlContent.replace(regex, replacements[key]);
            });

            if (!htmlContent.includes('<html')) {
                htmlContent = `
    < !DOCTYPE html >
        <html>
            <head>
                <meta charset="UTF-8">
                    <style>
                        body {font - family: 'Arial', sans-serif; line-height: 1.6; padding: 40px; }
                        .header {text - align: center; margin-bottom: 30px; }
                        .content {margin - bottom: 30px; }
                    </style>
            </head>
            <body>
                ${htmlContent}
            </body>
        </html>`;
            }

            const fileName = `Offer_Letter_${applicantId}_${Date.now()}`;
            const outputDir = path.join(__dirname, '../uploads/offers');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            const htmlPath = path.join(outputDir, `${fileName}.html`);
            await fsPromises.writeFile(htmlPath, htmlContent);

            try {
                const libreOfficeService = require('../services/LibreOfficeService');
                const pdfAbsolutePath = libreOfficeService.convertToPdfSync(htmlPath, outputDir);
                pdfFileName = path.basename(pdfAbsolutePath);
                relativePath = `offers/${pdfFileName}`;
                downloadUrl = `/uploads/${relativePath}`;
                console.log('✅ [OFFER LETTER] HTML-to-PDF Conversion Successful:', downloadUrl);
            } catch (pdfError) {
                console.error('⚠️ [OFFER LETTER] HTML-to-PDF Conversion Failed:', pdfError.message);
                return res.status(500).json({ message: "PDF Generation Failed", error: pdfError.message });
            }
        }

        if (!preview) {
            // Save generated letter record
            const generated = new GeneratedLetter({
                tenantId: req.user?.tenantId || req.tenantId,
                applicantId: applicantId,
                templateId,
                templateType, // 'WORD' or 'BLANK'/'LETTER_PAD'
                letterType: 'offer',
                pdfPath: relativePath,
                pdfUrl: downloadUrl,
                status: 'generated',
                generatedBy: req.user?.id || req.user?.userId
            });
            await generated.save();

            // Prepare update data for applicant (Save the inputs)
            // Store just the filename, not the full path to avoid duplicate /offers/ in URL
            const storedFileName = pdfFileName || (relativePath ? path.basename(relativePath) : '');
            const updateData = {
                offerLetterPath: storedFileName,
                offerRefCode: refNo,
                status: 'Offer Issued'
            };

            if (joiningDate) updateData.joiningDate = new Date(joiningDate);
            if (address) updateData.address = address;
            if (department) updateData.department = department;
            if (location) updateData.location = location;
            if (fatherName) updateData.fatherName = fatherName; // Persist Father Name
            if (salutation) updateData.salutation = salutation; // Persist Salutation

            const { Applicant: ApplicantModel } = getModels(req);
            const updatedApplicant = await ApplicantModel.findById(applicantId);

            // Apply updates
            Object.keys(updateData).forEach(key => {
                updatedApplicant[key] = updateData[key];
            });

            if (!updatedApplicant.timeline) updatedApplicant.timeline = [];
            updatedApplicant.timeline.push({
                status: 'Offer Issued',
                message: `🎉 Offer Letter Generated(${refNo}).Joining date: ${joiningDate ? new Date(joiningDate).toLocaleDateString('en-IN') : 'TBD'}.`,
                updatedBy: req.user?.name || "HR",
                timestamp: new Date()
            });

            await updatedApplicant.save();

            // --- INCREMENT OFFER COUNTER ---
            try {
                const companyIdConfig = require('./companyIdConfig.controller');
                const deptName = updatedApplicant.requirementId?.department?.name || 'GEN';
                const deptCode = deptName.substring(0, 3).toUpperCase();

                await companyIdConfig.generateIdInternal({
                    tenantId: req.user?.tenantId || req.tenantId,
                    entityType: 'OFFER',
                    increment: true,
                    extraReplacements: {
                        '{{DEPT}}': deptCode
                    }
                });
                console.log('✅ [OFFER LETTER] Incrementing sequence for OFFER');
            } catch (idErr) {
                console.warn("⚠️ [OFFER LETTER] Could not increment sequence:", idErr.message);
            }

            // -----------------------------------------------------
            // NOTIFICATIONS & EMAILS (Added via Request)
            // -----------------------------------------------------
            try {
                // 1. Update Status to 'Offer Issued'
                updatedApplicant.status = 'Offer Issued';
                await updatedApplicant.save();

                // Fetch Company Profile & Notification Model
                const { CompanyProfile, Notification } = getModels(req);
                const companyProfile = await CompanyProfile.findOne({ tenantId: req.user.tenantId });
                const companyName = companyProfile?.companyName || 'Gitakshmi Technologies';

                // Construct absolute path for attachment
                const attachmentPath = path.join(__dirname, '../uploads', relativePath);
                const jobTitle = updatedApplicant.requirementId?.jobTitle || 'Role';

                // 2. Send Email
                if (updatedApplicant.email) {
                    await emailService.sendOfferLetterEmail(
                        updatedApplicant.email,
                        updatedApplicant.name,
                        jobTitle,
                        companyName,
                        attachmentPath
                    );
                    console.log(`✅[OFFER LETTER] Email sent to ${updatedApplicant.email} `);
                }

                // 3. Create Notification for Candidate Portal
                if (updatedApplicant.candidateId && Notification) {
                    const tenantId = req.tenantId || req.user.tenantId;
                    await Notification.create({
                        tenant: tenantId,
                        receiverId: updatedApplicant.candidateId,
                        receiverRole: 'candidate',
                        entityType: 'OfferLetter',
                        entityId: generated._id,
                        title: 'Offer Letter Issued',
                        message: `Congratulations! Your offer letter for ${jobTitle} has been issued.Please check your email or download it from here.`,
                        isRead: false
                    });
                    console.log(`✅[OFFER LETTER] Notification created for candidate ${updatedApplicant.candidateId}`);
                }

            } catch (notifyErr) {
                console.error("⚠️ [OFFER LETTER] Failed to send notifications:", notifyErr.message);
                // Non-blocking error
            }
        }

        res.json({
            success: true,
            downloadUrl: downloadUrl,
            pdfPath: relativePath,
            templateType: template.templateType,
            message: "Offer Letter Generated Successfully"
        });

    } catch (error) {
        console.error("🔥 [OFFER LETTER] FATAL ERROR:", error);
        if (error.stack) console.error(error.stack);
        res.status(500).json({
            success: false,
            message: "Internal Server Error during offer letter generation",
            error: error.message
        });
    }
};

exports.downloadLetterPDF = async (req, res) => {
    try {
        const { imageData } = req.body;
        const result = await letterPDFGenerator.generatePDF(imageData);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        // Get tenant-specific model
        const { GeneratedLetter } = getModels(req);

        const history = await GeneratedLetter.find({ tenantId: req.user.tenantId })
            .sort('-createdAt')
            .populate('applicantId', 'name');
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * PREVIEW JOINING LETTER WITH APPLICANT DATA (Word -> PDF)
 * - Load Word Template
 * - Replace placeholders with real applicant data
 * - Convert to PDF (temporary)
 * - Return preview URL
 */
exports.previewJoiningLetter = async (req, res) => {
    try {
        const { applicantId, employeeId, templateId, refNo, issueDate } = req.body;
        const Applicant = getApplicantModel(req);
        const { Employee, LetterTemplate } = getModels(req);

        console.log('🔥 [PREVIEW JOINING LETTER] Request received:', { applicantId, employeeId, templateId });
        console.log('🔥 [PREVIEW JOINING LETTER] User context:', req.user ? { userId: req.user.userId, tenantId: req.user.tenantId } : 'null');

        // Validate input
        if (!templateId || (!applicantId && !employeeId)) {
            console.error('🔥 [PREVIEW JOINING LETTER] Missing required parameters');
            return res.status(400).json({ message: "templateId and (applicantId or employeeId) are required" });
        }

        // Fetch target (Applicant or Employee)
        let target;
        let targetType;
        if (employeeId) {
            target = await Employee.findById(employeeId);
            targetType = 'employee';
        } else {
            target = await Applicant.findById(applicantId).populate('requirementId');
            targetType = 'applicant';
        }

        if (!target) {
            console.error(`🔥[PREVIEW JOINING LETTER] ${targetType === 'employee' ? 'Employee' : 'Applicant'} not found: `, employeeId || applicantId);
            return res.status(404).json({ message: `${targetType === 'employee' ? 'Employee' : 'Applicant'} not found` });
        }

        // 1. MUST BE LOCKED
        if (!target.salaryLocked) {
            console.error('🔥 [PREVIEW JOINING LETTER] BLOCKED: Salary not locked for', targetType, target._id);
            return res.status(400).json({ message: "Salary must be confirmed and locked before generating joining letter." });
        }

        // Build query - handle missing req.user gracefully
        const templateQuery = { _id: templateId };
        if (req.user?.tenantId) {
            templateQuery.tenantId = req.user.tenantId;
        }

        const template = await LetterTemplate.findOne(templateQuery);

        if (!template) {
            console.error('🔥 [PREVIEW JOINING LETTER] Template not found:', templateId);
            return res.status(404).json({ message: "Template not found" });
        }

        // Validate template type
        if (template.type !== 'joining' || template.templateType !== 'WORD') {
            console.error('🔥 [PREVIEW JOINING LETTER] Invalid template type or templateType:', template.type, template.templateType);
            return res.status(400).json({ message: "Invalid template. Only WORD-based Joining Letter templates are supported." });
        }

        // 1. Validate and normalize file path
        if (!template.filePath) {
            console.error('🔥 [PREVIEW JOINING LETTER] Template filePath is missing in database');
            return res.status(400).json({
                message: "Template file path is missing. Please re-upload the template.",
                code: "FILE_PATH_MISSING"
            });
        }

        // Normalize file path (handle both absolute and relative paths)
        const normalizedFilePath = normalizeFilePath(template.filePath);
        console.log('🔥 [PREVIEW JOINING LETTER] Original filePath:', template.filePath);
        console.log('🔥 [PREVIEW JOINING LETTER] Normalized filePath:', normalizedFilePath);

        // Check if file exists
        if (!fs.existsSync(normalizedFilePath)) {
            console.error('❌ [PREVIEW JOINING LETTER] Template file NOT FOUND at path:', normalizedFilePath);
            console.error('❌ [PREVIEW JOINING LETTER] Original path from DB:', template.filePath);
            console.error('❌ [PREVIEW JOINING LETTER] Template ID:', template._id);
            console.error('❌ [PREVIEW JOINING LETTER] Template name:', template.name);

            // Return 404 with clear message and actionable error code
            return res.status(404).json({
                message: `Template file not found on server at path: ${normalizedFilePath}. Please re - upload the template.`,
                code: "FILE_NOT_FOUND",
                templateId: template._id.toString(),
                filePath: normalizedFilePath
            });
        }

        console.log('✅ [PREVIEW JOINING LETTER] Template file found, reading...');
        const content = await fsPromises.readFile(normalizedFilePath);

        // 2. Initialize Docxtemplater SAFE MODE
        let doc;
        try {
            const zip = new PizZip(content);
            doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: function (tag) { return ''; }, // Return empty string for ANY missing tag
                delimiters: { start: '{{', end: '}}' }
            });
        } catch (error) {
            console.error('🔥 [PREVIEW JOINING LETTER] Docxtemplater Init Failed:', error);
            return res.status(400).json({ message: "Template load failed", error: error.message });
        }

        // 3. Prepare Data - FETCH FROM EmployeeSalarySnapshot (Single Source of Truth)
        const EmployeeSalarySnapshot = req.tenantDB.model('EmployeeSalarySnapshot');

        // ALWAYS fetch from database - embedded snapshots may be incomplete
        console.log('?? [JOINING LETTER] Fetching snapshot from database...');
        const query = employeeId ? { employee: employeeId } : { applicant: applicantId };
        let snapshot = await EmployeeSalarySnapshot.findOne(query).sort({ createdAt: -1 }).lean();

        if (snapshot) {
            console.log('? [JOINING LETTER] Found DB Snapshot:', {
                id: snapshot._id,
                locked: snapshot.locked,
                earningsCount: (snapshot.earnings || []).length,
                deductionsCount: (snapshot.employeeDeductions || []).length,
                benefitsCount: (snapshot.benefits || []).length,
                ctc: snapshot.ctc
            });
        }

        // Robust Fallback: Check target's specific snapshot references
        if (!snapshot && target) {
            console.log(`[PREVIEW JOINING LETTER] Snapshot not found by query, trying target references for ${targetType}`);
            const snapId = target.currentSalarySnapshotId || target.salarySnapshotId;
            if (snapId) {
                snapshot = await EmployeeSalarySnapshot.findById(snapId).lean();
            }
            // If still not found and is employee, check their snapshots array
            if (!snapshot && targetType === 'employee' && target.salarySnapshots?.length > 0) {
                const lastSnapId = target.salarySnapshots[target.salarySnapshots.length - 1];
                snapshot = await EmployeeSalarySnapshot.findById(lastSnapId).lean();
            }
        }

        if (!snapshot) {
            console.error(`[PREVIEW JOINING LETTER] EmployeeSalarySnapshot not found for ${targetType}: ${employeeId || applicantId}. Checked query and target refs.`);
            return res.status(400).json({ message: "Salary snapshot not found. Please complete Salary Assignment first." });
        }

        // Helper to format currency
        const cur = (val) => Math.round(val || 0).toLocaleString('en-IN');

        const earnings = (snapshot.earnings || []).map(e => ({
            ...e,
            monthly: e.monthlyAmount || e.monthly || 0,
            yearly: e.yearlyAmount || e.yearly || e.annualAmount || (e.monthlyAmount * 12) || 0
        }));

        const employeeDeductions = (snapshot.employeeDeductions || snapshot.deductions || []).map(d => ({
            ...d,
            monthly: d.monthlyAmount || d.monthly || 0,
            yearly: d.yearlyAmount || d.yearly || d.annualAmount || (d.monthlyAmount * 12) || 0
        }));

        const benefits = (snapshot.benefits || []).map(b => ({
            ...b,
            monthly: b.monthlyAmount || b.monthly || 0,
            yearly: b.yearlyAmount || b.yearly || b.annualAmount || (b.monthlyAmount * 12) || 0
        }));

        // Use pre-calculated totals from snapshot if available for consistency
        const grossAAnnual = snapshot.summary?.grossEarnings || snapshot.breakdown?.totalEarnings || earnings.reduce((sum, e) => sum + e.yearly, 0);
        const totalBenefitsAnnual = snapshot.summary?.totalBenefits || snapshot.breakdown?.totalBenefits || benefits.reduce((sum, b) => sum + b.yearly, 0);
        const totalDeductionsAnnual = snapshot.summary?.totalDeductions || snapshot.breakdown?.totalDeductions || employeeDeductions.reduce((sum, d) => sum + d.yearly, 0);
        const totalCTCAnnual = snapshot.ctc || snapshot.annualCTC || (grossAAnnual + totalBenefitsAnnual);
        const netAnnual = snapshot.summary?.netPay || snapshot.breakdown?.netPay || (grossAAnnual - totalDeductionsAnnual);


        // SMART CATEGORIZATION (v10.0)
        // 1. Compensatory Allowance should be in Gross A (Earnings)
        const compensatoryFromBenefits = benefits.filter(b => /compensatory/i.test(b.name || ''));
        const otherBenefits = benefits.filter(b => !/compensatory/i.test(b.name || ''));

        // Add to earnings for representation
        const enhancedEarnings = [...earnings];
        compensatoryFromBenefits.forEach(b => {
            if (!enhancedEarnings.find(e => e.name === b.name)) {
                enhancedEarnings.push(b);
            }
        });

        // 2. Separate Annual (B), Retirals (C), and Insurance (D)
        const grossBListRaw = otherBenefits.filter(b => /bonus|lta|leave|variable|annual|performance/i.test(b.name || ''));
        const grossCListRaw = otherBenefits.filter(b => /gratuity|pf|provident|retirals/i.test(b.name || '') && !/bonus|lta|leave|variable|annual|performance/i.test(b.name || ''));
        const insuranceListRaw = otherBenefits.filter(b => /insurance|mediclaim/i.test(b.name || ''));

        // Anything else goes to Gross C as fallback if not caught
        const caughtNames = [...grossBListRaw, ...grossCListRaw, ...insuranceListRaw].map(b => b.name);
        const remainingBenefits = otherBenefits.filter(b => !caughtNames.includes(b.name));
        const finalGrossCListRaw = [...grossCListRaw, ...remainingBenefits];

        const grossAAnnualTotal = enhancedEarnings.reduce((sum, e) => sum + (e.yearly || 0), 0);
        const grossBAnnualTotal = grossBListRaw.reduce((sum, b) => sum + (b.yearly || 0), 0);
        const grossCAnnualTotal = finalGrossCListRaw.reduce((sum, b) => sum + (b.yearly || 0), 0);
        const insuranceAnnualTotal = insuranceListRaw.reduce((sum, b) => sum + (b.yearly || 0), 0);

        const totals = {
            grossA: {
                monthly: Math.round(grossAAnnualTotal / 12),
                yearly: Math.round(grossAAnnualTotal),
                formattedM: safeCur(grossAAnnualTotal / 12),
                formattedY: safeCur(grossAAnnualTotal)
            },
            grossB: {
                monthly: Math.round(grossBAnnualTotal / 12),
                yearly: Math.round(grossBAnnualTotal),
                formattedM: safeCur(grossBAnnualTotal / 12),
                formattedY: safeCur(grossBAnnualTotal)
            },
            grossC: {
                monthly: Math.round(grossCAnnualTotal / 12),
                yearly: Math.round(grossCAnnualTotal),
                formattedM: safeCur(grossCAnnualTotal / 12),
                formattedY: safeCur(grossCAnnualTotal)
            },
            grossD: {
                monthly: Math.round(insuranceAnnualTotal / 12),
                yearly: Math.round(insuranceAnnualTotal),
                formattedM: safeCur(insuranceAnnualTotal / 12),
                formattedY: safeCur(insuranceAnnualTotal)
            },
            deductions: {
                monthly: Math.round(totalDeductionsAnnual / 12),
                yearly: Math.round(totalDeductionsAnnual),
                formattedM: safeCur(totalDeductionsAnnual / 12),
                formattedY: safeCur(totalDeductionsAnnual)
            },
            net: {
                monthly: Math.round(netAnnual / 12),
                yearly: Math.round(netAnnual),
                formattedM: safeCur(netAnnual / 12),
                formattedY: safeCur(netAnnual)
            },
            computedCTC: {
                monthly: Math.round(totalCTCAnnual / 12),
                yearly: Math.round(totalCTCAnnual),
                formattedM: safeCur(totalCTCAnnual / 12),
                formattedY: safeCur(totalCTCAnnual)
            }
        };

        const flatData = {};
        earnings.forEach(e => { flatData[e.code] = safeCur(e.monthlyAmount); flatData[`${e.code} _ANNUAL`] = safeCur(e.annualAmount); });
        employeeDeductions.forEach(d => { flatData[d.code] = safeCur(d.monthlyAmount); flatData[`${d.code} _ANNUAL`] = safeCur(d.annualAmount); });
        benefits.forEach(b => { flatData[b.code] = safeCur(b.monthlyAmount); flatData[`${b.code} _ANNUAL`] = safeCur(b.annualAmount); });

        // ... (rest of logic same) ...

        const salaryStructure = {
            earnings: enhancedEarnings.map(e => ({ name: e.name || '', monthly: safeCur(e.monthly), yearly: safeCur(e.yearly) })),
            deductions: employeeDeductions.map(d => ({ name: d.name || '', monthly: safeCur(d.monthly), yearly: safeCur(d.yearly) })),
            benefits: otherBenefits.map(b => ({ name: b.name || '', monthly: safeCur(b.monthly), yearly: safeCur(b.yearly) })),
            totals: totals
        };

        // RECONSTRUCTED: enhancedSalaryComponents for table rendering (v10.1)
        const salaryComponents = [];

        // A - Monthly Benefits (Gross A)
        salaryComponents.push({ name: 'A – Monthly Benefits', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        enhancedEarnings.forEach(e => {
            const m = safeCur(e.monthly);
            const y = safeCur(e.yearly);
            salaryComponents.push({ name: e.name, monthly: m, yearly: y, annual: y, MONTHLY: m, YEARLY: y, ANNUAL: y });
        });
        salaryComponents.push({
            name: 'GROSS A',
            monthly: totals.grossA.formattedM, yearly: totals.grossA.formattedY, annual: totals.grossA.formattedY,
            MONTHLY: totals.grossA.formattedM, YEARLY: totals.grossA.formattedY, ANNUAL: totals.grossA.formattedY
        });

        // Deduction Section
        salaryComponents.push({ name: '', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        employeeDeductions.forEach(d => {
            const m = safeCur(d.monthly);
            const y = safeCur(d.yearly);
            salaryComponents.push({ name: d.name, monthly: m, yearly: y, annual: y, MONTHLY: m, YEARLY: y, ANNUAL: y });
        });
        salaryComponents.push({
            name: 'Total Deductions (B)',
            monthly: totals.deductions.formattedM, yearly: totals.deductions.formattedY, annual: totals.deductions.formattedY,
            MONTHLY: totals.deductions.formattedM, YEARLY: totals.deductions.formattedY, ANNUAL: totals.deductions.formattedY
        });
        salaryComponents.push({
            name: 'Take Home Package',
            monthly: totals.net.formattedM, yearly: totals.net.formattedY, annual: totals.net.formattedY,
            MONTHLY: totals.net.formattedM, YEARLY: totals.net.formattedY, ANNUAL: totals.net.formattedY
        });

        // B - Annual Benefits
        salaryComponents.push({ name: '', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        salaryComponents.push({ name: 'B – Annual Benefits', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        grossBListRaw.forEach(b => {
            const m = safeCur(b.monthly);
            const y = safeCur(b.yearly);
            salaryComponents.push({ name: b.name, monthly: m, yearly: y, annual: y, MONTHLY: m, YEARLY: y, ANNUAL: y });
        });
        salaryComponents.push({
            name: 'GROSS B',
            monthly: totals.grossB.formattedM, yearly: totals.grossB.formattedY, annual: totals.grossB.formattedY,
            MONTHLY: totals.grossB.formattedM, YEARLY: totals.grossB.formattedY, ANNUAL: totals.grossB.formattedY
        });

        // C - Retirals
        salaryComponents.push({ name: '', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        salaryComponents.push({ name: 'C – Retirals Company\'s Benefits', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        finalGrossCListRaw.forEach(b => {
            const m = safeCur(b.monthly);
            const y = safeCur(b.yearly);
            salaryComponents.push({ name: b.name, monthly: m, yearly: y, annual: y, MONTHLY: m, YEARLY: y, ANNUAL: y });
        });
        salaryComponents.push({
            name: 'GROSS C',
            monthly: totals.grossC.formattedM, yearly: totals.grossC.formattedY, annual: totals.grossC.formattedY,
            MONTHLY: totals.grossC.formattedM, YEARLY: totals.grossC.formattedY, ANNUAL: totals.grossC.formattedY
        });

        // D - Other Benefits
        salaryComponents.push({ name: '', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        salaryComponents.push({ name: 'D – Other Benefits', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        insuranceListRaw.forEach(b => {
            const m = safeCur(b.monthly);
            const y = safeCur(b.yearly);
            salaryComponents.push({ name: b.name, monthly: m, yearly: y, annual: y, MONTHLY: m, YEARLY: y, ANNUAL: y });
        });
        salaryComponents.push({
            name: 'GROSS D',
            monthly: totals.grossD.formattedM, yearly: totals.grossD.formattedY, annual: totals.grossD.formattedY,
            MONTHLY: totals.grossD.formattedM, YEARLY: totals.grossD.formattedY, ANNUAL: totals.grossD.formattedY
        });

        // Final CTC
        salaryComponents.push({ name: '', monthly: '', yearly: '', annual: '', MONTHLY: '', YEARLY: '', ANNUAL: '' });
        salaryComponents.push({
            name: 'Computed CTC (A+B+C+D)',
            monthly: totals.computedCTC.formattedM, yearly: totals.computedCTC.formattedY, annual: totals.computedCTC.formattedY,
            MONTHLY: totals.computedCTC.formattedM, YEARLY: totals.computedCTC.formattedY, ANNUAL: totals.computedCTC.formattedY
        });

        const enhancedSalaryComponents = salaryComponents.map(comp => ({
            ...comp,
            monthlyRaw: comp.monthly === '' ? 0 : (typeof comp.monthly === 'string' ? parseFloat(comp.monthly.replace(/,/g, '')) || 0 : comp.monthly),
            yearlyRaw: comp.yearly === '' ? 0 : (typeof comp.yearly === 'string' ? parseFloat(comp.yearly.replace(/,/g, '')) || 0 : comp.yearly)
        }));

        const basicData = {
            candidate_name: target.name || '',
            candidateName: target.name || '',
            employee_name: target.name || '',
            father_name: target.fatherName || '',
            fatherName: target.fatherName || '',
            email: target.email || '',
            mobile: target.mobile || '',
            address: target.address || '',
            designation: target.requirementId?.jobTitle || target.designation || '',
            position: target.requirementId?.jobTitle || target.designation || '',
            department: target.requirementId?.department || target.department || '',
            joining_date: safeDate(target.joiningDate),
            joiningDate: safeDate(target.joiningDate),
            location: target.location || target.workLocation || '',
            work_location: target.location || target.workLocation || '',
            current_date: issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
            issued_date: issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
            issue_date: issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
            issuedDate: issueDate ? new Date(issueDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
            ref_no: refNo || `JL / ${new Date().getFullYear()}/${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            refNo: refNo,
            ref_code: refNo,
            reference_number: refNo
        };

        // DYNAMIC FLATTENING for Static Templates (v10.1)
        const flatComponentMap = {};
        const populateFlatMap = (items) => {
            items.forEach(item => {
                if (item.name) {
                    const keyBase = item.name.toUpperCase().trim().replace(/[^A-Z0-9]+/g, '_');
                    flatComponentMap[`${keyBase}_MONTHLY`] = safeCur(item.monthly);
                    flatComponentMap[`${keyBase}_YEARLY`] = safeCur(item.yearly);
                }
                if (item.code) {
                    flatComponentMap[`${item.code}_MONTHLY`] = safeCur(item.monthly);
                    flatComponentMap[`${item.code}_YEARLY`] = safeCur(item.yearly);
                }
            });
        };

        populateFlatMap(enhancedEarnings);
        populateFlatMap(employeeDeductions);
        populateFlatMap(otherBenefits);

        // Fix BASIC specifically
        const basicComp = enhancedEarnings.find(e => e.name.toUpperCase().trim() === 'BASIC' || e.code === 'BASIC' || e.name.toUpperCase().trim().includes('BASIC SALARY'));
        if (basicComp) {
            flatComponentMap['BASIC_MONTHLY'] = safeCur(basicComp.monthly);
            flatComponentMap['BASIC_YEARLY'] = safeCur(basicComp.yearly);
        }

        const initialData = {
            ...basicData,
            ...flatComponentMap, // Inject dynamic keys
            salaryComponents: enhancedSalaryComponents,
            salaryStructure: salaryStructure,
            earnings: salaryStructure.earnings,
            deductions: salaryStructure.deductions,
            benefits: salaryStructure.benefits,
            totals: salaryStructure.totals,
            ...(req.calculatedSalaryData || {}),
            ...(req.flatSalaryData || {}),

            // Hardcoded totals matching all possible DOCX tags
            GROSS_A_MONTHLY: totals.grossA.formattedM,
            GROSS_A_YEARLY: totals.grossA.formattedY,
            GROSS_B_MONTHLY: totals.grossB.formattedM,
            GROSS_B_YEARLY: totals.grossB.formattedY,
            GROSS_C_MONTHLY: totals.grossC.formattedM,
            GROSS_C_YEARLY: totals.grossC.formattedY,
            GROSS_D_MONTHLY: totals.grossD.formattedM,
            GROSS_D_YEARLY: totals.grossD.formattedY,
            NET_SALARY_MONTHLY: totals.net.formattedM,
            NET_SALARY_YEARLY: totals.net.formattedY,
            CTC_MONTHLY: totals.computedCTC.formattedM,
            CTC_YEARLY: totals.computedCTC.formattedY,
            TAKE_HOME_MONTHLY: totals.net.formattedM,
            TAKE_HOME_YEARLY: totals.net.formattedY,

            salary_table_text_block: enhancedSalaryComponents.map(r => `${r.name}\t${r.monthly}\t${r.yearly}`).join('\n'),
            SALARY_TABLE: enhancedSalaryComponents.map(r => `${r.name}\t${r.monthly}\t${r.yearly}`).join('\n')
        };

        console.log('✅ [JOINING LETTER] Final Data Prepared. Sample flat keys:', Object.keys(flatComponentMap).slice(0, 5));

        console.log('✅ [JOINING LETTER] Final Data Prepared Successfully');

        // ========== UNIVERSAL STABLE PATCH ENGINE (STABLE FOREVER) ==========
        const finalData = applyUniversalSalaryPatches(initialData, snapshot, totals);

        // Final structural safety guard
        Object.keys(finalData).forEach(k => {
            if (finalData[k] === undefined || finalData[k] === null) {
                finalData[k] = "0";
            }
            if (typeof finalData[k] === 'object' && finalData[k] !== null) {
                finalData[k] = "";
            }
        });
        // ========== END SAFE PATCHES ==========

        // ========== END SAFE PATCHES ==========

        // 4. Render
        console.log('🔥 [PREVIEW JOINING LETTER] Rendering with data...');
        try {
            doc.render(finalData);
        } catch (renderError) {
            // Log the error but return 500 as per requirement
            console.error('🔥 [PREVIEW JOINING LETTER] RENDER CRASH:', renderError);
            return res.status(500).json({ message: "Joining letter preview generation failed", error: renderError.message });
        }

        // 5. Generate Output (DOCX) - Temporary
        const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
        const fileName = `Preview_Joining_Letter_${employeeId || applicantId || 'preview'}_${Date.now()}`;
        const outputDir = path.join(__dirname, '../uploads/previews');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const docxPath = path.join(outputDir, `${fileName}.docx`);
        await fsPromises.writeFile(docxPath, buf);

        // 6. Convert to PDF Synchronously using LibreOffice
        let finalRelativePath;
        let finalPdfUrl;

        try {
            console.log('🔄 [PREVIEW JOINING LETTER] Starting Synchronous PDF Conversion (LibreOffice)...');
            const libreOfficeService = require('../services/LibreOfficeService');

            // Synchronous Call - blocks until done
            const pdfAbsolutePath = libreOfficeService.convertToPdfSync(docxPath, outputDir);
            const pdfFileName = path.basename(pdfAbsolutePath);

            finalRelativePath = `previews/${pdfFileName}`;
            finalPdfUrl = `${process.env.BACKEND_URL}/uploads/${finalRelativePath}`;

            console.log('✅ [PREVIEW JOINING LETTER] PDF Preview Ready:', finalPdfUrl);

        } catch (pdfError) {
            console.error('⚠️ [PREVIEW JOINING LETTER] PDF Conversion Failed:', pdfError.message);
            return res.status(500).json({
                message: `PDF Preview Generation Failed: ${pdfError.message}. Please ensure LibreOffice is installed correctly.`,
                error: pdfError.message
            });
        }

        // RETURN PREVIEW PDF URL (Temporary - will be cleaned up later)
        res.json({
            success: true,
            previewUrl: finalPdfUrl, // Frontend looks for this
            pdfUrl: finalPdfUrl,      // Standard naming
            message: 'Preview generated successfully. This is temporary and will be cleaned up.'
        });

    } catch (error) {
        console.error('🔥 [PREVIEW JOINING LETTER] FATAL 500 ERROR:', error);
        res.status(500).json({
            message: `Preview Failed: ${error.message}`,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * VIEW EXISTING JOINING LETTER PDF
 */
exports.viewJoiningLetter = async (req, res) => {
    try {
        const { applicantId } = req.params;
        const Applicant = getApplicantModel(req);

        const applicant = await Applicant.findById(applicantId);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found" });
        }

        if (!applicant.joiningLetterPath) {
            return res.status(404).json({ message: "Joining letter not generated yet" });
        }

        const pdfPath = path.join(__dirname, '../uploads', applicant.joiningLetterPath);
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ message: "Joining letter file not found" });
        }

        // Return the download URL
        const downloadUrl = `/uploads/${applicant.joiningLetterPath}`;
        res.json({ downloadUrl });

    } catch (error) {
        console.error('View joining letter error:', error);
        res.status(500).json({ message: "Internal Error", error: error.message });
    }
};

/**
 * DOWNLOAD EXISTING JOINING LETTER PDF
 */
exports.downloadJoiningLetter = async (req, res) => {
    try {
        const { applicantId } = req.params;
        const Applicant = getApplicantModel(req);

        const applicant = await Applicant.findById(applicantId);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found" });
        }

        if (!applicant.joiningLetterPath) {
            return res.status(404).json({ message: "Joining letter not generated yet" });
        }

        const pdfPath = path.join(__dirname, '../uploads', applicant.joiningLetterPath);
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ message: "Joining letter file not found" });
        }

        // Set headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Joining_Letter_${applicant.name || applicantId}.pdf"`);

        // Stream the file
        const fileStream = fs.createReadStream(pdfPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Download joining letter error:', error);
        res.status(500).json({ message: "Internal Error", error: error.message });
    }
};

// --- HELPER: Centralized Salary Processing Logic ---
/**
 * Process candidate salary structure for joining letter
 * Returns FULL breakup with earnings, deductions, and benefits
 * All components include showInJoiningLetter flag
 * Zero values for auto-calculated components show "As per Rule"
 */
/**
 * Process candidate salary structure for joining letter
 * Read ONLY from selected lists in structure
 */
function processCandidateSalary(structure) {
    const formatCurrency = (val) => {
        if (val === undefined || val === null) return '-';
        const num = Number(val);
        if (isNaN(num)) return '-';
        return Math.round(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    };

    const earnings = Array.isArray(structure.earnings) ? structure.earnings : [];
    const deductions = Array.isArray(structure.deductions) ? structure.deductions : [];
    const benefits = Array.isArray(structure.employerBenefits) ? structure.employerBenefits : [];

    const flatData = {};
    const normalizeKey = (val) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '_');

    const processedEarnings = earnings.map(comp => {
        const k = normalizeKey(comp.label);
        flatData[`${k}_monthly`] = formatCurrency(comp.monthly);
        flatData[`${k}_yearly`] = formatCurrency(comp.yearly);
        return {
            name: comp.label,
            monthly: formatCurrency(comp.monthly),
            yearly: formatCurrency(comp.yearly),
            amount: comp.monthly
        };
    });

    const processedDeductions = deductions.map(comp => {
        const k = normalizeKey(comp.label);
        flatData[`${k}_monthly`] = formatCurrency(comp.monthly);
        flatData[`${k}_yearly`] = formatCurrency(comp.yearly);
        return {
            name: comp.label,
            monthly: formatCurrency(comp.monthly),
            yearly: formatCurrency(comp.yearly),
            amount: comp.monthly
        };
    });

    const processedBenefits = benefits.map(comp => {
        const k = normalizeKey(comp.label);
        flatData[`${k}_monthly`] = formatCurrency(comp.monthly);
        flatData[`${k}_yearly`] = formatCurrency(comp.yearly);
        return {
            name: comp.label,
            monthly: formatCurrency(comp.monthly),
            yearly: formatCurrency(comp.yearly),
            amount: comp.monthly
        };
    });

    const totals = structure.totals || {};

    flatData['gross_a_monthly'] = formatCurrency(totals.grossEarnings);
    flatData['gross_a_yearly'] = formatCurrency(totals.grossEarnings * 12);
    flatData['total_deductions_monthly'] = formatCurrency(totals.totalDeductions);
    flatData['total_deductions_yearly'] = formatCurrency(totals.totalDeductions * 12);
    flatData['net_salary_monthly'] = formatCurrency(totals.netSalary);
    flatData['net_salary_yearly'] = formatCurrency(totals.netSalary * 12);
    flatData['ctc_monthly'] = formatCurrency(totals.monthlyCTC);
    flatData['ctc_yearly'] = formatCurrency(totals.annualCTC);
    flatData['annual_ctc'] = formatCurrency(totals.annualCTC);

    return {
        earnings: processedEarnings,
        deductions: processedDeductions,
        benefits: processedBenefits,
        totals: {
            grossA: {
                monthly: totals.grossEarnings,
                yearly: totals.grossEarnings * 12,
                formattedM: formatCurrency(totals.grossEarnings),
                formattedY: formatCurrency(totals.grossEarnings * 12)
            },
            grossB: { monthly: 0, yearly: 0, formattedM: '0', formattedY: '0' },
            grossC: {
                monthly: totals.employerBenefits,
                yearly: totals.employerBenefits * 12,
                formattedM: formatCurrency(totals.employerBenefits),
                formattedY: formatCurrency(totals.employerBenefits * 12)
            },
            earnings: {
                monthly: totals.grossEarnings,
                yearly: totals.grossEarnings * 12,
                formattedM: formatCurrency(totals.grossEarnings),
                formattedY: formatCurrency(totals.grossEarnings * 12)
            },
            deductions: {
                monthly: totals.totalDeductions,
                yearly: totals.totalDeductions * 12,
                formattedM: formatCurrency(totals.totalDeductions),
                formattedY: formatCurrency(totals.totalDeductions * 12)
            },
            employer: {
                monthly: totals.employerBenefits,
                yearly: totals.employerBenefits * 12,
                formattedM: formatCurrency(totals.employerBenefits),
                formattedY: formatCurrency(totals.employerBenefits * 12)
            },
            computedCTC: {
                monthly: totals.monthlyCTC,
                yearly: totals.annualCTC,
                formattedM: formatCurrency(totals.monthlyCTC),
                formattedY: formatCurrency(totals.annualCTC)
            },
            ctc: {
                monthly: totals.monthlyCTC,
                yearly: totals.annualCTC,
                formattedM: formatCurrency(totals.monthlyCTC),
                formattedY: formatCurrency(totals.annualCTC)
            },
            net: {
                monthly: totals.netSalary,
                yearly: totals.netSalary * 12,
                formattedM: formatCurrency(totals.netSalary),
                formattedY: formatCurrency(totals.netSalary * 12)
            },
            netSalary: {
                monthly: totals.netSalary,
                yearly: totals.netSalary * 12,
                formattedM: formatCurrency(totals.netSalary),
                formattedY: formatCurrency(totals.netSalary * 12)
            },
            totalCTC: {
                monthly: totals.monthlyCTC,
                yearly: totals.annualCTC,
                formattedM: formatCurrency(totals.monthlyCTC),
                formattedY: formatCurrency(totals.annualCTC)
            }
        },
        flatData
    };
}

// =========================================================================
// C) GENERIC LETTER GENERATION & WORKFLOW
// =========================================================================

/**
 * Generate a generic letter based on any template
 * Supports both Word and HTML (Blank/Letter Pad) templates
 */
exports.generateGenericLetter = async (req, res) => {
    try {
        const { templateId, employeeId, applicantId, customData = {} } = req.body;
        const tenantId = req.tenantId;

        // Add validation logging
        console.log('🔍 [generateGenericLetter] Received:', { templateId, employeeId, applicantId });

        const { LetterTemplate, GeneratedLetter, Employee, Applicant, EmployeeSalarySnapshot } = getModels(req);

        // 1. Fetch Template
        const template = await LetterTemplate.findOne({ _id: templateId, tenantId });
        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

        // 2. Fetch Entity Data (Employee or Applicant)
        // NOTE: Employee uses 'tenant' field, not 'tenantId'
        let entity = null;
        let entityType = '';
        if (employeeId) {
            console.log('🔍 [generateGenericLetter] Searching for employee:', { employeeId, tenant: tenantId });
            entity = await Employee.findOne({ _id: employeeId, tenant: tenantId });
            if (!entity) {
                console.warn('⚠️ [generateGenericLetter] Employee not found:', { employeeId, tenant: tenantId });
            } else {
                console.log('✅ [generateGenericLetter] Employee found:', { id: entity._id, name: entity.firstName });
            }
            entityType = 'employee';
        } else if (applicantId) {
            console.log('🔍 [generateGenericLetter] Searching for applicant:', { applicantId, tenantId });
            entity = await Applicant.findOne({ _id: applicantId, tenantId });
            if (!entity) {
                console.warn('⚠️ [generateGenericLetter] Applicant not found:', { applicantId, tenantId });
            }
            entityType = 'applicant';
        }

        if (!entity && !customData.candidateName) {
            console.error('❌ [generateGenericLetter] No entity found and no candidateName provided');
            return res.status(400).json({ success: false, message: 'Employee or Applicant ID is required' });
        }

        // 3. Prepare Placeholder Values
        const placeholderData = {
            ...customData,
            employee_name: entity ? (entity.firstName + ' ' + (entity.lastName || '')) : (customData.candidateName || ''),
            designation: entity?.designation || customData.designation || '',
            department: entity?.department || customData.department || '',
            joining_date: entity?.joiningDate ? safeDate(entity.joiningDate) : (customData.joining_date || ''),
            employee_id: entity?.employeeId || '',
            current_date: formatCustomDate(new Date()),
            company_name: req.user.companyName || 'The Company'
        };

        // If salary is needed, fetch latest snapshot
        if (employeeId) {
            const snapshot = await EmployeeSalarySnapshot.findOne({ employeeId, tenantId }).sort('-createdAt');
            if (snapshot) {
                const totals = snapshot.totals || {};
                const dataWithSalary = applyUniversalSalaryPatches(placeholderData, snapshot, totals);
                Object.assign(placeholderData, dataWithSalary);
            }
        }

        let pdfResult;
        const timestamp = Date.now();
        const fileName = `${template.type}_${entityType}_${timestamp}.pdf`;
        const outputDir = path.join(__dirname, '../uploads/generated_letters', tenantId.toString());

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, fileName);
        const publicUrl = `/uploads/generated_letters/${tenantId}/${fileName}`;

        // 4. Generate Based on Template Type
        if (template.templateType === 'WORD') {
            if (!template.filePath) throw new Error('Template file path missing');

            const normalizedTemplatePath = normalizeFilePath(template.filePath);
            if (!fs.existsSync(normalizedTemplatePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Template file not found on server. Please re-upload the template.'
                });
            }

            const buffer = fs.readFileSync(normalizedTemplatePath);
            const zip = new PizZip(buffer);
            sanitizeDocxTemplateDelimiters(zip);
            let doc;
            try {
                doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    delimiters: { start: '{{', end: '}}' }
                });
            } catch (compileErr) {
                console.error('❌ [generateGenericLetter] Template compile error:', compileErr);
                return res.status(400).json(buildTemplateCompileError(compileErr));
            }

            try {
                doc.render(placeholderData);
            } catch (renderErr) {
                console.error('❌ [generateGenericLetter] Template render error:', renderErr);
                return res.status(400).json(buildTemplateCompileError(renderErr));
            }
            const generatedBuffer = doc.getZip().generate({ type: 'nodebuffer' });

            // Save temporary docx file for conversion with proper naming
            // Use a consistent filename that includes template info
            const docxFileName = `${template.type}_${entityType}_${timestamp}.docx`;
            const tempDocxPath = path.join(outputDir, docxFileName);
            fs.writeFileSync(tempDocxPath, generatedBuffer);

            try {
                // Use LibreOfficeService for PDF conversion (reliable, cross-platform)
                console.log(`📄 [generateGenericLetter] Converting DOCX to PDF using LibreOffice...`);
                console.log(`📄 [generateGenericLetter] DOCX Path: ${tempDocxPath}`);
                console.log(`📄 [generateGenericLetter] Output Dir: ${outputDir}`);

                const libreOfficeService = require('../services/LibreOfficeService');
                libreOfficeService.convertToPdfSync(tempDocxPath, outputDir);

                // Verify PDF was created with the expected name
                if (!fs.existsSync(outputPath)) {
                    console.error(`❌ [generateGenericLetter] Expected PDF not found at: ${outputPath}`);
                    console.log(`📋 [generateGenericLetter] Checking for any PDF files in directory...`);
                    const files = fs.readdirSync(outputDir);
                    console.log(`📋 [generateGenericLetter] Files in ${outputDir}:`, files);
                    throw new Error(`PDF file was not created at expected path: ${outputPath}`);
                }

                console.log(`✅ [generateGenericLetter] PDF conversion successful: ${outputPath}`);

                // Cleanup temporary docx
                try {
                    fs.unlinkSync(tempDocxPath);
                    console.log(`🧹 [generateGenericLetter] Cleaned up temp DOCX: ${tempDocxPath}`);
                } catch (cleanupErr) {
                    console.warn(`⚠️ [generateGenericLetter] Could not cleanup temp file: ${cleanupErr.message}`);
                }
            } catch (err) {
                console.error('❌ [generateGenericLetter] PDF Conversion error:', err.message);
                // Cleanup temporary file on error
                try {
                    if (fs.existsSync(tempDocxPath)) {
                        fs.unlinkSync(tempDocxPath);
                        console.log(`🧹 [generateGenericLetter] Cleaned up temp DOCX after error`);
                    }
                } catch (cleanupErr) {
                    console.warn('⚠️ Could not cleanup temp file:', cleanupErr.message);
                }
                throw new Error(`Failed to convert document to PDF: ${err.message}`);
            }
        } else {
            // HTML Template (Blank or Letter Pad)
            const htmlContent = template.bodyContent; // In a real app, use a template engine like Handlebars
            let processedHtml = htmlContent;

            // Simple placeholder replacement
            Object.entries(placeholderData).forEach(([key, val]) => {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                processedHtml = processedHtml.replace(regex, val);
            });

            // Use existing PDF generator service
            await letterPDFGenerator.generatePDF({
                html: processedHtml,
                outputPath,
                headerHtml: template.hasHeader ? template.headerContent : '',
                footerHtml: template.hasFooter ? template.footerContent : '',
                margins: template.pageLayout?.margins
            });
        }

        // 5. Save generated letter record
        const generatedLetter = new GeneratedLetter({
            tenantId,
            employeeId: employeeId || null,
            applicantId: applicantId || null,
            templateId: template._id,
            letterType: template.type,
            snapshotData: placeholderData,
            templateSnapshot: {
                bodyContent: template.bodyContent,
                contentJson: template.contentJson,
                templateType: template.templateType,
                filePath: template.filePath,
                version: template.version
            },
            pdfPath: outputPath,
            pdfUrl: publicUrl,
            status: template.requiresApproval ? 'pending' : 'generated',
            generatedBy: req.user.id
        });

        await generatedLetter.save();

        // 6. If approval required, create approval record or notify
        if (template.requiresApproval) {
            const { LetterApproval } = getModels(req);
            // Optional: Auto-assign approvers based on template.approvalRoles
            // For now, just mark as pending
        }

        res.status(201).json({
            success: true,
            message: template.requiresApproval ? 'Letter generated and sent for approval' : 'Letter generated successfully',
            data: generatedLetter
        });

    } catch (error) {
        console.error('Generate Generic Letter Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all generated letters for a tenant
 */
exports.getGeneratedLetters = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { GeneratedLetter } = getModels(req);

        const filter = { tenantId };
        if (req.query.employeeId) filter.employeeId = req.query.employeeId;
        if (req.query.status) filter.status = req.query.status;

        const letters = await GeneratedLetter.find(filter)
            .populate('employeeId', 'firstName lastName employeeId')
            .populate('applicantId', 'name')
            .populate('templateId', 'name type')
            .sort('-createdAt');

        res.json({ success: true, data: letters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get specific letter details
 */
exports.getLetterById = async (req, res) => {
    try {
        const { GeneratedLetter, LetterApproval } = getModels(req);
        const letter = await GeneratedLetter.findOne({ _id: req.params.id, tenantId: req.tenantId })
            .populate('employeeId', 'firstName lastName employeeId')
            .populate('templateId', 'name type');

        if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });

        const approvals = await LetterApproval.find({ letterId: letter._id })
            .populate('approverId', 'firstName lastName')
            .sort('createdAt');

        res.json({ success: true, data: { ...letter.toObject(), approvals } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update letter status (Sent, Rejected by candidate, etc.)
 */
exports.updateGeneratedLetterStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { GeneratedLetter } = getModels(req);

        const letter = await GeneratedLetter.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.tenantId },
            { $set: { status } },
            { new: true }
        );

        if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });

        res.json({ success: true, data: letter });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Action a letter approval (Approve/Reject)
 */
exports.actionLetterApproval = async (req, res) => {
    try {
        const { status, comments } = req.body;
        const { GeneratedLetter, LetterApproval } = getModels(req);

        const letter = await GeneratedLetter.findOne({ _id: req.params.id, tenantId: req.tenantId });
        if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });

        const approval = new LetterApproval({
            tenantId: req.tenantId,
            letterId: letter._id,
            approverId: req.user.id,
            status,
            comments,
            actionedAt: new Date()
        });

        await approval.save();

        if (status === 'approved') {
            letter.status = 'approved';
        } else {
            letter.status = 'rejected';
        }
        await letter.save();

        res.json({ success: true, message: `Letter ${status} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper to round to 2 decimals
const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

// =========================================================================
// PRODUCTION-GRADE DOCUMENT MANAGEMENT & REVOCATION SYSTEM
// =========================================================================

/**
 * GET DOCUMENT STATUS
 * Check if a document is currently revoked, viewed, etc.
 * Non-destructive - purely informational
 */
exports.getDocumentStatus = async (req, res) => {
    try {
        const { documentId } = req.params;
        const tenantId = req.user?.tenantId || req.tenantId;

        // Validate ID
        if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ success: false, message: 'Invalid document ID' });
        }

        // Initialize service
        const DocumentManagementService = require('../services/DocumentManagementService');
        const docService = new DocumentManagementService(req.tenantDB);

        // Get document status
        const status = await docService.getDocumentStatus(documentId, tenantId);

        res.json({ success: true, data: status });
    } catch (error) {
        console.error('❌ [GET STATUS] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * REVOKE LETTER/OFFER
 * Instantly disable access, mark as REVOKED
 * Notification email sent to applicant/employee
 * Non-destructive, fully auditable, reversible by super-admin
 */
exports.revokeLetter = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { reason, reasonDetails } = req.body;
        const tenantId = req.user?.tenantId || req.tenantId;

        // Validate input
        if (!documentId) {
            return res.status(400).json({ success: false, message: 'Document ID required' });
        }
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Revocation reason required' });
        }

        // Check permissions - only HR, Admin, or Super-Admin can revoke
        const allowedRoles = ['hr', 'admin', 'super_admin'];
        if (!allowedRoles.includes(req.user?.role?.toLowerCase())) {
            return res.status(403).json({
                success: false,
                message: 'Only HR and Admin can revoke documents'
            });
        }

        // Initialize services
        const DocumentManagementService = require('../services/DocumentManagementService');
        const EmailNotificationService = require('../services/EmailNotificationService');
        const docService = new DocumentManagementService(req.tenantDB);
        const emailService = new EmailNotificationService(process.env);

        const { GeneratedLetter, Applicant, Employee, LetterRevocation } = getModels(req);

        // Get document
        const letter = await GeneratedLetter.findById(documentId);
        if (!letter) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Check if already revoked
        const currentStatus = await docService.getDocumentStatus(documentId, tenantId);
        if (currentStatus.isRevoked) {
            return res.status(400).json({
                success: false,
                message: 'Document is already revoked'
            });
        }

        // Perform revocation
        const revocation = await docService.revokeLetter({
            tenantId,
            generatedLetterId: documentId,
            applicantId: letter.applicantId,
            employeeId: letter.employeeId,
            revokedBy: req.user?.id || req.user?._id,
            revokedByRole: req.user?.role || 'admin',
            reason,
            reasonDetails
        });

        // Log audit trail
        await docService.logAuditAction({
            tenantId,
            documentId,
            applicantId: letter.applicantId,
            employeeId: letter.employeeId,
            action: 'revoked',
            performedBy: req.user?.id || req.user?._id,
            performedByRole: req.user?.role || 'admin',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            reason,
            metadata: { revocationId: revocation._id }
        });

        // Send email notification to applicant/employee
        let recipient = null;
        if (letter.applicantId) {
            recipient = await Applicant.findById(letter.applicantId);
        } else if (letter.employeeId) {
            recipient = await Employee.findById(letter.employeeId);
        }

        if (recipient && recipient.email) {
            try {
                const emailResult = await emailService.sendOfferRevocationEmail({
                    email: recipient.email,
                    name: recipient.name || `${recipient.firstName} ${recipient.lastName}`,
                    positionTitle: letter.letterType === 'offer' ? recipient.designation || 'Position' : 'Position',
                    companyName: process.env.COMPANY_NAME || 'Our Company',
                    revocationReason: reason,
                    revocationDetails: reasonDetails,
                    hrContactName: 'HR Team',
                    hrContactEmail: process.env.HR_EMAIL || 'hr@company.com',
                    tenantId
                });

                // Update revocation record with notification status
                if (emailResult.success) {
                    await LetterRevocation.findByIdAndUpdate(
                        revocation._id,
                        {
                            'notificationSent.email': true,
                            'notificationSent.sentAt': new Date(),
                            'notificationSent.sentTo': [recipient.email]
                        }
                    );
                    console.log(`✅ [REVOKE] Notification email sent to ${recipient.email}`);
                }
            } catch (emailErr) {
                console.error(`❌ [REVOKE] Email notification failed:`, emailErr.message);
                // Continue even if email fails
            }
        }

        res.json({
            success: true,
            message: 'Document revoked successfully',
            data: {
                revocationId: revocation._id,
                documentId,
                revokedAt: revocation.revokedAt,
                reason,
                notificationSent: !!(recipient && recipient.email)
            }
        });

    } catch (error) {
        console.error('❌ [REVOKE] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * REINSTATE LETTER/OFFER
 * Only super-admin can reinstate revoked documents
 * Restores access, fully auditable
 */
exports.reinstateLetter = async (req, res) => {
    try {
        const { revocationId } = req.params;
        const { reinstatedReason } = req.body;
        const tenantId = req.user?.tenantId || req.tenantId;

        // Check permissions - only super-admin can reinstate
        if (req.user?.role?.toLowerCase() !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only super-admin can reinstate revoked documents'
            });
        }

        // Initialize service
        const DocumentManagementService = require('../services/DocumentManagementService');
        const docService = new DocumentManagementService(req.tenantDB);

        // Reinstate
        const revocation = await docService.reinstateLetter(revocationId, {
            reinstatedBy: req.user?.id || req.user?._id,
            reinstatedByRole: req.user?.role,
            reinstatedReason
        });

        // Log audit trail
        await docService.logAuditAction({
            tenantId,
            documentId: revocation.generatedLetterId,
            applicantId: revocation.applicantId,
            employeeId: revocation.employeeId,
            action: 'reinstated',
            performedBy: req.user?.id || req.user?._id,
            performedByRole: req.user?.role,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            reason: `Reinstated: ${reinstatedReason || ''}`,
            metadata: { revocationId }
        });

        res.json({
            success: true,
            message: 'Document reinstated successfully',
            data: {
                revocationId: revocation._id,
                documentId: revocation.generatedLetterId,
                reinstatedAt: revocation.reinstatedAt
            }
        });

    } catch (error) {
        console.error('❌ [REINSTATE] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET DOCUMENT AUDIT TRAIL
 * Complete history of all interactions with a document
 * Who created, viewed, downloaded, revoked, etc.
 */
exports.getDocumentAuditTrail = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { limit = 100 } = req.query;
        const tenantId = req.user?.tenantId || req.tenantId;

        // Validate ID
        if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ success: false, message: 'Invalid document ID' });
        }

        // Initialize service
        const DocumentManagementService = require('../services/DocumentManagementService');
        const docService = new DocumentManagementService(req.tenantDB);

        // Get audit trail
        const trail = await docService.getAuditTrail(documentId, tenantId, parseInt(limit));

        res.json({
            success: true,
            data: {
                documentId,
                auditTrail: trail,
                count: trail.length
            }
        });

    } catch (error) {
        console.error('❌ [AUDIT TRAIL] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET REVOCATION HISTORY
 * All revocation and reinstatement events for a document
 */
exports.getRevocationHistory = async (req, res) => {
    try {
        const { documentId } = req.params;
        const tenantId = req.user?.tenantId || req.tenantId;

        // Validate ID
        if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ success: false, message: 'Invalid document ID' });
        }

        // Initialize service
        const DocumentManagementService = require('../services/DocumentManagementService');
        const docService = new DocumentManagementService(req.tenantDB);

        // Get revocation history
        const history = await docService.getRevocationHistory(documentId, tenantId);

        res.json({
            success: true,
            data: {
                documentId,
                revocationHistory: history,
                count: history.length
            }
        });

    } catch (error) {
        console.error('❌ [REVOCATION HISTORY] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ENFORCE ACCESS CONTROL
 * Check if user can access document (not revoked, not expired)
 * Called before serving document
 */
exports.enforceDocumentAccess = async (req, res) => {
    try {
        const { documentId } = req.params;
        const tenantId = req.user?.tenantId || req.tenantId;
        const userId = req.user?.id || req.user?._id;

        // Initialize service
        const DocumentManagementService = require('../services/DocumentManagementService');
        const docService = new DocumentManagementService(req.tenantDB);

        // Check access
        const result = await docService.enforceAccessControl(documentId, userId, tenantId);

        if (!result.allowed) {
            return res.status(403).json({ success: false, message: result.reason });
        }

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('❌ [ACCESS CONTROL] Error:', error.message);
        res.status(403).json({ success: false, message: error.message });
    }
};

/**
 * ===================================================================
 * 🧱 DYNAMIC PDF & SIGNATURE WORKFLOW (MERN ARCHITECT)
 * ===================================================================
 */

/**
 * GENERATE DYNAMIC PDF BUFFER
 * Fetches data, populates template, injects signature, and returns PDF buffer.
 */
exports.generateDynamicPDF = async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(process.cwd(), 'debug.log');
    fs.appendFileSync(logFile, `🚀 [DYNAMIC_PDF] Controller Start for ID: ${req.params.id}\n`);
    try {
        const { id } = req.params;
        const models = getModels(req);
        const { GeneratedLetter, Candidate, Applicant } = models;

        fs.appendFileSync(logFile, `📄 [DYNAMIC_PDF] Models retrieved. Fetching letter...\n`);
        // 1. Fetch Letter
        const letter = await GeneratedLetter.findById(id).lean();
        if (!letter) {
            fs.appendFileSync(logFile, `❌ [DYNAMIC_PDF] Letter not found: ${id}\n`);
            return res.status(404).send("Document not found in database.");
        }

        fs.appendFileSync(logFile, `📄 [DYNAMIC_PDF] Letter found. Snapshots: ${!!letter.templateSnapshot}, Path: ${letter.pdfPath}\n`);

        // 2. Content Priority: HTML Snapshot > Static File Fallback
        let rawHtml = letter.templateSnapshot?.bodyContent || "";

        // If it's a legacy static PDF and no HTML exists, we serve it directly
        if (!rawHtml && letter.pdfPath) {
            fs.appendFileSync(logFile, `📂 [DYNAMIC_PDF] Serving static fallback: ${letter.pdfPath}\n`);

            // Clean up path for Windows/Unix compatibility
            let cleanPath = letter.pdfPath;
            if (cleanPath.startsWith('/') || cleanPath.startsWith('\\')) {
                cleanPath = cleanPath.substring(1);
            }

            // MERN Architecture: Relative paths are relative to the 'uploads' directory
            let absolutePath;
            if (path.isAbsolute(cleanPath)) {
                absolutePath = cleanPath;
            } else {
                // Try with 'uploads' prefix first (standard)
                absolutePath = path.join(process.cwd(), 'uploads', cleanPath);

                // Fallback: Try without 'uploads' prefix (deprecated)
                if (!fs.existsSync(absolutePath)) {
                    const fallbackPath = path.join(process.cwd(), cleanPath);
                    if (fs.existsSync(fallbackPath)) {
                        absolutePath = fallbackPath;
                    }
                }
            }

            if (fs.existsSync(absolutePath)) {
                fs.appendFileSync(logFile, `✅ [DYNAMIC_PDF] File exists at ${absolutePath}. Sending...\n`);
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("X-Frame-Options", "ALLOWALL");
                res.setHeader("Content-Security-Policy", "frame-ancestors *;");
                return res.sendFile(absolutePath);
            } else {
                fs.appendFileSync(logFile, `❌ [DYNAMIC_PDF] File MISSING at ${absolutePath}\n`);
            }
        }

        // 3. Data Population
        const applicant = letter.applicantId ? await Applicant.findById(letter.applicantId).lean() : null;
        const candidate = (applicant && applicant.candidateId) ? await Candidate.findById(applicant.candidateId).lean() : null;
        const data = letter.snapshotData ? (letter.snapshotData instanceof Map ? Object.fromEntries(letter.snapshotData) : letter.snapshotData) : {};

        let finalHtml = rawHtml || "<p style='text-align:center; padding: 100px; font-family: sans-serif;'>Document content is missing or being processed. Please contact support.</p>";

        // Resolve Placeholders
        Object.entries(data).forEach(([key, val]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            finalHtml = finalHtml.replace(regex, val || "");
        });

        // 4. Signature Injection (Architecture Standard) - DISABLED as per request
        const signatureHtml = `<div style="position: relative; height: 80px; margin-top: 20px;">
                 <div style="border-bottom:1.5px solid #1a1a1a; width:180px; position:absolute; bottom:10px;"></div>
                 <p style="position:absolute; bottom:-10px; left:0; font-size: 11px; color: #64748b; font-weight: 600;">(Candidate Acceptance Space)</p>
               </div>`;

        if (finalHtml.includes('{{SIGNATURE}}')) {
            finalHtml = finalHtml.replace('{{SIGNATURE}}', signatureHtml);
        } else if (finalHtml.includes('{{SIGNATURE_CANDIDATE_ACCEPTANCE}}')) {
            finalHtml = finalHtml.replace('{{SIGNATURE_CANDIDATE_ACCEPTANCE}}', signatureHtml);
        } else {
            finalHtml += `<div style="margin-top: 60px; page-break-inside: avoid;">${signatureHtml}</div>`;
        }

        // 5. Wrap in Professional A4 Wrapper
        const wrappedHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    body { font-family: 'Inter', sans-serif; line-height: 1.5; color: #1e293b; padding: 0; margin: 0; background: #f1f5f9; }
                    .document-wrapper { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 25mm; box-sizing: border-box; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.05); }
                    .content-section { font-size: 13px; text-align: justify; }
                    p { margin-bottom: 12px; }
                    @page { size: A4; margin: 0; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
                    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                    th { background: #f8fafc; font-weight: 700; color: #475569; }
                    .header-logo { max-height: 60px; margin-bottom: 30px; }
                </style>
            </head>
            <body>
                <div class="document-wrapper">
                    <div class="content-section">${finalHtml}</div>
                </div>
            </body>
            </html>
        `;

        // 6. Generate via Puppeteer
        const puppeteerService = require('../services/PuppeteerPDFService');
        const pdfBuffer = await puppeteerService.generatePDFBuffer(wrappedHtml);

        if (!pdfBuffer || pdfBuffer.length === 0) {
            fs.appendFileSync(logFile, `❌ [DYNAMIC_PDF] Generated buffer is empty\n`);
            return res.status(500).send("Failed to generate PDF content.");
        }

        // Security & Compatibility Headers for Iframe Rendering
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", pdfBuffer.length);
        res.setHeader("Content-Disposition", `inline; filename="Letter_${id}.pdf"`);
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET");
        res.setHeader("X-Frame-Options", "ALLOWALL");
        res.setHeader("Content-Security-Policy", "frame-ancestors *;");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

        fs.appendFileSync(logFile, `✅ [DYNAMIC_PDF] Sending BINARY PDF Buffer (${pdfBuffer.length} bytes)\n`);

        // Use .end() with a Buffer to ensure binary transmission instead of JSON stringification
        res.status(200).end(Buffer.from(pdfBuffer), 'binary');

    } catch (error) {
        fs.appendFileSync(logFile, `❌ [DYNAMIC_PDF] Critical Failure: ${error.message}\n`);
        console.error('❌ [DYNAMIC PDF] Critical Failure:', error);
        res.status(500).setHeader("Content-Type", "text/plain").send(`Failed to generate PDF: ${error.message}`);
    }
};

/**
 * SIGN LETTER
 */
exports.signLetter = async (req, res) => {
    try {
        const { id } = req.params;
        const { signatureImage } = req.body;
        const { id: candidateId } = req.candidate;
        const { GeneratedLetter, Candidate, Applicant } = getModels(req);

        const letter = await GeneratedLetter.findById(id);
        if (!letter) return res.status(404).json({ success: false, message: "Letter not found" });

        // Security: Ownership Check
        const applicant = await Applicant.findById(letter.applicantId);
        if (!applicant || String(applicant.candidateId) !== String(candidateId)) {
            return res.status(403).json({ success: false, message: "Unauthorized access to this document." });
        }

        if (letter.status === "Accepted") {
            return res.status(400).json({ success: false, message: "Locked: Document already accepted." });
        }

        // Save Signature & Update Status
        await Candidate.findByIdAndUpdate(candidateId, { digitalSignature: signatureImage });
        letter.status = "Signed";
        await letter.save();

        res.json({ success: true, message: "Digital signature applied successfully." });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * ACCEPT LETTER
 */
exports.acceptLetter = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: candidateId } = req.candidate;
        const { GeneratedLetter, Applicant } = getModels(req);

        const letter = await GeneratedLetter.findById(id);
        if (!letter) return res.status(404).json({ success: false, message: "Letter not found" });

        // Security: Ownership Check
        const applicant = await Applicant.findById(letter.applicantId);
        if (!applicant || String(applicant.candidateId) !== String(candidateId)) {
            return res.status(403).json({ success: false, message: "Unauthorized access to this document." });
        }


        letter.status = "Accepted";
        letter.acceptedAt = new Date();
        await letter.save();

        res.json({ success: true, message: "Document finalized and accepted successfully." });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = exports;


