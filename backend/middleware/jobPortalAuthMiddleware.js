/**
 * jobPortalAuthMiddleware.js
 * ONLY for Job Portal system (candidate authentication)
 * Validates candidate tokens ONLY
 * NO tenant middleware, NO role-based access
 */
const jwt = require('jsonwebtoken');

/**
 * Authenticate Job Portal Candidate
 * IMPORTANT: Uses separate token validation from HRMS
 */
exports.authenticateCandidate = (req, res, next) => {
  const fs = require('fs');
  const path = require('path');
  const logFile = path.join(process.cwd(), 'debug.log');

  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      fs.appendFileSync(logFile, `❌ [CANDIDATE_AUTH] No Auth Header for ${req.path}\n`);
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    // Explicitly check JWT_SECRET
    const secret = process.env.JWT_SECRET || 'hrms_secret_key_123';

    try {
      const decoded = jwt.verify(token, secret);

      // Job Portal token must have role='candidate'
      if (decoded.role !== 'candidate') {
        fs.appendFileSync(logFile, `❌ [CANDIDATE_AUTH] Invalid role: ${decoded.role}\n`);
        return res.status(403).json({ error: 'Invalid candidate token' });
      }

      if (!decoded.tenantId || !decoded.id) {
        fs.appendFileSync(logFile, `❌ [CANDIDATE_AUTH] Token missing tenantId/id\n`);
        return res.status(403).json({ error: 'Invalid token structure' });
      }

      req.candidate = {
        id: decoded.id,
        tenantId: decoded.tenantId,
        role: 'candidate'
      };

      next();
    } catch (jwtErr) {
      fs.appendFileSync(logFile, `❌ [CANDIDATE_AUTH] JWT Verify Failed: ${jwtErr.message} | Path: ${req.path}\n`);
      console.error('Job Portal Auth Error:', jwtErr.message);
      return res.status(401).json({ error: 'Invalid token', details: jwtErr.message });
    }
  } catch (err) {
    fs.appendFileSync(logFile, `❌ [CANDIDATE_AUTH] Global Error: ${err.message}\n`);
    console.error('Job Portal Global Auth Error:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Optional: Ensure candidate is logged in
 */
exports.requireCandidate = (req, res, next) => {
  if (!req.candidate) {
    return res.status(401).json({ error: 'Candidate not authenticated' });
  }
  next();
};
