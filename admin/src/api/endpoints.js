export const ENDPOINTS = {
    AUTH: {
        LOGIN: '/admin/auth/login',
        LOGOUT: '/admin/auth/logout',
    },
    DASHBOARD: {
        STATS: '/admin/stats',
    },
    USERS: {
        LIST: '/admin/users',
        DETAILS: (id) => `/admin/users/${id}`,
    },
    // Add more endpoints here
};
