import api from './client';

export const planningApi = {
  // KPIs
  listKpis:    ()         => api.get('/api/planning/kpis').then(r => r.data),
  createKpi:   (data)     => api.post('/api/planning/kpis', data).then(r => r.data),
  updateKpi:   (id, data) => api.put(`/api/planning/kpis/${id}`, data).then(r => r.data),
  deleteKpi:   (id)       => api.delete(`/api/planning/kpis/${id}`).then(r => r.data),

  // Decisions
  listDecisions:  ()         => api.get('/api/planning/decisions').then(r => r.data),
  createDecision: (data)     => api.post('/api/planning/decisions', data).then(r => r.data),
  updateDecision: (id, data) => api.put(`/api/planning/decisions/${id}`, data).then(r => r.data),
  deleteDecision: (id)       => api.delete(`/api/planning/decisions/${id}`).then(r => r.data),

  // Tasks
  listTasks:   (params)   => api.get('/api/planning/tasks', { params }).then(r => r.data),
  createTask:  (data)     => api.post('/api/planning/tasks', data).then(r => r.data),
  updateTask:  (id, data) => api.put(`/api/planning/tasks/${id}`, data).then(r => r.data),
  deleteTask:  (id)       => api.delete(`/api/planning/tasks/${id}`).then(r => r.data),

  // Feedback
  listFeedback:   (params) => api.get('/api/planning/feedback', { params }).then(r => r.data),
  listWeeks:      ()       => api.get('/api/planning/feedback/weeks').then(r => r.data),
  upsertFeedback: (data)   => api.post('/api/planning/feedback', data).then(r => r.data),
  updateFeedback: (id, data) => api.put(`/api/planning/feedback/${id}`, data).then(r => r.data),
};
