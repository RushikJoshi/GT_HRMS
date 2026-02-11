/**
 * RootRouter.jsx
 * Master router that separates:
 * 1. /* → HRMS System (with AuthProvider)
 * 2. /jobs/* → Job Portal System (with JobPortalAuthProvider)
 * 3. Root redirection
 *
 * CRITICAL: Each system has its own routing tree and auth context
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { getToken, isValidToken } from '../utils/token';

import HrmsRoutes from './HrmsRoutes';
import JobPortalRoutes from './JobPortalRoutes';
import PublicCareerPage from '../pages/PublicCareerPage';
import NotFound from '../pages/NotFound';

/**
 * Root home redirect
 * Determines which system to route to based on token and user role
 */
function RootHome() {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const token = getToken();
  if (!isValidToken(token)) {
    return <Navigate to="/login" replace />;
  }

  // HRMS system routes based on role
  if (user?.role === 'hr' || user?.role === 'admin') return <Navigate to="/hr" replace />;
  if (user?.role === 'employee' || user?.role === 'manager') return <Navigate to="/employee" replace />;
  if (user?.role === 'psa') return <Navigate to="/psa" replace />;
  if (user?.role === 'candidate') return <Navigate to="/jobs/dashboard" replace />;

  return <Navigate to="/login" replace />;
}

/**
 * Main Root Router
 * Wraps HRMS with AuthProvider, Jobs with JobPortalAuthProvider (inside JobPortalRoutes)
 */
export default function RootRouter() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootHome />} />

      {/* BACKWARD COMPATIBILITY: Redirect old HRMS routes to new HRMS routes */}
      <Route path="/hr" element={<Navigate to="/hr" replace />} />
      <Route path="/hr/*" element={<Navigate to="/hr" replace />} />
      <Route path="/employee" element={<Navigate to="/employee" replace />} />
      <Route path="/employee/*" element={<Navigate to="/employee" replace />} />
      <Route path="/psa" element={<Navigate to="/psa" replace />} />
      <Route path="/psa/*" element={<Navigate to="/psa" replace />} />
      <Route path="/login" element={<Navigate to="/login" replace />} />

      {/* HRMS System - All routes prefixed with /hrms */}
      <Route path="/*" element={<HrmsRoutes />} />

      {/* Public Career Page - For customized career page with SEO */}
      <Route path="/careers/:tenantId" element={<PublicCareerPage />} />

      {/* Job Portal System - All routes prefixed with /jobs or /candidate */}
      <Route path="/jobs/*" element={<JobPortalRoutes />} />
      <Route path="/candidate/*" element={<JobPortalRoutes />} />

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/**
 * Main App Component
 * ONLY wraps with AuthProvider (for HRMS)
 * JobPortalRoutes has its own JobPortalAuthProvider
 */
export function MainApp() {
  return (
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  );
}
