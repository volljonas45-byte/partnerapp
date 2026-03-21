import api from './client';

export const clientsApi = {
  list:     ()         => api.get('/api/clients'),
  get:      (id)       => api.get(`/api/clients/${id}`),
  invoices: (id)       => api.get(`/api/clients/${id}/invoices`),
  projects: (id)       => api.get(`/api/projects?client_id=${id}`),
  create:   (data)     => api.post('/api/clients', data),
  update:   (id, data) => api.put(`/api/clients/${id}`, data),
  delete:   (id)       => api.delete(`/api/clients/${id}`),
};
