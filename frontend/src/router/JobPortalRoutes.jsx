/**
 * JobPortalRoutes.jsx
 * COMPLETELY ISOLATED routing for Job Portal
 * NO connection to HRMS routes, layouts, or auth
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import JobPortalAuthProvider, { useJobPortalAuth } from '../context/JobPortalAuthContext';

// Job Portal Components
import CandidateLogin from '../pages/Candidate/CandidateLogin';
import CandidateSignup from '../pages/Candidate/CandidateRegister';
import CandidateDashboard from '../pages/Candidate/CandidateDashboard';
import CandidateOpenPositions from '../pages/Candidate/CandidateOpenPositions';
import CandidateApplications from '../pages/Candidate/CandidateApplications';
import CandidateProfile from '../pages/Candidate/CandidateProfile';
import ApplicationTrack from '../pages/ApplicationTrack';
import JobApplication from '../pages/JobApplication/JobApplication';
import Jobs from '../pages/JobApplication/JobsList';
import NotFound from '../pages/NotFound';

// Job Portal Layout
import JobPortalLayout from '../layouts/JobPortalLayout';

/**
 * Job Portal Protected Route
 * Uses ONLY JobPortalAuthContext
 */
function JobPortalProtectedRoute({ children }) {
  const { candidate, isInitialized } = useJobPortalAuth();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!candidate) {
    return <Navigate to="/candidate/login" replace />;
  }

  return children;
}

/**
 * Main Job Portal Routes
 * Prefix: /jobs/*
 */
function JobPortalRoutesContent() {
  return (
    <Routes>
      {/* Public Candidate Routes */}
      <Route path="login" element={<CandidateLogin />} />
      <Route path="signup" element={<CandidateSignup />} />

      {/* Protected Candidate Routes */}
      <Route
        path="/"
        element={
          <JobPortalProtectedRoute>
            <JobPortalLayout />
          </JobPortalProtectedRoute>
        }
      >
        <Route path="dashboard" element={<CandidateDashboard />} />
        <Route path="open-positions" element={<CandidateOpenPositions />} />
        <Route path="applications" element={<CandidateApplications />} />
        <Route path="profile" element={<CandidateProfile />} />
      </Route>

      <Route
        path="application/:applicationId"
        element={
          <JobPortalProtectedRoute>
            <ApplicationTrack />
          </JobPortalProtectedRoute>
        }
      />

      {/* 404 for Candidate Portal */}
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}

/**
 * Export without Provider
 * Wrapped by JobPortalAuthProvider in AppRoutes
 */
export default function JobPortalRoutes() {
  return <JobPortalRoutesContent />;
}
