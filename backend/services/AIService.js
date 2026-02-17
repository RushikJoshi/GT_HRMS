const axios = require('axios');

class AIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
    }

    async generateJobContent(jobTitle, department) {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY is not configured in .env');
        }

        const prompt = `
            You are an expert HR Recruitment Consultant. 
            Generate a professional job description for the role of "${jobTitle}" in the "${department}" department.
            
            Return ONLY a valid JSON object with the following structure:
            {
                "description": "A 2-3 paragraph detailed role overview highlighting mission and scope.",
                "responsibilities": ["Array of 5-8 specific daily key tasks and responsibilities"],
                "requiredSkills": ["Array of 5-8 mandatory technical and soft skills"],
                "optionalSkills": ["Array of 3-5 preferred/optional skills"]
            }
            
            Keep the content modern, engaging, and professional. Use British English.
            Ensure the JSON is perfectly formatted and contains no markdown backticks or extra text.
        `;

        try {
            // Using gemini-1.5-flash (Ensure the model name is correct)
            const response = await axios.post(`${this.baseUrl}?key=${this.apiKey}`, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                console.error('[AIService] Unexpected response structure:', JSON.stringify(response.data));
                throw new Error('AI returned an empty or invalid response.');
            }

            let text = response.data.candidates[0].content.parts[0].text;

            // Clean AI common formatting (remove markdown code blocks)
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                return JSON.parse(text);
            } catch (pErr) {
                console.error('[AIService] JSON Parse Error. Raw Text:', text);
                throw new Error('AI response was not valid JSON.');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            console.error('[AIService] Error generating job content:', errorMsg);

            // Re-throw the actual error message so the controller can catch it
            throw new Error(`AI Service Error: ${errorMsg}`);
        }
    }
}

module.exports = new AIService();
