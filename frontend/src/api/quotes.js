import api from './client';

export const quotesApi = {
  list:         ()           => api.get('/api/quotes'),
  stats:        ()           => api.get('/api/quotes/stats'),
  get:          (id)         => api.get(`/api/quotes/${id}`),
  create:       (data)       => api.post('/api/quotes', data).then(r => r.data),
  update:       (id, data)   => api.put(`/api/quotes/${id}`, data),
  updateStatus: (id, data)   => api.patch(`/api/quotes/${id}/status`, data),
  convert:      (id)         => api.post(`/api/quotes/${id}/convert`),
  delete:       (id)         => api.delete(`/api/quotes/${id}`),

  downloadPDF: async (id, quoteNumber) => {
    const res  = await api.get(`/api/quotes/${id}/pdf`, { responseType: 'blob' });
    const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', `${quoteNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
