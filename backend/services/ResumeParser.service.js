const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const aiLogger = require('../utils/aiLogger');

/**
 * Resume Parser Service
 * Handles OCR and AI Extraction + DOCX Support
 */
class ResumeParserService {

    /**
     * Main entry point to parse a resume file
     * @param {string} filePath - Path to uploaded file
     * @param {string} mimeType - File MIME type
     * @param {string} jobDescription - Added for context (optional)
     * @param {string} jobTitle - Added for context (optional)
     * @returns {Promise<Object>} - { rawText, structuredData }
     */
    async parseResume(filePath, mimeType, jobDescription = "", jobTitle = "") {
        console.log(`[ResumeParser] Starting parse for ${filePath} (${mimeType})`);
        aiLogger.info(`[ResumeParser] Starting parse for ${path.basename(filePath)} (${mimeType})`);

        let rawText = '';

        try {
            // 1. Extract Text (as a helper, but not strictly required for PDF/Image now)
            if (mimeType === 'application/pdf') {
                rawText = await this.extractTextFromPDF(filePath);
            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType.includes('word')) {
                rawText = await this.extractTextFromDOCX(filePath);
            } else if (mimeType.startsWith('image/')) {
                rawText = await this.extractTextFromImage(filePath);
            } else {
                // Try basic read for text files
                try {
                    rawText = fs.readFileSync(filePath, 'utf8');
                } catch (e) {
                    throw new Error(`Unsupported file type: ${mimeType}`);
                }
            }

            // Cleanup text
            rawText = (rawText || '').replace(/\s+/g, ' ').trim();

            if (!rawText || rawText.length < 20) {
                console.warn(`[ResumeParser] Warning: Very little text extracted locally (${rawText?.length || 0} chars). Will rely on Gemini Vision/PDF support.`);
            }

            // 2. AI Extraction (Structure the data)
            // We pass the filePath and mimeType so Gemini can read the file directly if it's a PDF or Image
            const fileInfo = (mimeType === 'application/pdf' || mimeType.startsWith('image/'))
                ? { filePath, mimeType }
                : null;

            const structuredData = await this.extractStructuredData(rawText, jobDescription, jobTitle, fileInfo);

            if (!structuredData || Object.keys(structuredData).length === 0) {
                console.error("[ResumeParser] AI extraction returned empty object.");
                throw new Error("AI failed to extract structured data from resume.");
            }

            return {
                rawText,
                structuredData
            };
        } catch (error) {
            console.error(`[ResumeParser] Fatal Error at ${path.basename(filePath)}:`, error.message);
            aiLogger.error(`[ResumeParser] Fatal Error: ${error.message}`, { stack: error.stack });
            throw error;
        }
    }

    async extractTextFromPDF(filePath) {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text?.trim() || "";
        } catch (e) {
            console.error(`[ResumeParser] PDF Parse Error:`, e.message);
            return "";
        }
    }

    async extractTextFromDOCX(filePath) {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } catch (e) {
            console.error("DOCX Parse failed:", e);
            return "";
        }
    }

    async extractTextFromImage(filePath) {
        try {
            const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
            return text;
        } catch (e) {
            return "";
        }
    }

    async extractStructuredData(text, jobDescription, jobTitle, fileInfo = null, retryCount = 0) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY missing");

        aiLogger.info("[AI] Calling Gemini resume parser...", { textLength: text.length, hasFile: !!fileInfo, retry: retryCount });

        const promptText = `
        You are an expert HR Recruitment AI.
        TASK: Extract structured information from the resume content provided.
        FORMAT: Return ONLY a valid JSON object. No other text.
        
        {
            "fullName": "Full name of the candidate",
            "email": "Email address",
            "phone": "Phone number",
            "skills": ["Array of technical and soft skills"],
            "totalExperience": "String (e.g. '5 years')",
            "education": [{"degree": "...", "institution": "...", "year": "..."}],
            "experienceSummary": "2-sentence professional summary",
            "currentCompany": "Latest company name",
            "responsibilities": ["Key responsibilities"]
        }

        RESUME TEXT CONTEXT:
        ${text.substring(0, 10000)}
        `;

        const parts = [{ text: promptText }];

        // Attach File Data if available (Native PDF/Vision Support)
        if (fileInfo && fs.existsSync(fileInfo.filePath)) {
            try {
                const base64Data = fs.readFileSync(fileInfo.filePath).toString('base64');
                parts.push({
                    inline_data: {
                        mime_type: fileInfo.mimeType,
                        data: base64Data
                    }
                });
            } catch (e) {
                console.error("[AI] Error reading file for Gemini:", e.message);
            }
        }

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const response = await axios.post(url, { contents: [{ parts }] }, { timeout: 60000 });

            const AI_RAW_TEXT = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!AI_RAW_TEXT) throw new Error("Empty response from AI");

            let jsonStr = AI_RAW_TEXT.trim();
            const markdownMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (markdownMatch) jsonStr = markdownMatch[1].trim();

            try {
                const result = JSON.parse(jsonStr);
                aiLogger.info(`✅ Successfully parsed AI data for: ${result.fullName || 'Unknown'}`);
                return result;
            } catch (pErr) {
                const firstBrace = AI_RAW_TEXT.indexOf('{');
                const lastBrace = AI_RAW_TEXT.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    return JSON.parse(AI_RAW_TEXT.substring(firstBrace, lastBrace + 1));
                }
                throw new Error("AI returned invalid JSON");
            }
        } catch (error) {
            if (error.response?.status === 429 && retryCount < 1) {
                aiLogger.warn("[AI] Rate limit hit. Retrying in 2s...");
                await new Promise(r => setTimeout(r, 2000));
                return this.extractStructuredData(text, jobDescription, jobTitle, fileInfo, retryCount + 1);
            }
            throw error;
        }
    }

}

module.exports = new ResumeParserService();
