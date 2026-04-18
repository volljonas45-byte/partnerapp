import api from './client';

export const financeApi = {
  // Setup
  getSetup:    ()       => api.get('/api/finance/setup').then(r => r.data),
  saveSetup:   (data)   => api.post('/api/finance/setup', data).then(r => r.data),

  // Categories
  listCategories:   ()         => api.get('/api/finance/categories').then(r => r.data),
  createCategory:   (data)     => api.post('/api/finance/categories', data).then(r => r.data),
  updateCategory:   (id, data) => api.put(`/api/finance/categories/${id}`, data).then(r => r.data),
  deleteCategory:   (id)       => api.delete(`/api/finance/categories/${id}`).then(r => r.data),

  // Transactions
  listTransactions: (params)   => api.get('/api/finance/transactions', { params }).then(r => r.data),
  createTransaction:(data)     => api.post('/api/finance/transactions', data).then(r => r.data),
  updateTransaction:(id, data) => api.put(`/api/finance/transactions/${id}`, data).then(r => r.data),
  deleteTransaction:(id)       => api.delete(`/api/finance/transactions/${id}`).then(r => r.data),

  // Stats & Reports
  getStats:      (params) => api.get('/api/finance/stats', { params }).then(r => r.data),
  getTaxSummary: (params) => api.get('/api/finance/tax-summary', { params }).then(r => r.data),
  getReport:     (params) => api.get('/api/finance/report', { params }).then(r => r.data),

  // Export
  exportCsv: (params) => {
    const qs = new URLSearchParams(params).toString();
    window.open(`/api/finance/export?${qs}`, '_blank');
  },
};
