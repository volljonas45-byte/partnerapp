import api from './client';

export const invoicesApi = {
  list:         ()           => api.get('/api/invoices'),
  stats:        ()           => api.get('/api/invoices/stats'),
  revenueChart: ()           => api.get('/api/invoices/revenue-chart'),
  get:          (id)         => api.get(`/api/invoices/${id}`),
  create:       (data)       => api.post('/api/invoices', data).then(r => r.data),
  update:       (id, data)   => api.put(`/api/invoices/${id}`, data),
  updateStatus: (id, data)   => api.patch(`/api/invoices/${id}/status`, data),
  send:         (id)         => api.post(`/api/invoices/${id}/send`),
  delete:       (id)         => api.delete(`/api/invoices/${id}`),

  // New actions
  duplicate: (id)           => api.post(`/api/invoices/${id}/duplicate`),
  storno:    (id)           => api.post(`/api/invoices/${id}/storno`),

  // Payments
  getPayments:   (id)        => api.get(`/api/invoices/${id}/payments`),
  addPayment:    (id, data)  => api.post(`/api/invoices/${id}/payments`, data),
  deletePayment: (id, pid)   => api.delete(`/api/invoices/${id}/payments/${pid}`),

  // Reminders
  getReminders:   (id)       => api.get(`/api/invoices/${id}/reminders`),
  addReminder:    (id, data) => api.post(`/api/invoices/${id}/reminders`, data),
  deleteReminder: (id, rid)  => api.delete(`/api/invoices/${id}/reminders/${rid}`),

  // History
  getHistory: (id)           => api.get(`/api/invoices/${id}/history`),

  // PDF archive
  getArchive:     (id)       => api.get(`/api/invoices/${id}/archive`),

  /** Triggers a browser PDF download for the given invoice. */
  downloadPDF: async (id, invoiceNumber) => {
    const res = await api.get(`/api/invoices/${id}/pdf`, { responseType: 'blob' });
    const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** Download an archived PDF version. */
  downloadArchivedPDF: async (id, archiveId, invoiceNumber) => {
    const res = await api.get(`/api/invoices/${id}/archive/${archiveId}`, { responseType: 'blob' });
    const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber}_archiv.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
