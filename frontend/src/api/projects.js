import api from './client';

export const projectsApi = {
  list:   ()           => api.get('/api/projects'),
  get:    (id)         => api.get(`/api/projects/${id}`),
  create: (data)       => api.post('/api/projects', data).then(r => r.data),
  update: (id, data)   => api.put(`/api/projects/${id}`, data),
  delete: (id)         => api.delete(`/api/projects/${id}`),

  // Tasks
  getTasks:   (id)              => api.get(`/api/projects/${id}/tasks`),
  createTask: (id, data)        => api.post(`/api/projects/${id}/tasks`, data).then(r => r.data),
  updateTask: (id, taskId, data) => api.patch(`/api/projects/${id}/tasks/${taskId}`, data),
  deleteTask: (id, taskId)      => api.delete(`/api/projects/${id}/tasks/${taskId}`),

  // Checklist
  toggleChecklist:  (id, key, checked) => api.patch(`/api/projects/${id}/checklist/${key}`, { checked }),
  addChecklist:     (id, label)        => api.post(`/api/projects/${id}/checklist`, { label }).then(r => r.data),
  deleteChecklist:  (id, key)          => api.delete(`/api/projects/${id}/checklist/${key}`),

  // Linked documents
  getInvoices: (id) => api.get(`/api/projects/${id}/invoices`),
  getQuotes:   (id) => api.get(`/api/projects/${id}/quotes`),

  // Credentials (external secure links only)
  getCredentials:   (id)               => api.get(`/api/projects/${id}/credentials`),
  createCredential: (id, data)         => api.post(`/api/projects/${id}/credentials`, data).then(r => r.data),
  updateCredential: (id, credId, data) => api.patch(`/api/projects/${id}/credentials/${credId}`, data),
  deleteCredential: (id, credId)       => api.delete(`/api/projects/${id}/credentials/${credId}`),

  // Notes
  getNotes:   (id)        => api.get(`/api/projects/${id}/notes`),
  addNote:    (id, data)  => api.post(`/api/projects/${id}/notes`, data).then(r => r.data),
  deleteNote: (id, nId)   => api.delete(`/api/projects/${id}/notes/${nId}`),

  // Activity log
  getActivity: (id) => api.get(`/api/projects/${id}/activity`),
};
