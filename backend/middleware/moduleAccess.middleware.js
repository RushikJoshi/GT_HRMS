const Tenant = require('../models/Tenant');

/**
 * Middleware to check if a module is enabled for the current company/tenant.
 * Super Admin (role: 'psa') bypasses this check.
 * 
 * @param {string} moduleName - The name of the module to check (e.g., 'hr', 'payroll')
 */
const checkModuleAccess = (moduleName) => {
    return async (req, res, next) => {
        try {
            // 1. Skip for OAuth routes (safety check)
            const oauthPaths = ['/connect', '/callback'];
            if (oauthPaths.some(path => req.path.includes(path))) {
                console.log(`[checkModuleAccess] Skipping OAuth route: ${req.path}`);
                return next();
            }

            // 2. Super Admin bypass
            if (req.user && req.user.role === 'psa') {
                return next();
            }

            // 2. Identify tenant ID
            const tenantId = req.user?.tenantId || req.tenantId;
            if (!tenantId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied: No tenant context found.'
                });
            }

            // 3. Fetch tenant/company configuration
            const tenant = await Tenant.findById(tenantId).select('enabledModules status');

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found.'
                });
            }

            if (tenant.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: `Access Denied: Company account is ${tenant.status}.`
                });
            }

            // 4. Check if module is enabled
            const isEnabled = tenant.enabledModules && tenant.enabledModules[moduleName] === true;

            if (!isEnabled) {
                return res.status(403).json({
                    success: false,
                    module: moduleName,
                    message: `Access Denied: The '${moduleName}' module is not enabled for your company. Please contact your Super Admin.`
                });
            }

            // 5. Success
            next();
        } catch (error) {
            console.error(`[checkModuleAccess] Error checking access for module '${moduleName}':`, error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during module access validation.'
            });
        }
    };
};

module.exports = checkModuleAccess;
