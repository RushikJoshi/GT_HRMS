require('dotenv').config();
const ResumeParserService = require('./services/ResumeParser.service');
const path = require('path');

async function test() {
    const filePath = "c:\\HRMS\\backend\\uploads\\resumes\\resume-1771232390513-575645990.pdf";
    const mimeType = "application/pdf";
    console.log("Testing new Parser logic on scanned PDF...");
    try {
        const result = await ResumeParserService.parseResume(filePath, mimeType, "Job Description", "Job Title");
        console.log("Success!");
        console.log("Structured Data:", JSON.stringify(result.structuredData, null, 2));
    } catch (e) {
        console.error("Test Failed:", e.message);
        console.error("Stack:", e.stack);
    }
}
test();
