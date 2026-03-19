import api from './client';

export const deliveryApi = {
  getAll:    ()         => api.get('/api/delivery').then(r => r.data),
  create:    (data)     => api.post('/api/delivery', data).then(r => r.data),
  get:       (id)       => api.get(`/api/delivery/${id}`).then(r => r.data),
  update:    (id, data) => api.patch(`/api/delivery/${id}`, data).then(r => r.data),
  delete:    (id)       => api.delete(`/api/delivery/${id}`).then(r => r.data),

  // Public
  getPublic: (token)    => api.get(`/api/delivery/public/${token}`).then(r => r.data),
};
