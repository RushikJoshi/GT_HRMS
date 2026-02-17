const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const FeedbackTemplateSchema = require('./models/FeedbackTemplate');

async function test() {
    try {
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        // Register model
        try {
            mongoose.model('FeedbackTemplate', FeedbackTemplateSchema);
        } catch (e) {
            console.log('Model already registered or failed:', e.message);
        }

        const FeedbackTemplate = mongoose.model('FeedbackTemplate');

        const testTenantId = new mongoose.Types.ObjectId();
        const testUserId = new mongoose.Types.ObjectId();

        const template = new FeedbackTemplate({
            name: 'Test Template',
            fields: [
                { label: 'Overall Impression', type: 'paragraph', required: true }
            ],
            tenant: testTenantId,
            createdBy: testUserId
        });

        await template.save();
        console.log('Template saved successfully');

        // Clean up
        await FeedbackTemplate.deleteOne({ _id: template._id });
        console.log('Cleanup successful');

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await mongoose.disconnect();
    }
}

test();
