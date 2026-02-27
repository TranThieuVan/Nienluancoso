import { create } from 'zustand';

export const useCartStore = create((set) => ({
    // --- STATE ---
    cartCount: 0,

    // --- ACTIONS ---
    setCartCount: (count) => set({ cartCount: count }),

    incrementCartCount: (delta = 1) => set((state) => ({
        cartCount: state.cartCount + delta
    })),

    decrementCartCount: (delta = 1) => set((state) => ({
        cartCount: Math.max(0, state.cartCount - delta)
    })),
}));