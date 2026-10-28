import apiClient from '../api/apiClient';

// filters: { search, kycStatus, status, accountType, dateFrom, dateTo, page, limit }
export const getAllUsers = async (filters = {}) => {
    const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const response = await apiClient.get('/users', { params });
    return response.data;
};

// Update user details (status, kycStatus, accountType, domain)
export const updateUserStatus = async (userId, data) => {
    // Handling backward compatibility if only status is passed
    const payload = typeof data === 'object' ? data : { status: data };
    const response = await apiClient.put(`/users/${userId}/status`, payload);
    return response.data;
};

export const createUser = async (userData) => {
    const response = await apiClient.post('/users', userData);
    return response.data;
};

export const getUserDashboardInfo = async (userId) => {
    const response = await apiClient.get(`/users/${userId}/dashboard`);
    return response.data;
};

export const updateUserWallet = async (userId, walletData) => {
    const response = await apiClient.put(`/users/${userId}/wallet`, walletData);
    return response.data;
};
