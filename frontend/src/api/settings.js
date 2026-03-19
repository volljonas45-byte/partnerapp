import api from './client';

export const settingsApi = {
  get:         ()     => api.get('/api/settings'),
  update:      (data) => api.put('/api/settings', data),
  uploadLogo:  (base64) => api.post('/api/settings/logo', { logo_base64: base64 }),
  deleteLogo:  ()     => api.delete('/api/settings/logo'),
};
