import { create } from 'zustand';

export const useSearchStore = create((set) => ({
    // --- STATE ---
    query: '',

    // --- ACTIONS ---
    setQuery: (q) => set({ query: q }),
}));