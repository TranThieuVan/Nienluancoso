import { createContext, useState, useCallback, useContext, useEffect, createElement } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

// 1. Khởi tạo Context (Đài phát thanh)
const FavoritesContext = createContext();

// 2. Tạo Provider (Trạm phát sóng chứa dữ liệu)
export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState([]);

    // Lấy danh sách yêu thích
    const fetchFavorites = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await axios.get('/api/favorites', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Chỉ lưu ID để các icon trái tim so sánh cho nhanh
            setFavorites(res.data.map(b => b._id));

            return res.data; // Vẫn trả về data gốc
        } catch (err) {
            console.error('Lỗi khi lấy favorites:', err);
        }
    }, []);

    // TỰ ĐỘNG GỌI 1 LẦN DUY NHẤT KHI VÀO WEB
    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    // Kiểm tra xem sách có trong danh sách yêu thích không
    const isFavorite = useCallback((bookId) => {
        return favorites.includes(bookId);
    }, [favorites]);

    // Thêm/Xóa yêu thích
    const toggleFavorite = useCallback(async (book, removeCallback = null) => {
        const token = localStorage.getItem('token');
        if (!token) {
            Swal.fire({
                toast: true,
                icon: 'warning',
                title: 'Vui lòng đăng nhập!',
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2000,
            });
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (isFavorite(book._id)) {
                // Xóa khỏi DB
                await axios.delete(`/api/favorites/remove/${book._id}`, { headers });

                // Xóa khỏi State
                setFavorites((prev) => prev.filter(id => id !== book._id));
                if (removeCallback) removeCallback(book._id);

                Swal.fire({
                    toast: true,
                    icon: 'info',
                    title: 'Đã xóa khỏi mục yêu thích',
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 2000,
                    background: '#fff',
                    color: '#333',
                    iconColor: '#888'
                });
            } else {
                // Thêm vào DB
                await axios.post('/api/favorites/add', { bookId: book._id }, { headers });

                // Thêm vào State
                setFavorites((prev) => [...prev, book._id]);

                Swal.fire({
                    toast: true,
                    icon: 'success',
                    title: 'Đã thêm vào mục yêu thích',
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 2000,
                    background: '#fff',
                    color: '#333',
                    iconColor: '#e0245e'
                });
            }
        } catch (err) {
            console.error('Lỗi toggle favorite:', err);
        }
    }, [isFavorite]);

    // ✅ ĐÃ SỬA: Dùng createElement thuần JS để chiều lòng Vite (không dùng thẻ <...>)
    return createElement(
        FavoritesContext.Provider,
        { value: { favorites, fetchFavorites, toggleFavorite, isFavorite } },
        children
    );
};

// 3. Export Hook (Giữ nguyên tên export để các file khác gọi không bị lỗi)
export const useFavorites = () => useContext(FavoritesContext);