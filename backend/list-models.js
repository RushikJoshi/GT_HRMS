require('dotenv').config();
const axios = require('axios');

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const res = await axios.get(url);
        console.log("MODELS:", res.data.models.map(m => m.name));
    } catch (e) {
        console.error("FAILED:", e.message);
    }
}
listModels();
