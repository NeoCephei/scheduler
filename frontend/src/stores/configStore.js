import { create } from 'zustand';
import { AreasAPI, ShiftsAPI, ProfilesAPI } from '../lib/api';

export const useConfigStore = create((set, get) => ({
  areas: [],
  shifts: [],
  profiles: [],
  loading: false,
  error: null,

  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const [areas, shifts, profiles] = await Promise.all([
        AreasAPI.getAll(),
        ShiftsAPI.getAll(),
        ProfilesAPI.getAll()
      ]);
      set({ areas, shifts, profiles, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // --- Areas ---
  addArea: async (data) => {
    const newArea = await AreasAPI.create(data);
    set({ areas: [...get().areas, newArea] });
  },
  updateArea: async (id, data) => {
    const updated = await AreasAPI.update(id, data);
    set({ areas: get().areas.map(a => a.id === id ? updated : a) });
  },
  deleteArea: async (id) => {
    await AreasAPI.delete(id);
    set({ areas: get().areas.filter(a => a.id !== id) });
  },

  // --- Shifts ---
  addShift: async (data) => {
    const newShift = await ShiftsAPI.create(data);
    set({ shifts: [...get().shifts, newShift] });
  },
  updateShift: async (id, data) => {
    const updated = await ShiftsAPI.update(id, data);
    set({ shifts: get().shifts.map(s => s.id === id ? updated : s) });
  },
  deleteShift: async (id) => {
    await ShiftsAPI.delete(id);
    set({ shifts: get().shifts.filter(s => s.id !== id) });
  },

  // --- Profiles ---
  addProfile: async (data) => {
    const newProfile = await ProfilesAPI.create(data);
    set({ profiles: [...get().profiles, newProfile] });
  },
  updateProfile: async (id, data) => {
    const updated = await ProfilesAPI.update(id, data);
    set({ profiles: get().profiles.map(p => p.id === id ? updated : p) });
  },
  deleteProfile: async (id) => {
    await ProfilesAPI.delete(id);
    set({ profiles: get().profiles.filter(p => p.id !== id) });
  }
}));
