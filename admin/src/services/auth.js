import api from './api';

export const login = async (credentials) => {
    const response = await api.post('/auth/login', { ...credentials, isAdminLogin: true });
    if (response.data.token) {
        localStorage.setItem('adminToken', response.data.token);
    }
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('adminToken');
};

export const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('adminUser'));
};
