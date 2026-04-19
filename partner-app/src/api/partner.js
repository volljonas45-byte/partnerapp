import api from './client';

export const partnerApi = {
  login:   (d)     => api.post('/partner/login', d).then(r => r.data),
  apply:   (d)     => api.post('/partner/apply', d).then(r => r.data),
  me:      ()      => api.get('/partner/me').then(r => r.data),

  listLeads:  ()      => api.get('/partner/leads').then(r => r.data),
  createLead: (d)     => api.post('/partner/leads', d).then(r => r.data),
  updateLead: (id, d) => api.put(`/partner/leads/${id}`, d).then(r => r.data),
  listPool:   ()      => api.get('/partner/leads/pool').then(r => r.data),
  claimLead:  (id)    => api.post(`/partner/leads/${id}/claim`).then(r => r.data),
  addCallLog: (id, d) => api.post(`/partner/leads/${id}/calllog`, d).then(r => r.data),
  getCallLog: (id)    => api.get(`/partner/leads/${id}/calllog`).then(r => r.data),

  listAppointments:  ()      => api.get('/partner/appointments').then(r => r.data),
  createAppointment: (d)     => api.post('/partner/appointments', d).then(r => r.data),
  updateAppointment: (id, d) => api.put(`/partner/appointments/${id}`, d).then(r => r.data),

  listCommissions: () => api.get('/partner/commissions').then(r => r.data),
};
