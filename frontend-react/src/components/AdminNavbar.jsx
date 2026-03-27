import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import { io } from 'socket.io-client';

const AdminNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

    const logout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
    };

    const isActive = (path) => {
        return location.pathname === path ? 'bg-green-200 font-medium' : '';
    };

    const fetchNotificationCounts = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return;

            const config = { headers: { Authorization: `Bearer ${token}` } };

            // 1. Đếm đơn hàng đang chờ xử lý (pending)
            const ordersRes = await axios.get('/api/admin/orders', config);
            const pendingCount = ordersRes.data.filter(o => o.status === 'pending').length;
            setPendingOrdersCount(pendingCount);

            // 2. Đếm tin nhắn chưa đọc
            const msgsRes = await axios.get('/api/messages/admin/all', config);
            const unreadCount = msgsRes.data.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
            setUnreadMessagesCount(unreadCount);

        } catch (err) {
            console.error("Lỗi lấy thông báo Navbar:", err);
        }
    };

    useEffect(() => {
        fetchNotificationCounts();
    }, [location.pathname]);

    // ✨ Lắng nghe Socket.io để nảy số Real-time chuẩn xác
    useEffect(() => {
        const socket = io('http://localhost:5000'); // Đảm bảo đúng port backend

        // Đơn hàng mới
        socket.on('new_order_admin', () => {
            fetchNotificationCounts();
        });

        // Bắt thêm sự kiện khi đơn hàng bị HỦY hoặc đổi trạng thái
        socket.on('order_updated', () => {
            fetchNotificationCounts();
        });

        // ✅ Chỉ báo tin nhắn nếu người gửi THẬC SỰ là user
        socket.on('new_message_admin', (data) => {
            if (data && data.senderRole === 'user') {
                fetchNotificationCounts();
            }
        });

        return () => socket.disconnect();
    }, []);

    return (
        <aside className="fixed top-0 left-0 w-64 h-screen bg-white text-black flex flex-col justify-between shadow-md transition duration-200 z-50">
            <div className='select-none'>
                <div className="text-xl font-bold px-6 py-4 border-b border-gray-300">
                    <Link to="/admin" className="flex items-center gap-2">
                        <FontAwesomeIcon icon={['fas', 'book']} />
                        <span>QUẢN LÝ</span>
                    </Link>
                </div>

                <nav className="flex flex-col gap-2 mt-4 px-4 text-base">
                    <Link to="/admin/books" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/books')}`}>
                        <FontAwesomeIcon icon={['fas', 'book']} className="w-5" />
                        Sách
                    </Link>

                    {/* ✨ Mục Đơn hàng */}
                    <Link to="/admin/orders" className={`flex items-center justify-between py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/orders')}`}>
                        <div className="flex items-center gap-3">
                            <FontAwesomeIcon icon={['fas', 'box-open']} className="w-5" />
                            Đơn hàng
                        </div>
                        {pendingOrdersCount > 0 && (
                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ">
                                {pendingOrdersCount}
                            </span>
                        )}
                    </Link>

                    <Link to="/admin/revenue" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/revenue')}`}>
                        <FontAwesomeIcon icon={['fas', 'chart-line']} className="w-5" />
                        Doanh thu
                    </Link>

                    <Link to="/admin/users" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/users')}`}>
                        <FontAwesomeIcon icon={['fas', 'user']} className="w-5" />
                        Người dùng
                    </Link>

                    <Link to="/admin/vouchers" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/vouchers')}`}>
                        <FontAwesomeIcon icon={['fas', 'ticket-alt']} className="w-5" />
                        Mã giảm giá
                    </Link>

                    <Link to="/admin/promotions" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/promotions')}`}>
                        <FontAwesomeIcon icon={['fas', 'bullhorn']} className="w-5" />
                        Chiến dịch giảm giá
                    </Link>

                    <Link to="/admin/comments" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/comments')}`}>
                        <FontAwesomeIcon icon={['fas', 'comments']} className="w-5" />
                        Bình luận
                    </Link>

                    {/* ✨ Mục Tin nhắn */}
                    <Link to="/admin/messages" className={`flex items-center justify-between py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/messages')}`}>
                        <div className="flex items-center gap-3">
                            <FontAwesomeIcon icon={['fas', 'envelope']} className="w-5" />
                            Tin nhắn
                        </div>
                        {unreadMessagesCount > 0 && (
                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ">
                                {unreadMessagesCount}
                            </span>
                        )}
                    </Link>
                </nav>
            </div>

            <div className="px-4 py-4 border-t border-gray-300">
                <p className="text-sm mb-2">Xin chào, <strong>Admin</strong></p>
                <button
                    onClick={logout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
                >
                    <FontAwesomeIcon icon={['fas', 'right-from-bracket']} />
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
};

export default AdminNavbar;