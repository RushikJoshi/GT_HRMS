require('dotenv').config();

// Critical Check: AI Support
if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  WARNING: GEMINI_API_KEY is missing in .env file.");
    console.warn("AI generation and parsing features will NOT work.");
}

// Restart trigger V10 - Engine logic update 2026-02-04
const http = require('http');
// RESTART TRIGGER V7 - Force restart for schema update
// RESTART TRIGGER V12 - Requirement Schema Update 2026-02-17
// RESTART TRIGGER V13 - Final evaluationCriteria in Requirement Schema
const mongoose = require('mongoose');
const app = require('./app');

// Port definition with environment fallback
const PORT = process.env.PORT || 5000;

// Ngrok setup (Optional)
let ngrok;
try { ngrok = require('ngrok'); } catch (_) { ngrok = null; }

/* ===============================
   GLOBAL ERROR HANDLERS (PROCESS)
================================ */
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
    console.error(err.stack);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
    // Optionally shutdown, or just log
    // gracefulShutdown('unhandledRejection');
});

/* ===============================
   DATABASE CONNECTION
================================ */
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
// Print which Mongo URI is being used (mask credentials when present)
const maskUri = (u) => {
    if (!u) return u;
    try {
        return u.replace(/(mongodb(?:\+srv)?:\/\/)([^:@\/\n]+)(:[^@]+)?@/, (m, p1, user, pass) => `${p1}${user}:***@`);
    } catch (e) { return u; }
};
console.log('🔌 Using MONGO_URI:', maskUri(MONGO_URI));
const connectOptions = {
    maxPoolSize: 10,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    family: 4
};

async function connectToDatabase() {
    try {
        await mongoose.connect(MONGO_URI, connectOptions);
        console.log('✅ MongoDB connected');

        // Models are already registered in app.js via require('./app')
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB initial connection failed:', err.message);
        // Fallback logic for SRV/DNS issues
        if (err && (err.syscall === 'querySrv' || err.code === 'ENOTFOUND')) {
            console.warn('⚠️ DNS SRV lookup failed. Checking fallback...');
            const fallback = process.env.MONGO_FALLBACK_URI || 'mongodb://localhost:27017/hrms';
            if (fallback && fallback !== MONGO_URI) {
                console.log(`🔄 Attempting fallback: ${fallback}`);
                await mongoose.connect(fallback, connectOptions);
                console.log('✅ MongoDB connected (Fallback)');
                return;
            }
        }
        // If we can't connect, exit.
        process.exit(1);
    }
}

/* ===============================
   SERVER LIFECYCLE MANAGEMENT
================================ */
const server = http.createServer(app);
let isShuttingDown = false;
let modelsLoading = false;

async function startServer() {
    await connectToDatabase();

    // Initialize Social Media Scheduler
    try {
        const { initScheduler } = require('./modules/socialMedia/services/scheduler');
        initScheduler();
    } catch (schedErr) {
        console.error('⚠️ Failed to initialize scheduler:', schedErr.message);
    }

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ FATAL ERROR: Port ${PORT} is already in use.`);
            process.exit(1);
        } else {
            console.error('Server error:', err);
        }
    });

    // Import and initialize face service
    const RealFaceRecognitionService = require('./services/realFaceRecognition.service');
    const faceServiceInit = new RealFaceRecognitionService();

    console.log('⏳ Starting server.listen on port', PORT);
    server.listen(PORT, async () => {
        console.log(`🚀 Server running on port ${PORT}`);

        // Load face detection models (prevent multiple loads)
        if (!modelsLoading) {
            modelsLoading = true;
            try {
                console.log('📦 Loading face detection models (this may take 30-60 seconds)...');
                await faceServiceInit.loadModels();
                console.log('✅ Face detection models loaded successfully');
            } catch (err) {
                console.error('⚠️ Warning: Failed to load face models:', err.message);
            } finally {
                modelsLoading = false;
            }
        }

        // Initialize BGV SLA Automation
        try {
            const BGVSLACronJobs = require('./cron/bgvSLACron');
            BGVSLACronJobs.initializeCronJobs();
            console.log('✅ BGV SLA automation initialized');
        } catch (cronError) {
            console.error('⚠️ Warning: Failed to initialize BGV SLA cron jobs:', cronError.message);
        }

        // Ngrok (Dev only)
        const useNgrok = String(process.env.USE_NGROK || '').toLowerCase() === 'false' && process.env.NODE_ENV !== 'production';
        if (useNgrok && ngrok) {
            try {
                if (process.env.NGROK_AUTHTOKEN) await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
                const url = await ngrok.connect({ addr: PORT });
                // Make the dynamic URL available to app.js (via process.env)
                process.env.NGROK_URL = url;
                console.log('🌍 NGROK URL:', url);
            } catch (e) {
                console.warn('ngrok failed:', e.message);
            }
        }
    });
}

/**
 * Graceful Shutdown Logic
 */
function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

    const forceExitTimeout = setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down.');
        process.exit(1);
    }, 5000);
    forceExitTimeout.unref();

    if (server.listening) {
        server.close((err) => {
            if (err) {
                console.error('❌ Error closing HTTP server:', err);
                process.exit(1);
            }
            console.log('✅ HTTP server closed.');
            mongoose.disconnect().then(() => {
                console.log('✅ MongoDB connection closed.');
                process.exit(0);
            }).catch(e => {
                console.error('❌ Error closing MongoDB:', e);
                process.exit(1);
            });
        });
    } else {
        mongoose.disconnect().then(() => process.exit(0));
    }
}

// Signal Listeners
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start
if (require.main === module) {
    startServer();
}

module.exports = server;
