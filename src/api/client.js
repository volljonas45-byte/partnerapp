import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('partner_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('partner_token');
      localStorage.removeItem('partner_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
