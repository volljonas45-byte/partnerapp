import api from './client';

export const salesApi = {
  // Leads
  listLeads:    (params = {}) => api.get('/api/sales/leads', { params }).then(r => r.data),
  createLead:   (data)        => api.post('/api/sales/leads', data).then(r => r.data),
  updateLead:   (id, data)    => api.put(`/api/sales/leads/${id}`, data).then(r => r.data),
  deleteLead:   (id)          => api.delete(`/api/sales/leads/${id}`).then(r => r.data),

  // Calls
  listCalls:    (params = {}) => api.get('/api/sales/calls', { params }).then(r => r.data),
  logCall:      (data)        => api.post('/api/sales/calls', data).then(r => r.data),
  updateCall:   (id, data)    => api.put(`/api/sales/calls/${id}`, data).then(r => r.data),
  deleteCall:   (id)          => api.delete(`/api/sales/calls/${id}`).then(r => r.data),

  // Stats
  stats:        ()            => api.get('/api/sales/stats').then(r => r.data),
  chart:        (days = 14)   => api.get('/api/sales/stats/chart', { params: { days } }).then(r => r.data),

  // Targets
  getTargets:   ()            => api.get('/api/sales/targets').then(r => r.data),
  updateTargets:(data)        => api.put('/api/sales/targets', data).then(r => r.data),
};
