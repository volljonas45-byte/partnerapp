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

  listCommissions:    () => api.get('/partner/commissions').then(r => r.data),
  updateProfile:      (d) => api.put('/partner/profile', d).then(r => r.data),
  screenshotImport:   (image) => api.post('/partner/screenshot-import', { image }).then(r => r.data),
  aiChat:             (messages) => api.post('/partner/ai-chat', { messages }).then(r => r.data),
  createLeadRequest:  (d) => api.post('/partner/lead-requests', d).then(r => r.data),
  listLeadRequests:   () => api.get('/partner/lead-requests').then(r => r.data),
  demoWizard:         (d) => api.post('/partner/demo-wizard', d).then(r => r.data),
  listCustomers:      () => api.get('/partner/customers').then(r => r.data),

  // Mail
  listMails:    ()  => api.get('/partner/mail').then(r => r.data),
  sendMail:     (d) => api.post('/partner/mail/send', d).then(r => r.data),
  syncMails:    ()  => api.post('/partner/mail/sync').then(r => r.data),
  getMailAlias: ()  => api.get('/partner/mail/alias').then(r => r.data),
};
