/**
 * Test Script for Professional Joining Letter Generation
 * 
 * This script demonstrates how to generate a professional joining letter
 * with the new CTC breakdown table format.
 * 
 * Usage:
 * 1. Make sure you have an applicant with locked salary
 * 2. Update the APPLICANT_ID below
 * 3. Run: node test_professional_joining_letter.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const APPLICANT_ID = '69673ebe88388fb64f060497'; // Replace with your applicant ID

// You'll need to get a valid JWT token first
// Login to get token
async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login-hr`, {
            email: 'hr@example.com', // Replace with your HR email
            password: 'password123',  // Replace with your HR password
            companyCode: 'DEMO'       // Replace with your company code
        });

        return response.data.token;
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        throw error;
    }
}

// Generate professional joining letter
async function generateProfessionalJoiningLetter(token, applicantId) {
    try {
        console.log('🎨 Generating professional joining letter...');

        const response = await axios.post(
            `${BASE_URL}/api/letters/generate-professional-joining`,
            {
                applicantId: applicantId
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Success!');
        console.log('Download URL:', response.data.downloadUrl);
        console.log('PDF URL:', response.data.pdfUrl);
        console.log('Letter ID:', response.data.letterId);

        return response.data;
    } catch (error) {
        console.error('❌ Failed to generate joining letter:');
        console.error('Status:', error.response?.status);
        console.error('Message:', error.response?.data?.message || error.message);
        console.error('Error:', error.response?.data?.error);
        throw error;
    }
}

// Main execution
async function main() {
    try {
        console.log('🚀 Starting Professional Joining Letter Test...\n');

        // Step 1: Login
        console.log('Step 1: Logging in...');
        const token = await login();
        console.log('✅ Login successful\n');

        // Step 2: Generate joining letter
        console.log('Step 2: Generating professional joining letter...');
        const result = await generateProfessionalJoiningLetter(token, APPLICANT_ID);

        console.log('\n🎉 Test completed successfully!');
        console.log('\nYou can download the PDF from:');
        console.log(`${BASE_URL}${result.downloadUrl}`);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
main();
