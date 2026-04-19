import api from './client';

export const partnerApi = {
  // Auth
  login:   (data) => api.post('/partner/login', data).then(r => r.data),
  apply:   (data) => api.post('/partner/apply', data).then(r => r.data),
  me:      ()     => api.get('/partner/me').then(r => r.data),

  // Leads (partner)
  listLeads:  ()       => api.get('/partner/leads').then(r => r.data),
  createLead: (data)   => api.post('/partner/leads', data).then(r => r.data),
  updateLead: (id, d)  => api.put(`/partner/leads/${id}`, d).then(r => r.data),
  listPool:   ()       => api.get('/partner/leads/pool').then(r => r.data),
  claimLead:  (id)     => api.post(`/partner/leads/${id}/claim`).then(r => r.data),
  addCallLog: (id, d)  => api.post(`/partner/leads/${id}/calllog`, d).then(r => r.data),
  getCallLog: (id)     => api.get(`/partner/leads/${id}/calllog`).then(r => r.data),

  // Appointments (partner)
  listAppointments:  ()       => api.get('/partner/appointments').then(r => r.data),
  createAppointment: (data)   => api.post('/partner/appointments', data).then(r => r.data),
  updateAppointment: (id, d)  => api.put(`/partner/appointments/${id}`, d).then(r => r.data),

  // Commissions (partner)
  listCommissions: () => api.get('/partner/commissions').then(r => r.data),

  // Admin
  adminStats:           ()       => api.get('/partner/admin/stats').then(r => r.data),
  adminListPartners:    (params) => api.get('/partner/admin/partners', { params }).then(r => r.data),
  adminUpdatePartner:   (id, d)  => api.put(`/partner/admin/partners/${id}`, d).then(r => r.data),
  adminListLeads:       (params) => api.get('/partner/admin/leads', { params }).then(r => r.data),
  adminCreateLead:      (data)   => api.post('/partner/admin/leads', data).then(r => r.data),
  adminUpdateLead:      (id, d)  => api.put(`/partner/admin/leads/${id}`, d).then(r => r.data),
  adminDeleteLead:      (id)     => api.delete(`/partner/admin/leads/${id}`).then(r => r.data),
  adminListAppointments: ()      => api.get('/partner/admin/appointments').then(r => r.data),
  adminUpdateAppointment:(id,d)  => api.put(`/partner/admin/appointments/${id}`, d).then(r => r.data),
  adminListCommissions: (params) => api.get('/partner/admin/commissions', { params }).then(r => r.data),
  adminUpdateCommission:(id, d)  => api.put(`/partner/admin/commissions/${id}`, d).then(r => r.data),
};
