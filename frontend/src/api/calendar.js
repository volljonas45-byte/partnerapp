import api from './client';

export const calendarApi = {
  list:   (params = {}) => api.get('/api/calendar/events', { params }).then(r => r.data),
  create: (data)        => api.post('/api/calendar/events', data).then(r => r.data),
  update: (id, data)    => api.put(`/api/calendar/events/${id}`, data).then(r => r.data),
  delete: (id)          => api.delete(`/api/calendar/events/${id}`).then(r => r.data),
};
