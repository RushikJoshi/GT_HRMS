const axios = require('axios');
require('dotenv').config();

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    const text = `Dharmik Jethwani
    (BCA Student)
    Email: dharmik.jethwani@gmail.com
    Phone: +91 1234567890
    Skills: React, Node.js, MongoDB`;

    const prompt = `
    You are an expert HR Recruitment AI.
    TASK: Extract structured information from the resume text provided.
    FORMAT: Return ONLY a valid JSON object. No other text.
    
    {
        "fullName": "Full name of the candidate",
        "email": "Email address",
        "phone": "Phone number",
        "skills": ["Array of specific technical and soft skills"],
        "totalExperience": "String (e.g. '5 years 2 months')",
        "education": [{"degree": "B.Tech/MBA etc", "institution": "College Name", "year": "Passing year"}],
        "experienceSummary": "Short professional summary (2 sentences)",
        "currentCompany": "Latest company name",
        "responsibilities": ["Array of key work responsibilities from resume"]
    }

    RESUME TEXT:
    ${text}
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        console.log("Gemini Raw Response:", JSON.stringify(response.data, null, 2));
        const aiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log("AI Text Output:", aiText);
    } catch (e) {
        console.error("Gemini Error:", e.response?.data || e.message);
    }
}

testGemini();
