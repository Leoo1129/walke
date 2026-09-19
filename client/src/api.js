import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// A 401 on a request that carried a token means the session expired or was revoked;
// AuthProvider listens for this event and signs the user out.
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401 && error.config?.headers?.Authorization) {
            window.dispatchEvent(new Event('auth:expired'));
        }
        return Promise.reject(error);
    }
);

export default api;

// Pull a readable message out of an axios error, falling back to a default
export function apiError(err, fallback = 'Something went wrong') {
    return err?.response?.data?.error || fallback;
}
