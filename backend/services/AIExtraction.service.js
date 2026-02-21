const axios = require('axios');

/**
 * AI Extraction Service
 * Uses Google Gemini to:
 * 1. Read the full resume text
 * 2. Read the job description
 * 3. Return structured candidate data + match analysis in ONE prompt
 */
class AIExtractionService {

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
    }

    /**
     * Clean JSON string from markdown code fences
     */
    cleanJSON(str) {
        if (!str) return null;
        // Remove ```json ... ``` or ``` ... ```
        return str
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();
    }

    /**
     * Extract structured data from Resume Text + match against Job Description
     * @param {string} resumeText - Raw text extracted from resume (full text)
     * @param {string} jobTitle - Job title for context
     * @param {string} jobDescription - Full job description / role overview
     * @returns {Promise<Object>} - Structured candidate data with match analysis
     */
    async extractData(resumeText, jobTitle = "", jobDescription = "") {
        if (!this.apiKey) {
            console.warn("[AIExtraction] ⚠️ GEMINI_API_KEY missing — returning empty structure.");
            return this._emptyResult("No API Key configured");
        }

        if (!resumeText || resumeText.trim().length < 20) {
            console.warn("[AIExtraction] ⚠️ Resume text too short or empty.");
            return this._emptyResult("Resume text empty or too short");
        }

        // Truncate to avoid token limits (Gemini 1.5 Flash supports ~1M tokens but let's be safe)
        const resumeChunk = resumeText.substring(0, 12000);
        const jdChunk = jobDescription ? jobDescription.substring(0, 3000) : '';

        const prompt = `You are an expert HR AI assistant. Your job is to:
1. Read the RESUME TEXT carefully and extract all candidate information
2. Read the JOB DESCRIPTION and understand what skills/experience are required
3. Compare the candidate's profile against the job requirements
4. Return ONLY a valid JSON object — no explanation, no markdown, no extra text

=== JOB DETAILS ===
Job Title: ${jobTitle || "Not specified"}
Job Description: ${jdChunk || "Not provided — extract skills from resume only"}

=== RESUME TEXT ===
${resumeChunk}

=== INSTRUCTIONS ===
Extract the following from the RESUME:
- fullName: Candidate's full name
- email: Email address
- phone: Phone number
- skills: Array of ALL technical and soft skills mentioned (be thorough — include frameworks, languages, tools, methodologies)
- totalExperience: Total work experience as a string like "3 years" or "18 months" — calculate from work history dates if possible
- education: Array of education entries [{degree, institution, year, field}]
- workHistory: Array of jobs [{role, company, duration, description}]
- summary: 2-3 sentence professional summary of the candidate

Then compare against the JOB DESCRIPTION:
- matchedSkills: Skills from the resume that match the job requirements (be specific)
- missingSkills: Skills required by the job that are NOT in the resume
- matchPercentage: Your honest estimate 0-100 of how well this candidate fits the job

Return ONLY this JSON (no markdown, no explanation):
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "skills": ["skill1", "skill2"],
  "totalExperience": "X years",
  "education": [{"degree": "...", "institution": "...", "year": "...", "field": "..."}],
  "workHistory": [{"role": "...", "company": "...", "duration": "...", "description": "..."}],
  "summary": "string",
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "matchPercentage": 75
}`;

        try {
            console.log(`[AIExtraction] 🤖 Calling Gemini for: "${jobTitle}" | Resume: ${resumeChunk.length} chars | JD: ${jdChunk.length} chars`);

            // Try v1 first with gemini-1.5-flash
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

            const payload = {
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.8,
                    maxOutputTokens: 2048
                }
            };

            const response = await axios.post(url, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 45000
            });

            const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) {
                throw new Error("Empty response from Gemini API");
            }

            console.log(`[AIExtraction] ✅ Raw AI response received (${rawText.length} chars)`);

            // Parse JSON
            const cleaned = this.cleanJSON(rawText);
            let parsed;
            try {
                parsed = JSON.parse(cleaned);
            } catch (jsonErr) {
                // Try to extract JSON from within the text
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error(`JSON parse failed: ${jsonErr.message}`);
                }
            }

            // Validate and normalize the result
            const result = {
                fullName: parsed.fullName || parsed.name || "Unknown",
                email: parsed.email || "",
                phone: parsed.phone || parsed.mobile || "",
                skills: Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean) : [],
                totalExperience: parsed.totalExperience || parsed.experience || "0",
                education: Array.isArray(parsed.education) ? parsed.education : [],
                workHistory: Array.isArray(parsed.workHistory) ? parsed.workHistory : [],
                summary: parsed.summary || parsed.experienceSummary || "",
                matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills.filter(Boolean) : [],
                missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills.filter(Boolean) : [],
                matchPercentage: typeof parsed.matchPercentage === 'number' ? parsed.matchPercentage : 0,
                _source: 'gemini-1.5-flash',
                _extractedAt: new Date().toISOString()
            };

            console.log(`[AIExtraction] ✅ Extracted: ${result.fullName} | Skills: ${result.skills.length} | Matched: ${result.matchedSkills.length} | Missing: ${result.missingSkills.length} | AI Score: ${result.matchPercentage}%`);

            return result;

        } catch (error) {
            const status = error.response?.status;
            const errMsg = error.response?.data?.error?.message || error.message;
            console.error(`[AIExtraction] ❌ API Error (${status || 'No Status'}): ${errMsg}`);

            if (status === 403) {
                console.error(`[AIExtraction] 🛑 403 Forbidden! This usually means:`);
                console.error(`  1. The API Key is restricted to certain models or regions.`);
                console.error(`  2. Gemini 1.5 Flash is not enabled in your Google Cloud Project.`);
                console.error(`  3. The API Key is invalid or expired.`);
            }

            // Return honest empty structure — don't fake data
            return this._emptyResult(`AI Error ${status}: ${errMsg}`);
        }

    }

    /**
     * Returns an honest empty result when AI fails
     */
    _emptyResult(reason = "Unknown error") {
        return {
            fullName: "",
            email: "",
            phone: "",
            skills: [],
            totalExperience: "0",
            education: [],
            workHistory: [],
            summary: "",
            matchedSkills: [],
            missingSkills: [],
            matchPercentage: 0,
            _error: reason,
            _source: 'fallback'
        };
    }
}

module.exports = new AIExtractionService();
