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
    const initializeJobPortalAuth = () => {
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

        let candidateInfo = {
          id: payload.id,
          tenantId: payload.tenantId,
          role: 'candidate',
          email: payload.email
        };

        if (candidateData) {
          try {
            candidateInfo = { ...candidateInfo, ...JSON.parse(candidateData) };
          } catch (e) { /* ignore */ }
        }

        setCandidate(candidateInfo);
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
      const res = await api.post('/jobs/candidate/login', {
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
      const res = await api.post('/jobs/candidate/register', data);
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

  const value = {
    candidate,
    isInitialized,
    isLoading,
    error,
    loginCandidate,
    registerCandidate,
    logoutCandidate
  };

  return (
    <JobPortalAuthContext.Provider value={value}>
      {children}
    </JobPortalAuthContext.Provider>
  );
}

export default JobPortalAuthProvider;
