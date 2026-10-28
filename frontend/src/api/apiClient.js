import axios from 'axios';
import { API_BASE_URL, TIMEOUT, RETRY_COUNT } from './config';
import { ENDPOINTS } from './endpoints';

// Flag to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

// Request deduplication map
const pendingRequests = new Map();

// Helper to clean queue
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

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
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
            config.headers.Authorization = `Bearer ${token}`; // Just in case, leaving it
        }

        // Deduplication key: Method + URL + Params
        const key = `${config.method}:${config.url}`;

        // Auto-cancel previous identical GET requests (e.g., search typing)
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

        // Cleanup pending map on error too
        if (originalRequest) {
            const key = `${originalRequest.method}:${originalRequest.url}`;
            pendingRequests.delete(key);
        }

        // Handle Cancelled Request (Aborted)
        if (axios.isCancel(error)) {
            return Promise.reject({ ...error, isCanceled: true, message: 'Request Canceled' });
        }

        // Global Error Dispatching
        if (!error.response) {
            // Network Error — only fire if this is a genuine network failure
            // (not an AbortController cancel or Axios CanceledError)
            const isCanceled =
                error.code === 'ERR_CANCELED' ||
                error.name === 'CanceledError' ||
                axios.isCancel(error);
            if (!isCanceled) {
                window.dispatchEvent(new CustomEvent('offline'));
            }
        } else if (error.response.status === 503 || error.response.status === 500) {
            window.dispatchEvent(new CustomEvent('server_down'));
        } else if (error.response.status === 429) {
            window.dispatchEvent(new CustomEvent('rate_limit'));
        }

        // 1. Token Refresh Logic
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken'); // Assuming you store this
                const { data } = await axios.post(`${API_BASE_URL}${ENDPOINTS.AUTH.REFRESH}`, {
                    refreshToken
                });

                const newToken = data.accessToken;
                localStorage.setItem('token', newToken);

                apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                processQueue(null, newToken);

                return apiClient(originalRequest);
            } catch (authError) {
                processQueue(authError, null);
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(authError);
            } finally {
                isRefreshing = false;
            }
        }

        // 2. Retry Logic (GET only)
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
