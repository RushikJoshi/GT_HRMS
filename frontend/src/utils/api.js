import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { getToken, removeToken } from './token';

/**
 * Centralized Axios instance for HRMS SaaS API calls
 * Handles authentication, tenant context, and error management
 */

// 1. Get Base URL (Source of Truth: .env)
// Requirement: Must include '/api' (e.g., http://localhost:5000/api)
let rawBaseUrl = import.meta.env.VITE_API_URL;

// Safety Fallbacks
if (!rawBaseUrl) {
  rawBaseUrl = import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://hrms.dev.gitakshmi.com/api';
}

// Ensure consistency: Remove trailing slash
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

// 2. Derive API_ROOT (for static assets like images/uploads)
// Removes '/api' from the end
export const API_ROOT = API_BASE_URL.replace(/\/api$/, '');

console.log('🌍 GLOBAL API CONFIG:', { API_BASE_URL, API_ROOT });

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased to 60 seconds to accommodate heavy operations like PDF generation
});

/**
 * Request Interceptor: Automatically attach JWT token and tenantId
 * - Adds Authorization header with Bearer token
 * - Decodes JWT to extract tenantId and adds X-Tenant-ID header
 * - Ensures all requests include proper authentication and tenant context
 */
api.interceptors.request.use((config) => {
  // Try HRMS token first (sessionStorage)
  let token = sessionStorage.getItem('token');

  // If no HRMS token, try Job Portal token (localStorage)
  if (!token) {
    token = localStorage.getItem('token');
  }

  if (token) {
    // Attach JWT token for authentication
    config.headers.Authorization = `Bearer ${token}`;

    // Decode token to extract tenantId for multi-tenant context
    try {
      const decoded = jwtDecode(token);
      if (decoded.tenantId) {
        config.headers['X-Tenant-ID'] = decoded.tenantId;
      }
    } catch (error) {
      // Log warning but don't fail - some tokens might not have tenantId (e.g., super admin)
      console.warn('Failed to decode token for tenantId:', error.message);
    }
  }
  // If request body is FormData, do not set Content-Type here so the browser can add the correct boundary
  try {
    if (config && config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) delete config.headers['Content-Type'];
    }
  } catch (e) {
    // ignore
  }

  return config;
});

/**
 * Response Interceptor: Handle authentication errors and token expiry
 * - Automatically removes invalid/expired tokens
 * - Does NOT redirect - let React Router handle that
 * - Prevents redirect loops
 */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle backend unreachable
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
      if (!window.__HRMS_API_ERROR) {
        window.__HRMS_API_ERROR = 'Backend server is not running. Please start the server.';
        if (window.showToast) {
          window.showToast({ message: window.__HRMS_API_ERROR, type: 'error' });
        }
      }
    }

    if (error.response && error.response.status === 401) {
      // Token invalid/expired - remove it
      removeToken();
      // Remove Authorization header so next request won't have it
      delete api.defaults.headers.common["Authorization"];

      // DO NOT redirect here - let ProtectedRoute handle it
      // The app will detect missing token on next render and show login
      console.log('401 Unauthorized - token cleared. ProtectedRoute will redirect.');
    }

    return Promise.reject(error);
  }
);

export default api;
