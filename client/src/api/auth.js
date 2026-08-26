import http from './http';

export const authApi = {
  register: (payload) => http.post('/auth/register', payload).then((r) => r.data.data),
  login: (payload) => http.post('/auth/login', payload).then((r) => r.data.data),
  verifyMfa: (payload) => http.post('/auth/mfa/verify', payload).then((r) => r.data.data),
  logout: () => http.post('/auth/logout').then((r) => r.data),
  logoutAll: () => http.post('/auth/logout-all').then((r) => r.data),
  me: () => http.get('/auth/me').then((r) => r.data.data.user),
  forgotPassword: (email) => http.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (payload) => http.post('/auth/reset-password', payload).then((r) => r.data),
  changePassword: (payload) => http.patch('/auth/password', payload).then((r) => r.data),
  setupMfa: () => http.post('/auth/mfa/setup').then((r) => r.data.data),
  confirmMfa: (code) => http.post('/auth/mfa/confirm', { code }).then((r) => r.data.data),
  disableMfa: (payload) => http.post('/auth/mfa/disable', payload).then((r) => r.data.data)
};

export default authApi;
