import { useState, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export const useFavorites = () => {
    // Thay thế ref([]) bằng useState([])
    const [favorites, setFavorites] = useState([]);

    // Dùng useCallback để tránh việc hàm bị tạo lại (re-create) mỗi lần component render
    const fetchFavorites = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await axios.get('/api/favorites', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Lấy danh sách ID
            setFavorites(res.data.map(b => b._id));
            return res.data; // Trả về data sách nếu cần dùng ở UI
        } catch (err) {
            console.error('Lỗi khi lấy favorites:', err);
        }
    }, []);

    const isFavorite = useCallback((bookId) => {
        return favorites.includes(bookId);
    }, [favorites]);

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
                // Xóa khỏi danh sách yêu thích
                await axios.delete(`/api/favorites/remove/${book._id}`, { headers });

                // Cập nhật state cục bộ bằng callback để luôn lấy state mới nhất
                setFavorites((prev) => prev.filter(id => id !== book._id));

                if (removeCallback) removeCallback(book._id); // Dùng để xóa khỏi UI nếu đang ở trang Yêu thích

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
                // Thêm vào danh sách yêu thích
                await axios.post('/api/favorites/add', { bookId: book._id }, { headers });

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

    return { favorites, fetchFavorites, toggleFavorite, isFavorite };
};