import api from './api';

export function setupAuthDebug() {
  window.authDebug = function () {
    console.group('🔐 AUTH DEBUG INFO');

    // 1. Check token in sessionStorage
    console.group('📦 Token Storage');
    const token = sessionStorage.getItem('token');
    console.log('Token exists:', !!token);
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token parts:', token.split('.').length, '(should be 3)');
      console.log('Token value:', token.substring(0, 50) + '...');

      // Decode payload
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Decoded payload:', payload);

        // Check expiry
        if (payload.exp) {
          const expiryDate = new Date(payload.exp * 1000);
          const now = new Date();
          console.log('Expires:', expiryDate.toLocaleString());
          console.log('Expired:', now > expiryDate, '❌ EXPIRED!' || '✅ VALID');
        }
      } catch (e) {
        console.error('Token decode error:', e.message);
      }
    } else {
      console.log('⚠️ No token in sessionStorage');
    }
    console.groupEnd();

    // 2. Check axios headers
    console.group('🔌 Axios Headers');
    try {
      const authHeader = api.defaults.headers.common['Authorization'];
      console.log('Authorization header:', authHeader ? 'SET ✅' : 'NOT SET ❌');
      if (authHeader) {
        console.log('Header value:', authHeader.substring(0, 30) + '...');
      }
    } catch (e) {
      console.error('Could not import api:', e.message);
    }
    console.groupEnd();

    // 3. Check sessionStorage for tenantId
    console.group('🏢 Tenant Info');
    const tenantId = sessionStorage.getItem('tenantId');
    console.log('TenantId:', tenantId || 'NOT SET');
    console.groupEnd();

    // 4. Check URL and auth state
    console.group('🌐 Current State');
    console.log('Current URL:', window.location.href);
    console.log('On login page:', window.location.pathname.includes('/login'));
    console.groupEnd();

    // 5. Recommendations
    console.group('✅ Action Items');
    if (!token) {
      console.log('❌ No token - User should login');
    } else if (token.split('.').length !== 3) {
      console.log('❌ Invalid token format - Clear sessionStorage and login');
      console.log('sessionStorage.removeItem("token")');
    } else {
      console.log('✅ Token looks valid');
    }

    if (!sessionStorage.getItem('tenantId')) {
      console.log('⚠️ No tenantId - Multi-tenant features may not work');
    }
    console.groupEnd();

    console.groupEnd();
  };

  // Auto-run on first import
  if (typeof window !== 'undefined') {
    window.authDebug();
  }
}
