import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
    // --- STATE ---
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,

    // --- GETTERS ---
    // Trong Zustand, getters thường được viết dưới dạng function trả về giá trị
    isLoggedIn: () => !!get().token,
    isAdmin: () => get().user?.role === 'admin',
    isUser: () => get().user?.role === 'user',

    // --- ACTIONS ---
    login: (userData, token) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        set({ user: userData, token });
    },

    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // Nếu trong dự án có dùng 'adminToken', bạn nên remove luôn ở đây cho chắc chắn:
        localStorage.removeItem('adminToken');

        set({ user: null, token: null });
    },

    loadFromLocalStorage: () => {
        set({
            user: JSON.parse(localStorage.getItem('user')) || null,
            token: localStorage.getItem('token') || null,
        });
    }
}));