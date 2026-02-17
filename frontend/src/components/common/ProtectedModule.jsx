import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * A wrapper component to protect routes based on enabled modules.
 * If the module is not enabled, it redirects to /unauthorized.
 * Super Admin (role: 'psa') bypasses this check.
 * 
 * @param {string} module - The name of the module to check (e.g., 'hr', 'payroll')
 * @param {React.ReactNode} children - The components to render if allowed
 */
const ProtectedModule = ({ module, children }) => {
    const { user, enabledModules, isInitialized } = useAuth();

    // If still initializing, show nothing or a loader
    if (!isInitialized) return null;

    // Super Admin bypass
    if (user && user.role === 'psa') {
        return <>{children}</>;
    }

    // Check if module is enabled
    // Note: If enabledModules is empty during initialization, it might lead to false negatives.
    // However, AuthProvider ensures enabledModules is loaded from localStorage or login.
    const isEnabled = enabledModules && enabledModules[module] === true;

    if (!isEnabled) {
        console.warn(`[ProtectedModule] Access denied for module: ${module}`);
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
};

export default ProtectedModule;
