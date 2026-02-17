const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function test() {
    const filePath = "c:\\HRMS\\backend\\uploads\\resumes\\resume-1771232390513-575645990.pdf";
    console.log("Testing pdf-parse on:", filePath);
    try {
        const dataBuffer = fs.readFileSync(filePath);
        console.log("Buffer size:", dataBuffer.length);
        const data = await pdfParse(dataBuffer);
        console.log("Extracted text length:", data.text.length);
        console.log("Preview:", data.text.substring(0, 100));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
