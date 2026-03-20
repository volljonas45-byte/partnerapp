import api from './client';

export const workflowApi = {
  // Tools
  getTools:    ()           => api.get('/api/workflow/tools'),
  addTool:     (data)       => api.post('/api/workflow/tools', data).then(r => r.data),
  updateTool:  (id, data)   => api.patch(`/api/workflow/tools/${id}`, data),
  deleteTool:  (id)         => api.delete(`/api/workflow/tools/${id}`),

  // Dashboard reminders
  getDashboardReminders: () => api.get('/api/workflow/reminders'),

  // Workflow state
  get:     (projectId)       => api.get(`/api/workflow/${projectId}`),
  update:  (projectId, data) => api.put(`/api/workflow/${projectId}`, data),
  advance: (projectId)       => api.post(`/api/workflow/${projectId}/advance`),

  // Project reminders
  getReminders:    (projectId)         => api.get(`/api/workflow/${projectId}/reminders`),
  addReminder:     (projectId, data)   => api.post(`/api/workflow/${projectId}/reminders`, data).then(r => r.data),
  updateReminder:  (projectId, id, data) => api.patch(`/api/workflow/${projectId}/reminders/${id}`, data),
  deleteReminder:  (projectId, id)     => api.delete(`/api/workflow/${projectId}/reminders/${id}`),
};
