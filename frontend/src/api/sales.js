import api from './client';

export const salesApi = {
  // Leads
  listLeads:      (params = {}) => api.get('/api/sales/leads', { params }).then(r => r.data),
  getLead:        (id)          => api.get(`/api/sales/leads/${id}`).then(r => r.data),
  createLead:     (data)        => api.post('/api/sales/leads', data).then(r => r.data),
  updateLead:     (id, data)    => api.put(`/api/sales/leads/${id}`, data).then(r => r.data),
  deleteLead:     (id)          => api.delete(`/api/sales/leads/${id}`).then(r => r.data),
  importLeads:    (leads)       => api.post('/api/sales/leads/import', { leads }).then(r => r.data),
  convertToClient:(id)          => api.post(`/api/sales/leads/${id}/convert`).then(r => r.data),

  // Clients (for Kunden tab)
  listSalesClients: (params = {}) => api.get('/api/sales/clients', { params }).then(r => r.data),

  // Calls
  listCalls:      (params = {}) => api.get('/api/sales/calls', { params }).then(r => r.data),
  logCall:        (data)        => api.post('/api/sales/calls', data).then(r => r.data),
  updateCall:     (id, data)    => api.put(`/api/sales/calls/${id}`, data).then(r => r.data),
  deleteCall:     (id)          => api.delete(`/api/sales/calls/${id}`).then(r => r.data),

  // Stats (support owner_id param)
  stats:          (params = {}) => api.get('/api/sales/stats', { params }).then(r => r.data),
  chart:          (days = 14, params = {}) => api.get('/api/sales/stats/chart', { params: { days, ...params } }).then(r => r.data),

  // Targets
  getTargets:     ()            => api.get('/api/sales/targets').then(r => r.data),
  updateTargets:  (data)        => api.put('/api/sales/targets', data).then(r => r.data),
};
