import api from './client';

export const intakeApi = {
  // Templates
  getTemplates:    ()             => api.get('/api/intake/templates').then(r => r.data),
  createTemplate:  (data)         => api.post('/api/intake/templates', data).then(r => r.data),
  updateTemplate:  (id, data)     => api.patch(`/api/intake/templates/${id}`, data).then(r => r.data),
  deleteTemplate:  (id)           => api.delete(`/api/intake/templates/${id}`).then(r => r.data),

  // Forms
  getForms:        ()             => api.get('/api/intake').then(r => r.data),
  getInbox:        ()             => api.get('/api/intake/inbox').then(r => r.data),
  getUnreadCount:  ()             => api.get('/api/intake/unread-count').then(r => r.data),
  createForm:      (data)         => api.post('/api/intake', data).then(r => r.data),
  getForm:         (id)           => api.get(`/api/intake/${id}`).then(r => r.data),
  submitForm:      (id, responses)=> api.patch(`/api/intake/${id}/submit`, { responses }).then(r => r.data),
  markSeen:        (id)           => api.patch(`/api/intake/${id}/seen`).then(r => r.data),
  deleteForm:      (id)           => api.delete(`/api/intake/${id}`).then(r => r.data),

  // Public (no auth)
  getPublicForm:   (token)        => api.get(`/api/intake/public/${token}`).then(r => r.data),
  submitPublic:    (token, responses) => api.post(`/api/intake/public/${token}/submit`, { responses }).then(r => r.data),
};
