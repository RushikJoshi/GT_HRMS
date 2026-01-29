import { jwtDecode } from 'jwt-decode';

export const TOKEN_KEY = 'token';
export const CANDIDATE_KEY = 'candidate';
export const TENANT_KEY = 'tenantId';

// --- Core Token Helpers ---

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }
}

export function removeAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CANDIDATE_KEY);
}

export function isTokenValid(token) {
    if (!token) return false;
    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        return decoded.exp > currentTime;
    } catch (error) {
        return false;
    }
}

// --- Candidate Auth ---

export function getCandidate() {
    const token = getToken();
    const candidateStr = localStorage.getItem(CANDIDATE_KEY);

    if (!token || !isTokenValid(token)) return null;
    if (!candidateStr) return null;

    try {
        const candidate = JSON.parse(candidateStr);
        return candidate;
    } catch (e) {
        return null;
    }
}

export function isCandidateLoggedIn() {
    const candidate = getCandidate();
    return !!candidate;
}

export function logoutCandidate() {
    removeAuth();
    // Optional: Redirect or event emission can be handled by caller
}

export function getTenantId() {
    return localStorage.getItem(TENANT_KEY);
}

export function setTenantId(id) {
    if (id) {
        localStorage.setItem(TENANT_KEY, id);
        // Also keep 'companyId' in sync for legacy code
        localStorage.setItem('companyId', id);
    }
}

export function getCompany() {
    const companyStr = localStorage.getItem('company');
    try {
        return companyStr ? JSON.parse(companyStr) : null;
    } catch (e) {
        return null;
    }
}

export function setCompany(company) {
    if (company) {
        localStorage.setItem('company', JSON.stringify(company));
        if (company.tenantId || company._id) {
            setTenantId(company.tenantId || company._id);
        }
        if (company.code) {
            localStorage.setItem('companyCode', company.code);
        }
    }
}

// --- Employee/HR Auth (If needed for centralization later) ---

export function getUser() {
    const token = getToken();
    if (!token || !isTokenValid(token)) return null;
    try {
        return jwtDecode(token);
    } catch (e) {
        return null;
    }
}
