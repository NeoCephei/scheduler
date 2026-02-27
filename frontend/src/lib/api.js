import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

export const AreasAPI = {
  getAll: () => api.get('/areas').then(res => res.data),
  create: (data) => api.post('/areas', data).then(res => res.data),
  update: (id, data) => api.put(`/areas/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/areas/${id}`).then(res => res.data)
};

export const ShiftsAPI = {
  getAll: () => api.get('/shifts').then(res => res.data),
  create: (data) => api.post('/shifts', data).then(res => res.data),
  update: (id, data) => api.put(`/shifts/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/shifts/${id}`).then(res => res.data)
};

export const ProfilesAPI = {
  getAll: () => api.get('/profiles').then(res => res.data),
  create: (data) => api.post('/profiles', data).then(res => res.data),
  update: (id, data) => api.put(`/profiles/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/profiles/${id}`).then(res => res.data)
};
