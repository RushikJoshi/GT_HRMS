/* eslint-disable react-refresh/only-export-components */
/**
 * JobPortalAuthContext.jsx
 * COMPLETELY ISOLATED from HRMS AuthContext
 * Used ONLY for Job Portal (candidate login/signup)
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { jwtDecode } from 'jwt-decode';

import api from '../utils/api';

export const JobPortalAuthContext = createContext();

export const useJobPortalAuth = () => {
  const context = useContext(JobPortalAuthContext);
  if (!context) {
    throw new Error('useJobPortalAuth must be used within JobPortalAuthProvider');
  }
  return context;
};

export function JobPortalAuthProvider({ children }) {
  const [candidate, setCandidate] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize on mount
  useEffect(() => {
    const initializeJobPortalAuth = async () => {
      const candidateToken = localStorage.getItem('token');
      const candidateData = localStorage.getItem('candidate');

      if (!candidateToken) {
        setCandidate(null);
        setIsInitialized(true);
        return;
      }

      try {
        const payload = jwtDecode(candidateToken);

        // Check token expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn('Job Portal Token expired');
          localStorage.removeItem('token');
          localStorage.removeItem('candidate');
          setCandidate(null);
          setIsInitialized(true);
          return;
        }

        // Validate role - must be one of the valid roles
        const validRoles = ['candidate', 'HR', 'Admin', 'Employee'];
        const userRole = payload.role && validRoles.includes(payload.role) ? payload.role : 'candidate';

        let candidateInfo = {
          id: payload.id,
          tenantId: payload.tenantId,
          role: userRole,
          email: payload.email
        };

        if (candidateData) {
          try {
            candidateInfo = { ...candidateInfo, ...JSON.parse(candidateData) };
          } catch (e) { /* ignore */ }
        }

        setCandidate(candidateInfo);

        // Fetch latest info ONLY if role is candidate (otherwise we get 403 for HR/Admin users)
        console.log(`[JobPortalAuth] Initializing with role: ${candidateInfo.role}`);

        if (candidateInfo.role === 'candidate') {
          try {
            const res = await api.get('/candidate/me');
            if (res.data && res.data.success) {
              const updatedInfo = { ...candidateInfo, ...res.data.candidate };
              setCandidate(updatedInfo);
              localStorage.setItem('candidate', JSON.stringify(updatedInfo));
            }
          } catch (apiErr) {
            // console.warn(`[JobPortalAuth] Sync failed: ${apiErr.message} (${apiErr.response?.status})`);
            // If token is invalid/expired on server (401), clear session
            if (apiErr.response?.status === 401) {
              console.warn('Token expired or invalid for candidate');
              localStorage.removeItem('token');
              localStorage.removeItem('candidate');
              setCandidate(null);
            } else {
              setCandidate(candidateInfo); // Fallback to token info
            }
          }
        } else {
          console.log('[JobPortalAuth] Not a candidate session. Skipping API sync.');
        }
      } catch (e) {
        console.error('Job Portal Auth initialization error:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('candidate');
        setCandidate(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeJobPortalAuth();
  }, []);

  const loginCandidate = useCallback(async (tenantId, email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/candidate/login', {
        tenantId,
        email,
        password
      });

      const token = res.data.token;

      // Store in standard storage keys
      localStorage.setItem('token', token);
      localStorage.setItem('tenantId', tenantId);

      const candidateData = {
        ...res.data.candidate,
        role: 'candidate',
        tenantId
      };

      localStorage.setItem('candidate', JSON.stringify(candidateData));
      setCandidate(candidateData);

      return { success: true, candidate: candidateData };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerCandidate = useCallback(async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/candidate/register', data);
      return { success: true, ...res.data };
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logoutCandidate = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('candidate');
    // localStorage.removeItem('tenantId'); // Keep for easy re-login
    setCandidate(null);
  }, []);

  const refreshCandidate = useCallback(async () => {
    if (!candidate) return;
    try {
      const res = await api.get('/candidate/me');
      if (res.data && res.data.success) {
        const updatedInfo = { ...candidate, ...res.data.candidate };
        setCandidate(updatedInfo);
        localStorage.setItem('candidate', JSON.stringify(updatedInfo));
      }
    } catch (apiErr) {
      console.warn(`[JobPortalAuth] Refresh failed: ${apiErr.message}`);
    }
  }, [candidate]);

  const value = {
    candidate,
    isInitialized,
    isLoading,
    error,
    loginCandidate,
    registerCandidate,
    logoutCandidate,
    refreshCandidate
  };

  return (
    <JobPortalAuthContext.Provider value={value}>
      {children}
    </JobPortalAuthContext.Provider>
  );
}

export default JobPortalAuthProvider;
