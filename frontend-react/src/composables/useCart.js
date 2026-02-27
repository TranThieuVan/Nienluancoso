import axios from 'axios';
import Swal from 'sweetalert2';
import { useCartStore } from './cartStore'; // Đường dẫn tới file store Zustand bạn vừa tạo

export const useCart = () => {
    // Lấy hàm incrementCartCount từ Zustand Store
    const incrementCartCount = useCartStore((state) => state.incrementCartCount);

    const addToCart = async (book) => {
        const token = localStorage.getItem('token');

        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Vui lòng đăng nhập để thêm vào giỏ hàng!',
                confirmButtonColor: '#8B4513',
            });
            return;
        }

        try {
            await axios.post(
                '/api/cart/add',
                { bookId: book._id, quantity: 1 },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Gọi hàm tăng số lượng giỏ hàng
            incrementCartCount(1);

            Swal.fire({
                toast: true,
                icon: 'success',
                title: 'Đã thêm vào giỏ',
                position: 'bottom-end',
                showConfirmButton: false,
                timer: 2000,
                background: '#fff',
                color: '#333',
                iconColor: '#8B4513',
            });
        } catch (err) {
            console.error('Lỗi khi thêm vào giỏ hàng:', err);
            Swal.fire({
                icon: 'error',
                title: 'Không thể thêm vào giỏ hàng',
                text: err?.response?.data?.message || 'Vui lòng thử lại sau',
                confirmButtonColor: '#8B4513',
            });
        }
    };

    return { addToCart };
};