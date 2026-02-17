const puppeteer = require('puppeteer');

/**
 * PuppeteerPDFService
 * Generates PDF buffers dynamically from HTML content using headless Chrome.
 */
class PuppeteerPDFService {
    /**
     * Generate PDF Buffer from HTML
     * @param {string} htmlContent - The full HTML content to render
     * @param {Object} options - Puppeteer PDF options
     * @returns {Promise<Buffer>} - PDF Buffer
     */
    async generatePDFBuffer(htmlContent, options = {}) {
        let browser = null;
        try {
            console.log('🚀 [PUPPETEER] Launching browser...');
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();

            // Intercept requests for fonts if they timeout, but let's try a safer wait first
            console.log('📄 [PUPPETEER] Setting HTML content...');

            // We use domcontentloaded + a small wait to be faster than networkidle0
            await page.setContent(htmlContent, {
                waitUntil: 'domcontentloaded'
            });

            // Wait a bit for fonts/styles to apply if any
            await new Promise(r => setTimeout(r, 500));

            // Generate PDF Buffer
            console.log('📊 [PUPPETEER] Generating PDF buffer...');
            const buffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: {
                    top: '15mm',
                    bottom: '15mm',
                    left: '15mm',
                    right: '15mm'
                },
                ...options
            });

            console.log(`✅ [PUPPETEER] PDF Generated successfully (${buffer.length} bytes)`);
            return buffer;
        } catch (error) {
            console.error('❌ [PUPPETEER] Error:', error.message);
            throw error;
        } finally {
            if (browser) {
                try { await browser.close(); } catch (e) { }
            }
        }
    }
}

module.exports = new PuppeteerPDFService();
