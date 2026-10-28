const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE = isLocalhost
    ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:1977')
    : (import.meta.env.VITE_API_BASE_URL || 'https://api.bluepay.co.in');

export const API_BASE_URL = `${API_BASE}/api`;

export const TIMEOUT = 15000;
export const RETRY_COUNT = 2;