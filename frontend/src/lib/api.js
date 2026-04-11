import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — attach JWT Bearer token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mcp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg =
      error.response?.data?.error || error.response?.data?.message || error.message || 'Network error';
    console.error('[API Error]', msg);

    // If token expired or invalid, redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('mcp_token');
      // Only reload if we're not already on login/signup
      if (window.location.pathname !== '/') {
        window.location.reload();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
