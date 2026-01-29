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
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hrms_secret_key_123');

    // Job Portal token must have role='candidate'
    if (decoded.role !== 'candidate') {
      return res.status(403).json({ error: 'Invalid candidate token' });
    }

    if (!decoded.tenantId || !decoded.id) {
      return res.status(403).json({ error: 'Invalid token structure' });
    }

    req.candidate = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      role: 'candidate'
    };

    next();
  } catch (err) {
    console.error('Job Portal Auth Error:', err.message);
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
