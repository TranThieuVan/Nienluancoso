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
        window.dispatchEvent(new Event('storage')); // ✅ Thêm dòng này
    },

    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        // Nếu trong dự án có dùng 'adminToken', bạn nên remove luôn ở đây cho chắc chắn:
        localStorage.removeItem('adminToken');

        // ✅ Thêm dòng này để xoá lịch sử sách đã xem khi đăng xuất
        localStorage.removeItem('recentlyViewed');

        set({ user: null, token: null });
        window.dispatchEvent(new Event('storage')); // ✅ Giữ nguyên dòng này
    }, // ✅ SỬA Ở ĐÂY: Chỉ dùng dấu phẩy, KHÔNG đóng ngoặc nhọn } của store tại đây

    loadFromLocalStorage: () => {
        set({
            user: JSON.parse(localStorage.getItem('user')) || null,
            token: localStorage.getItem('token') || null,
        });
    },

    setUser: (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        set({ user: userData });
    }
})); // ✅ Đây mới là chỗ đóng ngoặc cuối cùng của hàm create