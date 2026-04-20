import api from './client';

export const partnerApi = {
  // Admin
  adminStats:            ()       => api.get('/api/partner/admin/stats').then(r => r.data),
  adminListPartners:     (params) => api.get('/api/partner/admin/partners', { params }).then(r => r.data),
  adminUpdatePartner:    (id, d)  => api.put(`/api/partner/admin/partners/${id}`, d).then(r => r.data),
  adminListLeads:        (params) => api.get('/api/partner/admin/leads', { params }).then(r => r.data),
  adminCreateLead:       (data)   => api.post('/api/partner/admin/leads', data).then(r => r.data),
  adminUpdateLead:       (id, d)  => api.put(`/api/partner/admin/leads/${id}`, d).then(r => r.data),
  adminDeleteLead:       (id)     => api.delete(`/api/partner/admin/leads/${id}`).then(r => r.data),
  adminListAppointments: ()       => api.get('/api/partner/admin/appointments').then(r => r.data),
  adminUpdateAppointment:(id, d)  => api.put(`/api/partner/admin/appointments/${id}`, d).then(r => r.data),
  adminListCommissions:   (params) => api.get('/api/partner/admin/commissions', { params }).then(r => r.data),
  adminUpdateCommission:  (id, d)  => api.put(`/api/partner/admin/commissions/${id}`, d).then(r => r.data),
  adminListLeadRequests:  ()       => api.get('/api/partner/admin/lead-requests').then(r => r.data),
  adminUpdateLeadRequest: (id, d)  => api.put(`/api/partner/admin/lead-requests/${id}`, d).then(r => r.data),
};
