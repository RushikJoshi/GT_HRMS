const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const axios = require('axios');

/**
 * Resume Parser Service
 * Handles OCR and AI Extraction
 */
class ResumeParserService {

    /**
     * Main entry point to parse a resume file
     * @param {string} filePath - Path to uploaded file
     * @param {string} mimeType - File MIME type
     * @returns {Promise<Object>} - { text, data, matchScore }
     */
    async parseResume(filePath, mimeType, jobDescription = "", jobTitle = "") {
        try {
            console.log(`[ResumeParser] Starting parse for ${filePath} (${mimeType})`);

            // 1. Extract Text
            let rawText = '';
            if (mimeType === 'application/pdf') {
                rawText = await this.extractTextFromPDF(filePath);
            } else if (mimeType.startsWith('image/')) {
                rawText = await this.extractTextFromImage(filePath);
            } else {
                throw new Error('Unsupported file type. Only PDF and Images allowed.');
            }

            if (!rawText || rawText.length < 50) {
                console.warn('[ResumeParser] OCR extracted very little text.');
            }

            // 2. AI Extraction
            const aiResult = await this.extractStructuredData(rawText, jobDescription, jobTitle);

            return {
                rawText,
                structuredData: aiResult
            };

        } catch (error) {
            console.error('[ResumeParser] Error:', error);
            throw error;
        }
    }

    /**
     * Extract text from PDF using pdf-parse (and Tesseract fallback if needed - TODO)
     */
    async extractTextFromPDF(filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        try {
            const data = await pdfParse(dataBuffer);
            return data.text;
        } catch (e) {
            console.error("PDF Parse failed:", e);
            return "";
        }
    }

    /**
     * Extract text from Image using Tesseract.js
     */
    async extractTextFromImage(filePath) {
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
        return text;
    }

    /**
     * Call OpenAI to parse structured data
     */
    /**
     * Call AI to parse structured data (Gemini)
     */
    async extractStructuredData(text, jobDescription = "", jobTitle = "") {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.warn("Missing GEMINI_API_KEY. Returning mock data.");
            return this.getMockData(text);
        }

        const prompt = `
        You are an AI HR Assistant. Extract the following details from the Resume Text below.
        ${jobTitle ? `TARGET JOB TITLE: ${jobTitle}` : ""}
        ${jobDescription ? `TARGET JOB DESCRIPTION: ${jobDescription}` : ""}

        Return ONLY valid JSON. No markdown formatting.
        
        Fields required:
        - fullName (string)
        - email (string)
        - phone (string)
        - skills (array of strings)
        - totalExperience (string - e.g. "5 years")
        - education (array of objects { degree, institution, year })
        - currentCompany (string)
        - experienceSummary (string - short bio - max 50 words)
        - matchPercentage (number 0-100: Evaluate how well the candidate matches the Job Description/Title. Be strict.)
        - missingSkills (array of strings: Skills mentioned in JD but missing in Resume)
        
        Text:
        ${text.substring(0, 5000)}
        `;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            };

            const response = await axios.post(url, payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            const candidatePart = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!candidatePart) throw new Error("Empty response from Gemini");

            // Clean markdown code blocks if present
            const jsonStr = candidatePart.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(jsonStr);
            console.log("✅ [ResumeParser] Gemini Response:", JSON.stringify(result, null, 2));
            return result;

        } catch (error) {
            console.error("[ResumeParser] AI Error:", error.response?.data || error.message);
            // Fallback to basic regex
            return this.extractBasicRegex(text);
        }
    }

    getMockData(text) {
        // Simple regex fallback for testing without API Key
        const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
        const phoneMatch = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);

        return {
            fullName: "Candidate (Mock)",
            email: emailMatch ? emailMatch[0] : "",
            phone: phoneMatch ? phoneMatch[0] : "",
            skills: ["JavaScript", "React", "Node.js (Mock)"],
            experienceSummary: "Mock parsed data as GEMINI_API_KEY is missing.",
            matchPercentage: 75,
            missingSkills: ["Aws", "Docker"],
            aiGenerated: false
        };
    }

    extractBasicRegex(text) {
        const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
        return {
            fullName: "Parsed Candidate",
            email: emailMatch ? emailMatch[0] : "",
            aiFailed: true
        };
    }
}

module.exports = new ResumeParserService();
