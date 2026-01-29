import React from 'react';
import { Navigate } from 'react-router-dom';
import { getToken, isValidToken } from '../../utils/token';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isInitialized } = useAuth();

  // ✅ Step 1: Wait for auth to initialize from sessionStorage
  // This prevents redirect loops by ensuring initial check is complete
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ Step 2: Check if user has valid token
  const token = getToken();
  if (!isValidToken(token)) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Step 3: If role restrictions exist, verify user has allowed role
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/login" replace />;
    }
  }

  // ✅ Step 4: All checks passed - render protected component
  return children;
}

