import api from './client';

export const authApi = {
  login:          (email, password) => api.post('/api/auth/login',    { email, password }),
  register:       (email, password) => api.post('/api/auth/register', { email, password }),
  me:             ()                => api.get('/api/auth/me'),
  status:         ()                => api.get('/api/auth/status'),
  updateProfile:  (data)            => api.put('/api/auth/profile',  data).then(r => r.data),
  changePassword: (data)            => api.put('/api/auth/password', data).then(r => r.data),
};
