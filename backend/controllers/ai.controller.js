const AIService = require('../services/AIService');

exports.generateJobDescription = async (req, res) => {
    try {
        const { jobTitle, department } = req.body;

        if (!jobTitle) {
            return res.status(400).json({ message: 'Job Title is required for AI generation.' });
        }

        const data = await AIService.generateJobContent(jobTitle, department || 'General');
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('[AIController] Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
