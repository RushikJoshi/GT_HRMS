const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testApply() {
    try {
        const filePath = "c:\\HRMS\\backend\\uploads\\resumes\\resume-1771182523593-647375563.pdf";
        const requirementId = "699218a136d06ba12cbacadf";
        const tenantId = "6965dccaf2f3f4f7c6893557";

        console.log("Sending apply request...");
        const form = new FormData();
        form.append('resume', fs.createReadStream(filePath));
        form.append('requirementId', requirementId);
        form.append('tenantId', tenantId);
        form.append('email', 'dharmik.test@gmail.com'); // use new email to be sure
        form.append('name', 'Dharmik Jethwani');
        form.append('isFresher', 'true');
        form.append('references', JSON.stringify([]));

        const response = await axios.post('http://localhost:5003/api/public/apply-job', form, {
            headers: {
                ...form.getHeaders(),
                'X-Tenant-ID': tenantId
            }
        });

        console.log("Response Status:", response.status);
        console.log("Response Data:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error Status:", error.response?.status);
        console.error("Error Data:", error.response?.data);
    }
}

testApply();
