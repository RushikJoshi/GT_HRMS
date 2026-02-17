const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logFilePath = path.join(logDir, 'resume_ai.log');

/**
 * Custom logger for Resume AI Parse operations
 */
const aiLogger = {
    info: (message, data = null) => {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [INFO] ${message} ${data ? JSON.stringify(data) : ''}\n`;
        fs.appendFileSync(logFilePath, logEntry);
        console.log(`🤖 [AI-LOG] ${message}`);
    },
    warn: (message, data = null) => {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [WARN] ${message} ${data ? JSON.stringify(data) : ''}\n`;
        fs.appendFileSync(logFilePath, logEntry);
        console.warn(`⚠️ [AI-LOG-WARN] ${message}`);
    },
    error: (message, error = null) => {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [ERROR] ${message} ${error ? (error.stack || JSON.stringify(error)) : ''}\n`;
        fs.appendFileSync(logFilePath, logEntry);
        console.error(`❌ [AI-LOG-ERROR] ${message}`);
    }
};

module.exports = aiLogger;
