import axios from 'axios';

const api = axios.create({
  baseURL:
    (`http://${window.location.hostname}:3001`) + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — attach JWT Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mcp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (expired/invalid token) globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — force re-login
      localStorage.removeItem('mcp_token');
      window.location.reload();
    }
    const msg =
      error.response?.data?.error || error.message || 'Network error';
    console.error('[API Error]', msg);
    return Promise.reject(error);
  }
);

export default api;
