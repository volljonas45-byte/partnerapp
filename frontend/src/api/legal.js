import api from './client';

export const legalApi = {
  get:    (clientId)        => api.get(`/api/legal/${clientId}`).then(r => r.data),
  save:   (clientId, data)  => api.put(`/api/legal/${clientId}`, data).then(r => r.data),
};
