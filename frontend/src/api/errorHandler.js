export const handleApiError = (error) => {
    if (error.code === 'ECONNABORTED') {
        return 'Request timeout, please try again.';
    }
    if (!error.response) {
        return 'Server is unreachable. Please check your internet connection.';
    }

    const status = error.response.status;
    if (status === 401) {
        return 'Session expired. Please login again.';
    }
    if (status === 429) {
        return 'Too many requests, please wait.';
    }
    if (status >= 500) {
        return 'Server Error. Please try again later.';
    }

    return error.response.data?.message || 'Something went wrong.';
};
