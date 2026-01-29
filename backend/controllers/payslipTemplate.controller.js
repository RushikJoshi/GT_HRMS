const PayslipTemplate = require('../models/PayslipTemplate');
const Payslip = require('../models/Payslip');
const puppeteer = require('puppeteer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const libreOfficeService = require('../services/LibreOfficeService');

// Configure multer for Payslip Word templates
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, '../uploads/payslip_templates');
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.docx';
        const timestamp = Date.now();
        cb(null, `payslip-template-${timestamp}${ext}`);
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
 * Extract placeholders from Word file
 */
async function extractDocxPlaceholders(filePath) {
    try {
        const buffer = await fsPromises.readFile(filePath);
        const zip = new PizZip(buffer);
        const docXml = zip.file("word/document.xml");
        if (!docXml) return [];

        const text = docXml.asText();
        const placeholderRegex = /\{\{([^}]+)\}\}/g;
        const placeholders = new Set();
        let match;
        while ((match = placeholderRegex.exec(text)) !== null) {
            placeholders.add(match[1].trim());
        }

        return Array.from(placeholders);
    } catch (error) {
        console.warn('⚠️ Error extracting docx placeholders:', error.message);
        return [];
    }
}

/**
 * Extract placeholders from HTML content
 */
function extractPlaceholders(html) {
    const regex = /\{\{([A-Z_]+)\}\}/g;
    const placeholders = new Set();
    let match;

    while ((match = regex.exec(html)) !== null) {
        placeholders.add(match[1]);
    }

    return Array.from(placeholders);
}

/**
 * GET /api/payslip-templates
 */
exports.getTemplates = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const PayslipTemplateModel = req.tenantDB.model('PayslipTemplate');

        const templates = await PayslipTemplateModel.find({ tenant: tenantId })
            .sort({ isDefault: -1, createdAt: -1 });

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('[PAYSLIP_TEMPLATE] Error fetching templates:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
};

/**
 * GET /api/payslip-templates/:id
 */
exports.getTemplateById = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const PayslipTemplateModel = req.tenantDB.model('PayslipTemplate');

        const template = await PayslipTemplateModel.findOne({
            _id: req.params.id,
            tenant: tenantId
        });

        if (!template) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch template' });
    }
};

/**
 * POST /api/payslip-templates
 */
exports.createTemplate = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, htmlContent, isDefault, templateType } = req.body;
        const PayslipTemplateModel = req.tenantDB.model('PayslipTemplate');

        const placeholders = extractPlaceholders(htmlContent || '');

        if (isDefault) {
            await PayslipTemplateModel.updateMany(
                { tenant: tenantId, isDefault: true },
                { $set: { isDefault: false } }
            );
        }

        const template = new PayslipTemplateModel({
            tenant: tenantId,
            name,
            templateType: templateType || 'HTML',
            htmlContent,
            placeholders,
            isDefault: isDefault || false,
            createdBy: req.user.id,
            updatedBy: req.user.id
        });

        await template.save();
        res.status(201).json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/payslip-templates/upload-word
 */
exports.uploadWordTemplate = [
    upload.single('wordFile'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const tenantId = req.user.tenantId;
            const PayslipTemplateModel = req.tenantDB.model('PayslipTemplate');
            const { name, isDefault } = req.body;

            const placeholders = await extractDocxPlaceholders(req.file.path);

            if (isDefault === 'true') {
                await PayslipTemplateModel.updateMany(
                    { tenant: tenantId, isDefault: true },
                    { $set: { isDefault: false } }
                );
            }

            const template = new PayslipTemplateModel({
                tenant: tenantId,
                name: name || req.file.originalname,
                templateType: 'WORD',
                filePath: req.file.path,
                placeholders,
                isDefault: isDefault === 'true',
                createdBy: req.user.id,
                updatedBy: req.user.id
            });

            await template.save();
            res.status(201).json({ success: true, data: template });
        } catch (error) {
            console.error('[PAYSLIP_TEMPLATE] Upload error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
];

/**
 * PUT /api/payslip-templates/:id
 */
exports.updateTemplate = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, htmlContent, isDefault, isActive } = req.body;
        const PayslipTemplateModel = req.tenantDB.model('PayslipTemplate');

        const template = await PayslipTemplateModel.findOne({ _id: req.params.id, tenant: tenantId });
        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

        if (isDefault && !template.isDefault) {
            await PayslipTemplateModel.updateMany({ tenant: tenantId, isDefault: true }, { $set: { isDefault: false } });
        }

        if (name) template.name = name;
        if (htmlContent) {
            template.htmlContent = htmlContent;
            template.placeholders = extractPlaceholders(htmlContent);
        }
        if (typeof isDefault !== 'undefined') template.isDefault = isDefault;
        if (typeof isActive !== 'undefined') template.isActive = isActive;
        template.updatedBy = req.user.id;

        await template.save();
        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/payslip-templates/:id
 */
exports.deleteTemplate = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const PayslipTemplateModel = req.tenantDB.model('PayslipTemplate');

        const template = await PayslipTemplateModel.findOne({ _id: req.params.id, tenant: tenantId });
        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

        // Delete file if it's a WORD template
        if (template.templateType === 'WORD' && template.filePath) {
            if (fs.existsSync(template.filePath)) {
                fs.unlinkSync(template.filePath);
            }
        }

        await PayslipTemplateModel.deleteOne({ _id: req.params.id });
        res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/payslip-templates/render/:payslipId
 */
exports.renderPayslipPDF = async (req, res) => {
    try {
        console.log(`[PAYSLIP_RENDER] Starting render for payslip: ${req.params.payslipId}`);
        const tenantId = req.user.tenantId;
        const { payslipId } = req.params;
        const { templateId } = req.body;

        const PayslipModel = req.tenantDB.model('Payslip');
        const PayslipTemplateModel = req.tenantDB.model('PayslipTemplate');
        const EmployeeModel = req.tenantDB.model('Employee');

        const payslip = await PayslipModel.findOne({ _id: payslipId, tenantId });
        if (!payslip) return res.status(404).json({ success: false, message: 'Payslip not found' });

        const employee = await EmployeeModel.findById(payslip.employeeId).populate('departmentId');
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        let template;
        if (templateId && templateId !== 'undefined') {
            template = await PayslipTemplateModel.findOne({ _id: templateId, tenant: tenantId });
        } else {
            template = await PayslipTemplateModel.findOne({ tenant: tenantId, isDefault: true, isActive: true });
        }

        if (!template) return res.status(404).json({ success: false, message: 'No active template found. Please create or set a default template.' });

        console.log(`[PAYSLIP_RENDER] Using template: ${template.name} (${template.templateType})`);

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = parseInt(payslip.month) - 1;
        const monthName = (monthIndex >= 0 && monthIndex < 12) ? monthNames[monthIndex] : 'N/A';

        // Detailed placeholder data
        const earnings = payslip.earningsSnapshot || [];
        const basicEarning = earnings.find(e => /basic/i.test(e.name));
        const specialEarning = earnings.find(e => /special/i.test(e.name));
        const hraEarning = earnings.find(e => /hra/i.test(e.name));

        const deductions = payslip.preTaxDeductionsSnapshot || [];
        const epfDeduction = deductions.find(d => /epf|pf/i.test(d.name));
        const esiDeduction = deductions.find(d => /esi/i.test(d.name));
        const ptDeduction = deductions.find(d => /professional tax|pt/i.test(d.name));

        const placeholderData = {
            EMPLOYEE_NAME: `${employee.firstName} ${employee.lastName || ''}`.trim(),
            EMPLOYEE_ID: employee.employeeId || '',
            DEPARTMENT: employee.departmentId?.name || employee.department || 'N/A',
            DESIGNATION: employee.designation || 'N/A',
            MONTH: `${monthName} ${payslip.year}`,
            YEAR: (payslip.year || '').toString(),
            BASIC: (basicEarning?.amount || 0).toFixed(2),
            SPECIAL: (specialEarning?.amount || 0).toFixed(2),
            HRA: (hraEarning?.amount || 0).toFixed(2),
            GROSS: (payslip.grossEarnings || 0).toFixed(2),
            EPF: (epfDeduction?.amount || 0).toFixed(2),
            ESI: (esiDeduction?.amount || 0).toFixed(2),
            PT: (ptDeduction?.amount || 0).toFixed(2),
            INCOME_TAX: (payslip.incomeTax || 0).toFixed(2),
            TOTAL_DEDUCTIONS: ((payslip.preTaxDeductionsTotal || 0) + (payslip.incomeTax || 0) + (payslip.postTaxDeductionsTotal || 0)).toFixed(2),
            NET_PAY: (payslip.netPay || 0).toFixed(2),
            PRESENT: (payslip.attendanceSummary?.presentDays || 0).toString(),
            LEAVES: (payslip.attendanceSummary?.leaveDays || 0).toString(),
            LOP: (payslip.attendanceSummary?.lopDays || 0).toString(),
            TOTAL_DAYS: (payslip.attendanceSummary?.totalDays || 0).toString(),
            GENERATED_ON: new Date().toLocaleDateString('en-IN')
        };

        if (template.templateType === 'WORD') {
            if (!template.filePath || !fs.existsSync(template.filePath)) {
                throw new Error('Template Word file not found on server. Please re-upload the template.');
            }

            console.log(`[PAYSLIP_RENDER] Reading Word file: ${template.filePath}`);
            const content = await fsPromises.readFile(template.filePath);
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: () => ""
            });

            doc.render(placeholderData);
            const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

            const tempDir = path.join(__dirname, '../uploads/temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const tempDocxPath = path.join(tempDir, `payslip-${payslipId}-${Date.now()}.docx`);
            await fsPromises.writeFile(tempDocxPath, buf);

            try {
                console.log(`[PAYSLIP_RENDER] Converting to PDF via LibreOffice...`);
                const pdfPath = await libreOfficeService.convertToPdfSync(tempDocxPath, tempDir);
                const pdfBuffer = await fsPromises.readFile(pdfPath);

                // Cleanup
                await fsPromises.unlink(tempDocxPath).catch(e => console.warn('Failed to delete temp docx:', e.message));
                await fsPromises.unlink(pdfPath).catch(e => console.warn('Failed to delete temp pdf:', e.message));

                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Payslip_${employee.employeeId}_${monthName}.pdf"`);
                return res.send(pdfBuffer);
            } catch (pdfErr) {
                console.error(`[PAYSLIP_RENDER] PDF Conversion failed:`, pdfErr);
                throw new Error(`PDF Conversion failed: ${pdfErr.message}. Ensure LibreOffice is installed.`);
            }

        } else {
            // HTML Rendering
            console.log(`[PAYSLIP_RENDER] Rendering HTML template...`);
            let html = template.htmlContent || '';
            for (const [key, value] of Object.entries(placeholderData)) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                html = html.replace(regex, value);
            }

            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            try {
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: 'networkidle0' });
                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    printBackground: true,
                    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
                });
                await browser.close();

                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Payslip_${employee.employeeId}_${monthName}.pdf"`);
                return res.send(pdfBuffer);
            } catch (pageErr) {
                await browser.close();
                throw pageErr;
            }
        }
    } catch (error) {
        console.error('[PAYSLIP_TEMPLATE] Render error:', error);
        // Important: return JSON even if we expected binary, the frontend will now handle it properly
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/payslip-templates/preview
 */
exports.previewTemplate = async (req, res) => {
    try {
        const { htmlContent } = req.body;
        const sampleData = {
            EMPLOYEE_NAME: 'John Doe',
            MONTH: 'January 2026',
            NET_PAY: '45000.00',
            COMPANY_NAME: 'Gitakshmi HRMS'
        };
        let html = htmlContent || '';
        for (const [key, value] of Object.entries(sampleData)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            html = html.replace(regex, value);
        }
        res.json({ success: true, data: { html, placeholders: extractPlaceholders(htmlContent || '') } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
