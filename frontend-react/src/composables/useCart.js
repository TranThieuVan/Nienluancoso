import axios from 'axios';
import Swal from 'sweetalert2';
import { useCartStore } from './cartStore';
import { apiUrl } from '../config/api';
export const useCart = () => {
    const incrementCartCount = useCartStore((state) => state.incrementCartCount);

    // ✅ Nhận thêm tham số quantity, cho mặc định là 1 nếu gọi từ các trang không có nút chọn số lượng
    const addToCart = async (book, quantity = 1) => {
        const token = localStorage.getItem('token');

        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Please sign in to add items to your cart.',
                confirmButtonColor: '#8B4513',
            });
            return;
        }

        try {
            await axios.post(
                apiUrl('/api/cart/add'),
                { bookId: book._id, quantity: quantity }, // ✅ Gửi đúng số lượng khách chọn lên Server
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // ✅ Cập nhật con số trên Header đúng với số lượng vừa thêm
            incrementCartCount(quantity);

            Swal.fire({
                toast: true,
                icon: 'success',
                title: `${quantity} item${quantity === 1 ? '' : 's'} added to cart`,
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
                title: 'Could not add this item to your cart.',
                text: 'Please try again.',
                confirmButtonColor: '#8B4513',
            });
        }
    };

    return { addToCart };
};