import { create } from 'zustand';
import { WorkersAPI, AbsencesAPI } from '../lib/api';

export const useStaffStore = create((set, get) => ({
  workers: [],
  absences: [], // Global absences
  workersMap: {},
  loading: false,
  absencesLoading: false,
  absencesLoaded: false,
  error: null,

  fetchWorkers: async () => {
    if (get().workers.length > 0 || get().loading) return;
    set({ loading: true, error: null });
    try {
      const workers = await WorkersAPI.getAll();
      const workersMap = {};
      workers.forEach(w => workersMap[w.id] = w);
      set({ workers, workersMap, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Force refresh (used after mutations)
  refreshWorkers: async () => {
    set({ loading: true, error: null });
    const workers = await WorkersAPI.getAll();
    const workersMap = {};
    workers.forEach(w => workersMap[w.id] = w);
    set({ workers, workersMap, loading: false });
  },

  addWorker: async (data) => {
    const newWorker = await WorkersAPI.create(data);
    const updatedWorkers = [...get().workers, newWorker];
    const workersMap = {};
    updatedWorkers.forEach(w => workersMap[w.id] = w);
    set({ workers: updatedWorkers, workersMap });
    return newWorker;
  },

  updateWorker: async (id, data) => {
    const updated = await WorkersAPI.update(id, data);
    const updatedWorkers = get().workers.map(w => w.id === id ? updated : w);
    const workersMap = {};
    updatedWorkers.forEach(w => workersMap[w.id] = w);
    set({ workers: updatedWorkers, workersMap });
    return updated;
  },

  toggleWorkerActive: async (id) => {
    const updated = await WorkersAPI.toggleActive(id);
    const updatedWorkers = get().workers.map(w => w.id === id ? { ...w, isActive: updated.isActive } : w);
    const workersMap = {};
    updatedWorkers.forEach(w => workersMap[w.id] = w);
    set({ workers: updatedWorkers, workersMap });
  },

  deleteWorker: async (id) => {
    await WorkersAPI.delete(id);
    const updatedWorkers = get().workers.filter(w => w.id !== id);
    const workersMap = {};
    updatedWorkers.forEach(w => workersMap[w.id] = w);
    set({ workers: updatedWorkers, workersMap });
  },

  // Global Absences
  fetchGlobalAbsences: async () => {
    if (get().absencesLoading) return;
    set({ absencesLoading: true, error: null });
    try {
      if (get().workers.length === 0) {
        const workers = await WorkersAPI.getAll();
        const workersMap = {};
        workers.forEach(w => workersMap[w.id] = w);
        set({ workers, workersMap });
      }
      const absences = await AbsencesAPI.getAll();
      set({ absences, absencesLoaded: true, absencesLoading: false });
    } catch (error) {
      set({ error: error.message, absencesLoading: false });
    }
  },

  refreshGlobalAbsences: async () => {
    set({ absencesLoading: true, error: null });
    try {
      if (get().workers.length === 0) {
        const workers = await WorkersAPI.getAll();
        const workersMap = {};
        workers.forEach(w => workersMap[w.id] = w);
        set({ workers, workersMap });
      }
      const absences = await AbsencesAPI.getAll();
      set({ absences, absencesLoaded: true, absencesLoading: false });
    } catch (error) {
      set({ error: error.message, absencesLoading: false });
    }
  },

  // Absences (managed locally per-worker, not cached globally)
  createAbsence: async (data) => {
    return await AbsencesAPI.create(data);
  },

  updateAbsence: async (id, data) => {
    return await AbsencesAPI.update(id, data);
  },

  deleteAbsence: async (id) => {
    return await AbsencesAPI.delete(id);
  }
}));
