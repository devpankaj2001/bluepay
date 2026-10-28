import api from './api';

export const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

export const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
};

export const verifyOtp = async (data) => {
    const response = await api.post('/auth/verify-otp', data);
    return response.data;
};

export const resendOtp = async (data) => {
    const response = await api.post('/auth/resend-otp', data);
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('token');
};

export const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user'));
};
