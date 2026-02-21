/* eslint-disable react-refresh/only-export-components */
/**
 * JobPortalAuthContext.jsx
 * COMPLETELY ISOLATED from HRMS AuthContext
 * Used ONLY for Job Portal (candidate login/signup)
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';
import { getToken, setToken, removeToken } from '../utils/token';

export const JobPortalAuthContext = createContext(null);

export const useJobPortalAuth = () => {
  const context = useContext(JobPortalAuthContext);
  if (!context) {
    throw new Error(
      'useJobPortalAuth must be used within JobPortalAuthProvider'
    );
  }
  return context;
};

export function JobPortalAuthProvider({ children }) {
  const [candidate, setCandidate] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --------------------------------------------
  // Initialize authentication on mount
  // --------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const initializeJobPortalAuth = async () => {
      try {
        const token = getToken();
        const cachedCandidate = localStorage.getItem('candidate');

        if (!token) {
          if (isMounted) {
            setCandidate(null);
            setIsInitialized(true);
          }
          return;
        }

        let payload;
        try {
          payload = jwtDecode(token);
        } catch {
          throw new Error('Invalid JWT token');
        }

        // Validate minimal payload
        if (!payload?.id || !payload?.tenantId) {
          throw new Error('Invalid token payload');
        }

        // Handle expiry (seconds OR milliseconds)
        if (payload.exp) {
          const expiresAt =
            payload.exp > 1e12 ? payload.exp : payload.exp * 1000;

          if (expiresAt < Date.now()) {
            console.warn('[JobPortalAuth] Token expired');
            removeToken();
            localStorage.removeItem('candidate');
            if (isMounted) {
              setCandidate(null);
              setIsInitialized(true);
            }
            return;
          }
        }

        // Trusted token-based identity
        let candidateInfo = {
          id: payload.id,
          tenantId: payload.tenantId,
          role: payload.role || 'candidate',
          email: payload.email
        };

        // Merge ONLY non-sensitive cached fields
        if (cachedCandidate) {
          try {
            const stored = JSON.parse(cachedCandidate);
            candidateInfo = {
              ...candidateInfo,
              name: stored.name,
              profile: stored.profile,
              avatar: stored.avatar
            };
          } catch {
            console.warn('[JobPortalAuth] Corrupted candidate cache cleared');
            localStorage.removeItem('candidate');
          }
        }

        if (isMounted) {
          setCandidate(candidateInfo);
        }

        console.log(
          `[JobPortalAuth] Initializing with role: ${candidateInfo.role}`
        );

        // Sync latest candidate data
        if (candidateInfo.role === 'candidate') {
          try {
            // Ensure candidate API call uses the candidate token (localStorage)
            const res = await api.get('/candidate/me', {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.success && res.data?.candidate) {
              const updatedInfo = {
                ...candidateInfo,
                ...res.data.candidate
              };

              if (isMounted) {
                setCandidate(updatedInfo);
              }

              localStorage.setItem('candidate', JSON.stringify(updatedInfo));
            }
          } catch (apiErr) {
            console.warn(
              `[JobPortalAuth] Sync failed: ${apiErr.message} (${apiErr.response?.status})`
            );

            // Treat 404 the same as 401 for candidate sessions (candidate not found)
            if (apiErr.response?.status === 401 || apiErr.response?.status === 403 || apiErr.response?.status === 404) {
              removeToken();
              localStorage.removeItem('candidate');
              if (isMounted) {
                setCandidate(null);
              }
            }
          }
        }
      } catch (err) {
        console.error('[JobPortalAuth] Initialization error:', err);
        removeToken();
        localStorage.removeItem('candidate');
        if (isMounted) {
          setCandidate(null);
        }
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    initializeJobPortalAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // --------------------------------------------
  // Login
  // --------------------------------------------
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

      setToken(token);
      localStorage.setItem('tenantId', tenantId);

      const candidateData = {
        ...res.data.candidate,
        role: 'candidate',
        tenantId
      };

      localStorage.setItem('candidate', JSON.stringify(candidateData));
      setCandidate(candidateData);

      return { success: true, candidate: candidateData };
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Login failed';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --------------------------------------------
  // Registration
  // --------------------------------------------
  const registerCandidate = useCallback(async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/candidate/register', data);
      return { success: true, ...res.data };
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Registration failed';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --------------------------------------------
  // Logout
  // --------------------------------------------
  const logoutCandidate = useCallback(() => {
    removeToken();
    localStorage.removeItem('candidate');
    setCandidate(null);
  }, []);

  // --------------------------------------------
  // Refresh candidate profile
  // --------------------------------------------
  const refreshCandidate = useCallback(async () => {
    if (!candidate || candidate.role !== 'candidate') return;

    try {
      const res = await api.get('/candidate/me');
      if (res.data?.success) {
        const updatedInfo = {
          ...candidate,
          ...res.data.candidate
        };
        setCandidate(updatedInfo);
        localStorage.setItem(
          'candidate',
          JSON.stringify(updatedInfo)
        );
      }
    } catch (err) {
      console.warn('[JobPortalAuth] Refresh failed:', err.message);
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
