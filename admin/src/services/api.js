import axios from 'axios';
import { API_BASE_URL } from '../api/config';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken'); // Use different key for admin token just in case running both locally
    if (token) {
        config.headers['x-auth-token'] = token;
    }
    return config;
});

export default api;
