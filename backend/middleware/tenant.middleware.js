// middleware/tenant.middleware.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
// Use centralized tenant DB helper
const getTenantDB = require('../utils/tenantDB');

module.exports = async function tenantResolver(req, res, next) {
  try {
    const fs = require('fs');
    const path = require('path');
    const logMsg = `[${new Date().toISOString()}] ${req.method} ${req.path} | Query: ${JSON.stringify(req.query)}\n`;
    fs.appendFileSync(path.join(process.cwd(), 'debug.log'), logMsg);

    // Core Logger for Critical Flows
    if (req.path.includes('/pdf')) {
      const pdfLog = `🔍 [PDF_REQUEST] Letter: ${req.params.id || 'N/A'} | Tenant: ${req.query.tenantId} | Token: ${req.query.token?.slice(0, 10)}...\n`;
      fs.appendFileSync(path.join(process.cwd(), 'debug.log'), pdfLog);
      console.log(`🔍 [TENANT_RESOLVER] Hitting PDF route: ${req.method} ${req.path}`);
      console.log(`   Query Params: tenantId=${req.query.tenantId}, hasToken=${!!req.query.token}`);
    }

    // Skip tenant resolution for OPTIONS requests (CORS preflight) and Health Check
    if (req.method === 'OPTIONS' || req.path === '/api/health' || req.path === '/health') {
      return next();
    }

    // For public routes, try to get tenantId from header or URL param
    if (req.path.startsWith('/public/')) {
      // Some public routes like resolve-code or tenant details DON'T need a tenantId beforehand
      const isDiscoveryRoute = req.path.includes('/resolve-code/') || req.path.includes('/tenant/') || req.path.includes('/jobs/');

      const tenantId = req.headers["x-tenant-id"] || req.query.tenantId;

      if (tenantId) {
        req.tenantId = tenantId;
        req.tenantDB = await getTenantDB(tenantId);
        return next();
      } else if (isDiscoveryRoute) {
        // Allow discovery routes to proceed without tenantId
        return next();
      } else {
        return res.status(400).json({ error: "Tenant ID required for this public route" });
      }
    }

    // Try to read tenantId from already-populated req.user or from header or query (for iframes)
    let tenantId = req.user?.tenantId || req.user?.tenant || req.headers["x-tenant-id"] || req.query.tenantId;

    // If no req.user yet (middleware may run before auth middleware), try to extract tenantId from JWT
    if (!tenantId || (!req.user && !req.candidate)) {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      const queryToken = req.query.token;
      const token = (authHeader && authHeader.split(' ')[1]) || queryToken;

      if (token) {
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET || "hrms_secret_key_123");
          tenantId = payload.tenantId || payload.tenant || tenantId;

          if (!req.user && !req.candidate) {
            if (payload.role === 'candidate') {
              req.candidate = { id: payload.id, tenantId: payload.tenantId, role: 'candidate' };
            } else {
              req.user = payload;
            }
          }
          console.log(`[TENANT_MIDDLEWARE] Authenticated via ${queryToken ? 'query' : 'header'} token. Tenant: ${tenantId}`);
        } catch (e) {
          console.log(`[TENANT_MIDDLEWARE] Token verification failed: ${e.message}`);
        }
      }
    }

    // If it's a 25-char ID but looks like it should be 24 (ObjectId), sanitize it
    // This handles a known issue where some IDs were generated with an extra character
    if (tenantId && tenantId.length === 25) {
      console.warn(`⚠️ [TENANT_RESOLVER] Malformed 25-char tenantId detected: ${tenantId}. Attempting to use as is.`);
    }

    req.tenantId = tenantId;

    // Skip tenant resolution for super admin
    if (req.user && req.user.role === 'psa') {
      console.log(`[TENANT_MIDDLEWARE] Skipping tenant resolution for super admin`);
      return next();
    }

    // If tenant ID not required for PSA routes or no tenant info found, continue
    if (!tenantId) {
      console.log(`[TENANT_MIDDLEWARE] No tenantId found, proceeding without tenantDB`);
      return next();
    }

    // 2️⃣ Get tenant-specific DB connection (helper resolves id->code if needed)
    console.log(`[TENANT_MIDDLEWARE] Getting tenant DB for tenantId: ${tenantId}`);

    // If tenantId is a CODE (not an ObjectId), we must resolve it to an ObjectId
    // because models (like Notification) reference tenant as ObjectId.
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      let Tenant;
      try {
        Tenant = mongoose.model('Tenant');
      } catch (e) {
        Tenant = require('../models/Tenant');
      }

      const t = await Tenant.findOne({ code: tenantId }).select('_id').lean();
      if (t) {
        req.tenantId = t._id.toString();
        console.log(`[TENANT_MIDDLEWARE] Resolved tenant code ${tenantId} to ID ${req.tenantId}`);
      } else {
        console.warn(`[TENANT_MIDDLEWARE] Could not resolve tenant code: ${tenantId}`);
      }
    }

    // dbManager (called by getTenantDB) handles caching and model registration
    req.tenantDB = await getTenantDB(tenantId);

    next();
  } catch (err) {
    console.error("Tenant resolve failed:", err);
    console.error("Error details:", err.message);
    if (err.stack) {
      console.error("Stack trace:", err.stack);
    }
    // Don't send response if headers already sent
    if (!res.headersSent) {
      res.status(400).json({
        error: "tenant_not_resolved",
        message: err.message || "Failed to resolve tenant database"
      });
    }
  }
};
