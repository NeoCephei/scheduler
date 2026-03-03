import { create } from 'zustand';
import { TraineesAPI } from '../lib/api';

export const useTraineeStore = create((set, get) => ({
  trainees: [], // Represents traineeOperations
  loading: false,
  error: null,
  loaded: false,

  fetchTrainees: async (force = false) => {
    if ((get().loaded && !force) || get().loading) return;
    set({ loading: true, error: null });
    try {
      const trainees = await TraineesAPI.getAll();
      set({ trainees, loading: false, loaded: true });
    } catch (error) {
      set({ error: error.message, loading: false }); // Ensure standard handling
    }
  },

  createTrainee: async (data) => {
    const newTrainee = await TraineesAPI.create(data);
    set(state => ({ trainees: [...state.trainees, newTrainee] }));
    return newTrainee;
  },

  updateTrainee: async (id, data) => {
    const updated = await TraineesAPI.update(id, data);
    set(state => ({
      trainees: state.trainees.map(t => t.id === id ? { ...t, ...updated } : t)
    }));
    return updated;
  },

  deleteTrainee: async (id) => {
    await TraineesAPI.delete(id);
    set(state => ({
      trainees: state.trainees.filter(t => t.id !== id)
    }));
  }
}));
