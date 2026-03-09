import { create } from 'zustand';
import { CalendarAPI, AssignmentsAPI } from '../lib/api';

export const useCalendarStore = create((set, get) => ({
  matrixData: [],
  loading: false,
  error: null,
  
  // Controls
  viewMode: 'week', // 'week' or 'month'
  groupMode: 'shift', // 'shift' or 'area'
  currentDate: new Date(), // Represents the anchor date for calculations
  
  // Helpers to get YYYY-MM-DD
  formatDate: (dateObj) => {
    return dateObj.toISOString().split('T')[0];
  },

  // State setters
  setViewMode: (mode) => {
    if (get().viewMode !== mode) {
      set({ viewMode: mode });
      get().fetchMatrix();
    }
  },
  setGroupMode: (mode) => set({ groupMode: mode }),
  setCurrentDate: (date) => set({ currentDate: date }),
  goNext: () => {
    const cur = new Date(get().currentDate);
    if (get().viewMode === 'week') {
      cur.setDate(cur.getDate() + 7);
    } else {
      cur.setMonth(cur.getMonth() + 1);
    }
    set({ currentDate: cur });
    get().fetchMatrix();
  },
  goPrev: () => {
    const cur = new Date(get().currentDate);
    if (get().viewMode === 'week') {
      cur.setDate(cur.getDate() - 7);
    } else {
      cur.setMonth(cur.getMonth() - 1);
    }
    set({ currentDate: cur });
    get().fetchMatrix();
  },
  goToday: () => {
    set({ currentDate: new Date(), loading: false }); // Reset loading so fetchMatrix doesn't trip
    get().fetchMatrix();
  },

  getStartEndDates: () => {
    const curDate = new Date(get().currentDate);
    let start = new Date(curDate);
    let end = new Date(curDate);

    if (get().viewMode === 'week') {
      // Find Monday of this week
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
      start.setDate(diff);
      
      // Sunday
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else {
      // Find 1st of month
      start = new Date(curDate.getFullYear(), curDate.getMonth(), 1);
      // Find last of month
      end = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 0);
      
      // In monthly view, the grid scrolls horizontally infinitely, we don't need to pad to complete weeks.
      // So no diffStart or diffEnd padding here.
    }
    
    return {
      startStr: get().formatDate(start),
      endStr: get().formatDate(end),
      startDateObj: start,
      endDateObj: end
    };
  },

  fetchMatrix: async () => {
    if (get().loading) return; // Prevent double fetches from React StrictMode
    set({ loading: true, error: null });
    try {
      const { startStr, endStr } = get().getStartEndDates();
      const data = await CalendarAPI.getMatrix(startStr, endStr);
      set({ matrixData: data, loading: false });
    } catch (error) {
      console.error("Calendar Engine Error:", error);
      set({ error: error.message, loading: false });
    }
  },

  // Manual Assignments
  updateCellOverride: async (profileId, date, workerId, dateEnd) => {
    // Optimistic UI update could go here, but since it's local sqlite, refetching is instant
    try {
      await AssignmentsAPI.createOrUpdate({ profileId, date, workerId, dateEnd });
      await get().fetchMatrix();
    } catch(err) {
      console.error(err);
    }
  },
  
  deleteOverride: async (assignmentId) => {
    try {
      await AssignmentsAPI.delete(assignmentId);
      await get().fetchMatrix();
    } catch(err) {
      console.error(err);
    }
  }

}));
