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

export const WorkersAPI = {
  getAll: () => api.get('/workers').then(res => res.data),
  getById: (id) => api.get(`/workers/${id}`).then(res => res.data),
  create: (data) => api.post('/workers', data).then(res => res.data),
  update: (id, data) => api.put(`/workers/${id}`, data).then(res => res.data),
  toggleActive: (id) => api.patch(`/workers/${id}/toggle-active`).then(res => res.data),
  delete: (id) => api.delete(`/workers/${id}`).then(res => res.data)
};

export const AbsencesAPI = {
  getByWorker: (workerId) => api.get(`/absences/worker/${workerId}`).then(res => res.data),
  getAll: () => api.get('/absences').then(res => res.data),
  create: (data) => api.post('/absences', data).then(res => res.data),
  update: (id, data) => api.put(`/absences/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/absences/${id}`).then(res => res.data)
};

export const HolidaysAPI = {
  getAll: () => api.get('/holidays').then(res => res.data),
  create: (data) => api.post('/holidays', data).then(res => res.data),
  update: (id, data) => api.put(`/holidays/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/holidays/${id}`).then(res => res.data)
};

export const CalendarAPI = {
  getMatrix: (start, end) => api.get(`/calendar?start=${start}&end=${end}`).then(res => res.data)
};

export const AssignmentsAPI = {
  createOrUpdate: (data) => api.post('/assignments', data).then(res => res.data),
  delete: (id) => api.delete(`/assignments/${id}`).then(res => res.data)
};
