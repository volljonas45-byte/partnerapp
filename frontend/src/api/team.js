import api from './client';

export const teamApi = {
  list:   ()           => api.get('/api/team'),
  stats:  ()           => api.get('/api/team/stats').then(r => r.data),
  invite: (data)       => api.post('/api/team/invite', data),
  update: (id, data)   => api.put(`/api/team/${id}`, data),
  remove: (id)         => api.delete(`/api/team/${id}`),
};
