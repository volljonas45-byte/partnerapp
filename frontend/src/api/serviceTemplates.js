import api from './client';

export const serviceTemplatesApi = {
  list:   ()        => api.get('/api/service-templates'),
  create: (data)    => api.post('/api/service-templates', data).then(r => r.data),
  update: (id, data)=> api.put(`/api/service-templates/${id}`, data).then(r => r.data),
  delete: (id)      => api.delete(`/api/service-templates/${id}`),
};
