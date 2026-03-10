import axios from 'axios';
import Swal from 'sweetalert2';
import { useCartStore } from './cartStore';

export const useCart = () => {
    const incrementCartCount = useCartStore((state) => state.incrementCartCount);

    // ✅ Nhận thêm tham số quantity, cho mặc định là 1 nếu gọi từ các trang không có nút chọn số lượng
    const addToCart = async (book, quantity = 1) => {
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
                { bookId: book._id, quantity: quantity }, // ✅ Gửi đúng số lượng khách chọn lên Server
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // ✅ Cập nhật con số trên Header đúng với số lượng vừa thêm
            incrementCartCount(quantity);

            Swal.fire({
                toast: true,
                icon: 'success',
                title: `Đã thêm ${quantity} sản phẩm vào giỏ`,
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