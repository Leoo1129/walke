import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;

// Pull a readable message out of an axios error, falling back to a default
export function apiError(err, fallback = 'Something went wrong') {
    return err?.response?.data?.error || fallback;
}
