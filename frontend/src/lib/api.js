import axios from 'axios';

const api = axios.create({
  baseURL:
    (`http://${window.location.hostname}:3001`) + '/api',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_API_KEY || 'hackathon-secret',
  },
  timeout: 30000,
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg =
      error.response?.data?.error || error.message || 'Network error';
    console.error('[API Error]', msg);
    return Promise.reject(error);
  }
);

export default api;
