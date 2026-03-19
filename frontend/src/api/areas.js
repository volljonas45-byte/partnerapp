import api from './client';

export const areasApi = {
  list:          ()           => api.get('/api/areas').then(r => r.data),
  create:        (data)       => api.post('/api/areas', data).then(r => r.data),
  update:        (id, data)   => api.put(`/api/areas/${id}`, data).then(r => r.data),
  delete:        (id)         => api.delete(`/api/areas/${id}`).then(r => r.data),
  createProject: (id, data)   => api.post(`/api/areas/${id}/projects`, data).then(r => r.data),
};
