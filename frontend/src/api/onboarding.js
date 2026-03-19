import api from './client';
import axios from 'axios';

// Unauthenticated client for public routes (no 401 redirect)
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

export const onboardingApi = {
  // Templates
  listTemplates:  ()              => api.get('/api/onboarding/templates'),
  getTemplate:    (id)            => api.get(`/api/onboarding/templates/${id}`),
  createTemplate: (data)          => api.post('/api/onboarding/templates', data).then(r => r.data),
  updateTemplate: (id, data)      => api.put(`/api/onboarding/templates/${id}`, data),
  deleteTemplate: (id)            => api.delete(`/api/onboarding/templates/${id}`),

  // Steps
  addStep:      (id, data)         => api.post(`/api/onboarding/templates/${id}/steps`, data).then(r => r.data),
  updateStep:   (id, stepId, data) => api.put(`/api/onboarding/templates/${id}/steps/${stepId}`, data),
  deleteStep:   (id, stepId)       => api.delete(`/api/onboarding/templates/${id}/steps/${stepId}`),
  reorderSteps: (id, stepIds)      => api.patch(`/api/onboarding/templates/${id}/steps/reorder`, { stepIds }),

  // Flows
  listFlows:  ()     => api.get('/api/onboarding/flows'),
  getFlow:    (id)   => api.get(`/api/onboarding/flows/${id}`),
  createFlow: (data) => api.post('/api/onboarding/flows', data).then(r => r.data),
  deleteFlow: (id)   => api.delete(`/api/onboarding/flows/${id}`),

  // Public (no auth)
  getPublicFlow: (token, pin) =>
    publicApi.get(`/api/onboarding/public/${token}`, {
      headers: pin ? { 'x-onboarding-pin': pin } : {},
    }),
  submitStep: (token, step_index, response, pin) =>
    publicApi.patch(`/api/onboarding/public/${token}/step`, { step_index, response }, {
      headers: pin ? { 'x-onboarding-pin': pin } : {},
    }),
};
