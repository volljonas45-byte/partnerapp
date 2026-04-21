import api from './client';

export const timeApi = {
  list:        (params = {}) => api.get('/api/time/entries', { params }).then(r => r.data),
  create:      (data)        => api.post('/api/time/entries', data).then(r => r.data),
  update:      (id, data)    => api.put(`/api/time/entries/${id}`, data).then(r => r.data),
  delete:      (id)          => api.delete(`/api/time/entries/${id}`).then(r => r.data),

  timerActive: ()            => api.get('/api/time/timer/active').then(r => r.data),
  timerStart:  (data)        => api.post('/api/time/timer/start', data).then(r => r.data),
  timerStop:   (id)          => api.post('/api/time/timer/stop', { id }).then(r => r.data),

  summary:        ()                   => api.get('/api/time/summary').then(r => r.data),
  migrateProject: (from_name, to_name) => api.post('/api/time/migrate-project', { from_name, to_name }).then(r => r.data),
};

export const fahrtenbuchApi = {
  list:   (params = {}) => api.get('/api/time/fahrtenbuch', { params }).then(r => r.data),
  create: (data)        => api.post('/api/time/fahrtenbuch', data).then(r => r.data),
  update: (id, data)    => api.put(`/api/time/fahrtenbuch/${id}`, data).then(r => r.data),
  delete: (id)          => api.delete(`/api/time/fahrtenbuch/${id}`).then(r => r.data),
};
