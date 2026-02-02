import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import JobPortalRoutes from './JobPortalRoutes';
import HrmsRoutes from './HrmsRoutes';
import JobPortalAuthProvider from '../context/JobPortalAuthContext';
import Jobs from '../pages/JobApplication/JobsList';
import JobApplication from '../pages/JobApplication/JobApplication';
import { useAuth } from '../context/AuthContext';
import { getToken, isValidToken } from '../utils/token';

export default function AppRoutes() {
    return (
        <Routes>
            {/* Root - Auto Redirect based on Auth */}
            <Route path="/" element={<AutoHome />} />

            {/* --- JOB PORTAL SYSTEM --- */}
            {/* --- SYSTEM ROUTES --- */}
            <Route path="hrms/*" element={<HrmsRoutes />} />

            {/* --- JOB PORTAL SYSTEM --- */}
            <Route path="candidate/*" element={
                <JobPortalAuthProvider>
                    <JobPortalRoutes />
                </JobPortalAuthProvider>
            } />

            <Route path="jobs/*" element={
                <JobPortalAuthProvider>
                    <Routes>
                        <Route path="login" element={<Navigate to="/candidate/login" replace />} />
                        <Route path="signup" element={<Navigate to="/candidate/signup" replace />} />
                        <Route path=":companyId" element={<Jobs />} />
                    </Routes>
                </JobPortalAuthProvider>
            } />

            <Route path="apply-job/:requirementId" element={
                <JobPortalAuthProvider>
                    <JobApplication />
                </JobPortalAuthProvider>
            } />

            {/* --- LEGACY/DIRECT FALLBACK --- */}
            <Route path="*" element={<HrmsRoutes />} />
        </Routes>
    );
}

function AutoHome() {
    const { user, isInitialized } = useAuth();
    if (!isInitialized) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    const token = getToken();
    if (!isValidToken(token)) return <Navigate to="/login" replace />;
    if (user?.role === 'hr' || user?.role === 'admin') return <Navigate to="/hr" replace />;
    if (user?.role === 'employee' || user?.role === 'manager') return <Navigate to="/employee" replace />;
    if (user?.role === 'psa') return <Navigate to="/psa" replace />;
    return <Navigate to="/login" replace />;
}

/**
 * Handles redirection from old /hrms paths to new root paths
 */
function HrmsRedirectHandler() {
    const { pathname, search } = useLocation();
    const newPath = pathname.replace(/^\/hrms/, '') || '/';
    return <Navigate to={`${newPath}${search}`} replace />;
}
