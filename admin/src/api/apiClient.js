import axios from 'axios';
import { API_BASE_URL, TIMEOUT, RETRY_COUNT } from './config';

// Request deduplication map
const pendingRequests = new Map();

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            config.headers['x-auth-token'] = token;
            config.headers.Authorization = `Bearer ${token}`; // Just in case, leaving it
        }

        // Deduplication key: Method + URL + Params
        const key = `${config.method}:${config.url}`;

        // Auto-cancel previous identical GET requests
        if (config.method === 'get' && pendingRequests.has(key)) {
            const controller = pendingRequests.get(key);
            controller.abort();
        }

        // Assign new controller
        const controller = new AbortController();
        config.signal = controller.signal;
        pendingRequests.set(key, controller);

        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => {
        // Cleanup pending request map
        const key = `${response.config.method}:${response.config.url}`;
        pendingRequests.delete(key);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (originalRequest) {
            const key = `${originalRequest.method}:${originalRequest.url}`;
            pendingRequests.delete(key);
        }

        if (axios.isCancel(error)) {
            return Promise.reject({ ...error, isCanceled: true, message: 'Request Canceled' });
        }

        // Global Error Dispatching
        if (!error.response) {
            if (error.code !== 'ERR_CANCELED') {
                window.dispatchEvent(new CustomEvent('offline'));
            }
        } else if (error.response.status === 503 || error.response.status === 500) {
            window.dispatchEvent(new CustomEvent('server_down'));
        } else if (error.response.status === 429) {
            window.dispatchEvent(new CustomEvent('rate_limit'));
        }

        // 1. Session expiry handling. Cleared here (outside React) so the
        // very next render sees a logged-out state, but the actual
        // redirect is left to React Router (AuthContext listens for this
        // event) instead of a hard window.location reload.
            if (error.response?.status === 401) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.dispatchEvent(new CustomEvent('admin-session-expired'));
                return Promise.reject(error);
        }

        // 2. Retry Logic
        if (
            originalRequest.method === 'get' &&
            (!originalRequest._retryCount || originalRequest._retryCount < RETRY_COUNT) &&
            (!error.response || error.response.status >= 500)
        ) {
            originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
            await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retryCount));
            return apiClient(originalRequest);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
