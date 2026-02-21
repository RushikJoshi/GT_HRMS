const fs = require('fs');
const path = require('path');

class LibreOfficeService {
    constructor() {
        // User provided path via ENV or default
        this.basePath = process.env.LIBREOFFICE_PATH || 'C:\\Program Files\\LibreOffice\\program';
        this.executablePath = path.join(this.basePath, 'soffice.exe');
    }

    /**
     * Convert a file to PDF asynchronously using execFile
     * @param {string} inputPath - Absolute path to input file (docx)
     * @param {string} outputDir - Directory to save the output PDF
     * @returns {Promise<string>} - Absolute path to the generated PDF
     */
    async convertToPdfAsync(inputPath, outputDir) {
        const { execFile } = require('child_process');
        const util = require('util');
        const execFilePromise = util.promisify(execFile);

        // 1. Verify Executable
        if (!fs.existsSync(this.executablePath)) {
            const x86Path = 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe';
            if (fs.existsSync(x86Path)) {
                this.executablePath = x86Path;
            } else {
                throw new Error(`LibreOffice not found at: ${this.executablePath} or ${x86Path}`);
            }
        }

        if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
        }

        if (!fs.existsSync(outputDir)) {
            await fs.promises.mkdir(outputDir, { recursive: true });
        }

        try {
            console.log(`🔄 [LibreOffice] Converting (Async): ${path.basename(inputPath)}`);

            const args = [
                '--headless',
                '--convert-to',
                'pdf',
                '--outdir',
                outputDir,
                inputPath
            ];

            // Execute Asynchronously
            await execFilePromise(this.executablePath, args);

            // Verify Output
            const baseName = path.basename(inputPath, path.extname(inputPath));
            const pdfPath = path.join(outputDir, `${baseName}.pdf`);

            if (fs.existsSync(pdfPath)) {
                console.log(`✅ [LibreOffice] Created: ${pdfPath}`);
                return pdfPath;
            } else {
                throw new Error('PDF file was not found after conversion command finished.');
            }
        } catch (error) {
            console.error('❌ [LibreOffice] Conversion Failed:', error.message);
            throw new Error(`PDF Conversion Failed: ${error.message}`);
        }
    }

    /**
     * Convert a file to HTML asynchronously using execFile
     * @param {string} inputPath - Absolute path to input file (docx)
     * @param {string} outputDir - Directory to save the output HTML
     * @returns {Promise<string>} - Absolute path to the generated HTML file
     */
    async convertToHtmlAsync(inputPath, outputDir) {
        const { execFile } = require('child_process');
        const util = require('util');
        const execFilePromise = util.promisify(execFile);

        if (!fs.existsSync(this.executablePath)) {
            const x86Path = 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe';
            if (fs.existsSync(x86Path)) {
                this.executablePath = x86Path;
            } else {
                throw new Error('LibreOffice executable not found');
            }
        }

        if (!fs.existsSync(outputDir)) {
            await fs.promises.mkdir(outputDir, { recursive: true });
        }

        try {
            console.log(`🔄 [LibreOffice] Converting to HTML (Async): ${path.basename(inputPath)}`);
            const args = [
                '--headless',
                '--convert-to',
                'html',
                '--outdir',
                outputDir,
                inputPath
            ];

            await execFilePromise(this.executablePath, args);

            const baseName = path.basename(inputPath, path.extname(inputPath));
            const htmlPath = path.join(outputDir, `${baseName}.html`);

            if (fs.existsSync(htmlPath)) {
                console.log(`✅ [LibreOffice] Created HTML (Async): ${htmlPath}`);
                return htmlPath;
            } else {
                throw new Error('HTML file was not found after conversion.');
            }
        } catch (error) {
            console.error('❌ [LibreOffice] HTML Conversion Failed (Async):', error.message);
            throw error;
        }
    }

    /**
     * Convert a file to PDF asynchronously (Smart Fallback)
     * Tries LibreOffice first, then falls back to Mammoth + Puppeteer
     * @param {string} inputPath - Absolute path to input file (docx)
     * @param {string} outputDir - Directory to save the output PDF
     * @returns {Promise<string>} - Absolute path to the generated PDF
     */
    async convertToPdf(inputPath, outputDir) {
        // 1. Try LibreOffice (Preferred)
        try {
            if (fs.existsSync(this.executablePath)) {
                return await this.convertToPdfAsync(inputPath, outputDir);
            } else {
                console.warn(`⚠️ [LibreOffice] Executable not found. Falling back to Puppeteer...`);
            }
        } catch (err) {
            console.error(`⚠️ [LibreOffice] Primary conversion failed: ${err.message}. Falling back...`);
        }

        // 2. Fallback: Mammoth -> HTML -> Puppeteer -> PDF
        return this.convertWithPuppeteer(inputPath, outputDir);
    }

    /**
     * Fallback conversion using Mammoth and Puppeteer
     */
    async convertWithPuppeteer(inputPath, outputDir) {
        const mammoth = require('mammoth');
        const puppeteer = require('puppeteer');

        try {
            console.log(`🔄 [Puppeteer] Converting via Fallback: ${path.basename(inputPath)}`);

            // A. Convert DOCX to HTML
            const result = await mammoth.convertToHtml({ path: inputPath });
            const html = result.value; // The generated HTML
            const messages = result.messages; // Any warnings

            if (messages.length > 0) {
                console.warn('⚠️ [Mammoth] Warnings:', messages);
            }

            // B. Launch Puppeteer
            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            // C. Set Content with some basic styling for letters
            const styledHtml = `
                <html>
                    <head>
                        <style>
                            body { font-family: 'Arial', sans-serif; padding: 40px; line-height: 1.5; font-size: 14px; }
                            p { margin-bottom: 15px; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                        </style>
                    </head>
                    <body>
                        ${html}
                    </body>
                </html>
            `;
            await page.setContent(styledHtml, { waitUntil: 'networkidle0' });

            // D. Print to PDF
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const baseName = path.basename(inputPath, path.extname(inputPath));
            const pdfPath = path.join(outputDir, `${baseName}.pdf`);

            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    bottom: '20mm',
                    left: '20mm',
                    right: '20mm'
                }
            });

            await browser.close();

            console.log(`✅ [Puppeteer] Created Fallback PDF: ${pdfPath}`);
            return pdfPath;

        } catch (error) {
            console.error('❌ [Puppeteer] Fallback Conversion Failed:', error);
            throw new Error(`PDF Conversion Failed (Both LibreOffice and Fallback): ${error.message}`);
        }
    }
}

module.exports = new LibreOfficeService();
