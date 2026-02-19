import api from '../utils/api';

/**
 * companiesService - API service for Super Admin Companies module
 * Base Endpoint: /tenants (Matched to Backend tenant.routes.js)
 */

const companiesService = {
    // 1. Get All Companies
    getAllCompanies: async () => {
        const response = await api.get('/tenants');
        // Accept both array directly or { companies: [] }
        return Array.isArray(response.data)
            ? response.data
            : (response.data?.companies || response.data || []);
    },

    // 2. Create Company
    createCompany: async (payload) => {
        const response = await api.post('/tenants', payload);
        return response.data;
    },

    // 3. Get Single Company
    getCompanyById: async (id) => {
        const response = await api.get(`/tenants/${id}`);
        return response.data;
    },

    // 4. Update Company
    updateCompany: async (id, payload) => {
        const response = await api.put(`/tenants/${id}`, payload);
        return response.data;
    },

    // 5. Toggle Status (Using PUT update since logic is in updateTenant)
    toggleCompanyStatus: async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const response = await api.put(`/tenants/${id}`, { status: newStatus });
        return response.data;
    },

    // 6. Delete Company 
    deleteCompany: async (id) => {
        const response = await api.delete(`/tenants/${id}`);
        return response.data;
    },

    // 7. Upload Logo (Unchanged if generic, but usually backend has specific upload routes)
    uploadLogo: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        // Assuming this route is global or adapted
        const response = await api.post('/uploads/logo', formData);
        return response.data;
    },

    // 8. Verify PSA Password
    verifyPsaPassword: async (password) => {
        const response = await api.post('/tenants/verify-password', { password });
        return response.data;
    },

    // 9. Update Company Password
    updateCompanyPassword: async (id, password) => {
        const response = await api.put(`/tenants/${id}/password`, { password });
        return response.data;
    }
};

export default companiesService;
