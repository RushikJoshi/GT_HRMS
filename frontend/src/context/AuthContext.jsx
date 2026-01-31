/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { parseAxiosError } from "../utils/api";
import { setToken, getToken, removeToken } from "../utils/token";
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const initializeAuth = () => {
      const token = getToken();

      if (!token) {
        setUser(null);
        setIsInitialized(true);
        return;
      }

      try {
        // Token exists - decode and validate
        const payload = jwtDecode(token);

        // Check token expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.warn('Token expired');
          removeToken();
          localStorage.removeItem('candidate');
          localStorage.removeItem('companyName');
          setUser(null);
          delete api.defaults.headers.common["Authorization"];
          setIsInitialized(true);
          return;
        }

        // Token is valid - set it in axios headers
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        // Extract user data from token
        let userData = {
          role: payload.role,
          name: payload.name || payload.email || payload.employeeId || null,
          email: payload.email,
          tenantId: payload.tenantId,
          employeeId: payload.employeeId,
          id: payload.id || payload._id,
        };

        // Enrich candidate data
        if (payload.role === 'candidate') {
          const stored = localStorage.getItem('candidate');
          if (stored) {
            try {
              const fullData = JSON.parse(stored);
              userData = { ...userData, ...fullData };
            } catch (e) { /* ignore */ }
          }
          if (!userData.companyName) {
            userData.companyName = localStorage.getItem('companyName') || 'Company';
          }
        }

        // Store tenantId for multi-tenant support
        if (payload.tenantId) {
          sessionStorage.setItem('tenantId', payload.tenantId);
          localStorage.setItem('tenantId', payload.tenantId);
        }

        setUser(userData);
      } catch (e) {
        console.error('Auth initialization error:', e);
        removeToken();
        localStorage.removeItem('candidate');
        localStorage.removeItem('companyName');
        setUser(null);
        delete api.defaults.headers.common["Authorization"];
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Listen for 401 Unauthorized events (safeguarded)
    let _authMounted = true; // guard to avoid state updates after unmount

    const handleUnauthorized = () => {
      // If component unmounted or no token/user present, ignore the event
      if (!_authMounted) return;
      if (!getToken()) return;

      console.warn("Session expired. Logging out.");
      try {
        // Use the centralized logout semantics (manual here to avoid dependency churn)
        removeToken();
        sessionStorage.removeItem('tenantId');
        localStorage.removeItem("candidate");
        localStorage.removeItem("companyName");
        setUser(null);
        delete api.defaults.headers.common["Authorization"];
      } catch (e) {
        console.error('Error while handling unauthorized event:', e);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      _authMounted = false; // Prevent future handler execution
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user: userData } = res.data;

      setToken(token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Store tenantId if available
      if (userData?.tenantId) {
        localStorage.setItem('tenantId', userData.tenantId);
        sessionStorage.setItem('tenantId', userData.tenantId);
      } else {
        // Try to decode from token if not in user object
        try {
          const decoded = jwtDecode(token);
          if (decoded.tenantId) {
            localStorage.setItem('tenantId', decoded.tenantId);
            sessionStorage.setItem('tenantId', decoded.tenantId);
          }
        } catch (e) { /* ignore */ }
      }

      setUser(userData);
      return { success: true };
    } catch (error) {
      const parsed = error.hrms || parseAxiosError(error);
      const message = parsed?.message || 'Invalid credentials';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginHR = useCallback(async (companyCode, email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login-hr', { companyCode, email, password });
      const { token, user: userData } = res.data;

      setToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);

      try {
        const decoded = jwtDecode(token);
        if (decoded.tenantId) {
          sessionStorage.setItem('tenantId', decoded.tenantId);
          localStorage.setItem('tenantId', decoded.tenantId);
        }
      } catch (e) {
        console.warn('Failed to decode token:', e.message);
      }

      return { success: true };
    } catch (error) {
      const parsed = error.hrms || parseAxiosError(error);
      const message = parsed?.message || 'Invalid credentials';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginEmployee = useCallback(async (companyCode, employeeId, password) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login-employee', { companyCode, employeeId, password });
      const { token, user: userData } = res.data;

      setToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);

      try {
        const decoded = jwtDecode(token);
        if (decoded.tenantId) {
          sessionStorage.setItem('tenantId', decoded.tenantId);
          localStorage.setItem('tenantId', decoded.tenantId);
        }
      } catch (e) {
        console.warn('Failed to decode token:', e.message);
      }

      return { success: true };
    } catch (error) {
      const parsed = error.hrms || parseAxiosError(error);
      const message = parsed?.message || 'Invalid credentials';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginCandidate = useCallback(async (tenantId, email, password) => {
    setIsLoading(true);
    try {
      const res = await api.post('/candidate/login', { tenantId, email, password });
      const token = res.data.token;

      setToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      let companyName = 'Company';
      try {
        const decoded = jwtDecode(token);
        if (decoded.tenantId) {
          sessionStorage.setItem('tenantId', decoded.tenantId);
          localStorage.setItem('tenantId', decoded.tenantId);
        }

        // Best effort to get company name
        const tenantRes = await api.get(`/public/tenant/${tenantId}`);
        companyName = tenantRes.data.name;
        localStorage.setItem('companyName', companyName);
      } catch (e) { /* ignore */ }

      const candidateData = { ...res.data.candidate, role: 'candidate', companyName };
      setUser(candidateData);
      localStorage.setItem("candidate", JSON.stringify(candidateData));

      return { success: true, candidate: candidateData };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    sessionStorage.removeItem('tenantId');
    localStorage.removeItem("candidate");
    localStorage.removeItem("companyName");
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
  }, []);

  const refreshUser = async () => {
    // Placeholder for refreshing user data from backend if needed
    // Currently just relies on token state
  };

  // Missing in original file but referenced in return
  const registerCandidate = useCallback(async (data) => {
    setIsLoading(true);
    try {
      const res = await api.post('/candidate/register', data);
      return { success: true, ...res.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || error.response?.data?.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);


  return (
    <AuthContext.Provider value={{
      user,
      isInitialized,
      isLoading,
      login,
      loginHR,
      loginEmployee,
      loginCandidate,
      registerCandidate,
      refreshUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
