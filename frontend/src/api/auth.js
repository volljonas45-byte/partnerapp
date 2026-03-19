import api from './client';

export const authApi = {
  login:    (email, password) => api.post('/api/auth/login',    { email, password }),
  register: (email, password) => api.post('/api/auth/register', { email, password }),
  me:       ()                => api.get('/api/auth/me'),
  status:   ()                => api.get('/api/auth/status'),
};
