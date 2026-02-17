require('dotenv').config();
const axios = require('axios');

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    try {
        const res = await axios.post(url, {
            contents: [{ parts: [{ text: "Hi" }] }]
        });
        console.log("SUCCESS:", res.data.candidates[0].content.parts[0].text);
    } catch (e) {
        console.error("FAILED:", e.response?.status, e.response?.data || e.message);
    }
}
test();
