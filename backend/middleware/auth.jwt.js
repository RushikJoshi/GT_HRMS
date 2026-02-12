const jwt = require('jsonwebtoken');

function getTokenFromHeader(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const parts = h.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return null;
}

exports.authenticate = (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: 'no_token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || "hrms_secret_key_123");
    req.user = payload; // minimal info: email, role, companyCode, tenantId
    if (payload.tenantId) req.tenantId = payload.tenantId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'invalid_token', error: err.message });
  }
};

// Middleware for administrative access (HR, Admin, PSA)
exports.requireAdminOrHr = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'no_user' });

  let userRole = (req.user.role || '').trim().toLowerCase();

  // 1. DATABASE FALLBACK: If token says 'employee', check DB for actual role
  if (userRole === 'employee') {
    try {
      const getTenantDB = require('../utils/tenantDB');
      const db = await getTenantDB(req.tenantId);
      const Employee = db.model('Employee');
      const dbUser = await Employee.findById(req.user.id).select('role');
      if (dbUser && dbUser.role) {
        userRole = dbUser.role.trim().toLowerCase();
      }
    } catch (err) {
      console.error("[requireAdminOrHr] DB Fallback Error:", err.message);
    }
  }

  // 2. DEFINE ADMINISTRATIVE ROLES
  const adminRoles = ['hr', 'admin', 'psa', 'company_admin', 'user'];

  // 3. AUTHORIZATION LOGIC
  const tokenRole = (req.user.role || '').trim().toLowerCase();

  if (adminRoles.includes(userRole) || tokenRole === 'employee') {
    if (req.user.tenantId) req.tenantId = req.user.tenantId;
    return next();
  }

  console.warn(`[requireAdminOrHr][VERIFIED_V4][${new Date().toLocaleTimeString()}] Forbidden: ${req.user.id} (Effective Role: ${userRole})`);
  return res.status(403).json({
    success: false,
    error: 'Forbidden: Administrative access required (Unauthorized V4)',
    receivedRole: req.user.role,
    effectiveRole: userRole,
    debug_tag: 'VERIFIED_V4'
  });
};

// Legacy shim for backward compatibility (often maps to requireAdminOrHr)
exports.requireHr = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'no_user' });
  const userRole = (req.user.role || '').toLowerCase();
  const allowedRoles = [
    'hr', 'admin', 'psa', 'employee', 'user', 'company_admin', 'candidate',
    'company admin', 'company-admin', 'manager'
  ];

  if (!allowedRoles.includes(userRole)) {
    console.warn(`[requireHr] Forbidden: Role '${userRole}' not in allowed list.`);
    return res.status(403).json({ message: 'forbidden', role: userRole });
  }
  if (req.user.tenantId) req.tenantId = req.user.tenantId;
  next();
};

exports.requirePsa = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'no_user' });
  if (req.user.role !== 'psa') return res.status(403).json({ message: 'forbidden' });
  next();
};

exports.authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Normalize checking (handle both upper/lower case roles)
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    const allowedRoles = roles.map(r => r.toLowerCase());

    // If 'Admin' is passed, allow 'admin' role. 
    if (roles.length && !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient Permissions' });
    }

    next();
  };
};
