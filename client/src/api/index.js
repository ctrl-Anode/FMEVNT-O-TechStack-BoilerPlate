import http from './http';

export const usersApi = {
  list: (params) => http.get('/users', { params }).then((r) => r.data),
  get: (id) => http.get(`/users/${id}`).then((r) => r.data.data),
  updateProfile: (payload) => http.patch('/users/me', payload).then((r) => r.data.data),
  create: (payload) => http.post('/users', payload).then((r) => r.data.data),
  update: (id, payload) => http.patch(`/users/${id}`, payload).then((r) => r.data.data),
  remove: (id) => http.delete(`/users/${id}`).then((r) => r.data)
};

export const rolesApi = {
  list: () => http.get('/roles').then((r) => r.data.data),
  permissions: () => http.get('/roles/permissions').then((r) => r.data.data),
  create: (payload) => http.post('/roles', payload).then((r) => r.data.data),
  update: (id, payload) => http.patch(`/roles/${id}`, payload).then((r) => r.data.data),
  remove: (id) => http.delete(`/roles/${id}`).then((r) => r.data)
};

export const uploadsApi = {
  uploadAvatar: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return http
      .post('/uploads/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) =>
          onProgress?.(Math.round((event.loaded * 100) / (event.total || file.size)))
      })
      .then((r) => r.data.data);
  },
  mine: () => http.get('/uploads/me').then((r) => r.data.data),
  remove: (id) => http.delete(`/uploads/${id}`).then((r) => r.data)
};

export const notificationsApi = {
  feed: (params) => http.get('/notifications/me', { params }).then((r) => r.data),
  markRead: (id) => http.patch(`/notifications/${id}/read`).then((r) => r.data),
  send: (payload) => http.post('/notifications/send', payload).then((r) => r.data)
};

export const statsApi = {
  overview: (params) => http.get('/stats/overview', { params }).then((r) => r.data.data)
};

export const searchApi = {
  users: (params) => http.get('/search/users', { params }).then((r) => r.data)
};
