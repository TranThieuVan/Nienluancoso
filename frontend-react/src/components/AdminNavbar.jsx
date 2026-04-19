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

    // ✅ LẤY ROLE TỪ LOCAL STORAGE (Logic hỗ trợ đa key)
    const userRole = localStorage.getItem('userRole') || localStorage.getItem('role') || 'employee';

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('role');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'bg-green-200 font-medium' : '';

    const fetchNotificationCounts = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // 1. Lấy số lượng đơn hàng (Cả Admin và Staff đều được xem)
            axios.get('/api/admin/orders', config)
                .then(res => {
                    const ordersArray = res.data.orders || res.data || [];
                    setPendingOrdersCount(ordersArray.filter(o => o.status === 'pending').length);
                })
                .catch(err => console.error("Lỗi fetch đơn hàng:", err.response?.status));

            // 2. Lấy số lượng tin nhắn (Cần verifyStaff ở Backend mới hết lỗi 403)
            axios.get('/api/messages/admin/all', config)
                .then(res => {
                    const msgsArray = res.data.conversations || res.data || [];
                    setUnreadMessagesCount(msgsArray.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0));
                })
                .catch(err => {
                    // Nếu vẫn bị 403 thì set bằng 0 để tránh hiện lỗi đỏ console
                    if (err.response?.status === 403) {
                        setUnreadMessagesCount(0);
                    }
                });

        } catch (err) {
            console.error("Lỗi hệ thống Navbar:", err);
        }
    };

    useEffect(() => { fetchNotificationCounts(); }, [location.pathname]);

    useEffect(() => {
        const socket = io('http://localhost:5000');
        socket.on('new_order_admin', () => fetchNotificationCounts());
        socket.on('order_updated', () => fetchNotificationCounts());
        socket.on('new_message_admin', (data) => {
            if (data && data.senderRole === 'user') fetchNotificationCounts();
        });
        return () => socket.disconnect();
    }, []);

    return (
        <aside className="fixed top-0 left-0 w-64 h-screen bg-white text-black flex flex-col justify-between shadow-md transition duration-200 z-50">
            <div className='select-none overflow-y-auto'>
                <div className="text-xl font-bold px-6 py-4 border-b border-gray-300">
                    {/* ✅ Điều hướng Logo: Admin về Dashboard, Employee về Đơn hàng */}
                    <Link to={userRole === 'admin' ? "/admin" : "/admin/orders"} className="flex items-center gap-2">
                        <FontAwesomeIcon icon={['fas', 'book']} />
                        <span>QUẢN LÝ</span>
                    </Link>
                </div>

                <nav className="flex flex-col gap-2 mt-4 px-4 text-base mb-6">
                    {/* ─── NHÓM QUẢN TRỊ (CHỈ ADMIN THẤY) ─── */}
                    {userRole === 'admin' && (
                        <>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1 mt-2">Báo cáo & Thống kê</p>
                            <Link to="/admin" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${location.pathname === '/admin' ? 'bg-green-200 font-medium' : ''}`}>
                                <FontAwesomeIcon icon={['fas', 'chart-pie']} className="w-5" />Tổng quan
                            </Link>
                            <Link to="/admin/revenue" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/revenue')}`}>
                                <FontAwesomeIcon icon={['fas', 'chart-line']} className="w-5" />Doanh thu
                            </Link>
                        </>
                    )}

                    {/* ─── NHÓM VẬN HÀNH (AI CŨNG THẤY) ─── */}
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-1 mt-4">Vận hành & Dữ liệu</p>

                    <Link to="/admin/orders" className={`flex items-center justify-between py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/orders')}`}>
                        <div className="flex items-center gap-3"><FontAwesomeIcon icon={['fas', 'box-open']} className="w-5" />Đơn hàng</div>
                        {pendingOrdersCount > 0 && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ">{pendingOrdersCount}</span>}
                    </Link>

                    <Link to="/admin/books" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/books')}`}>
                        <FontAwesomeIcon icon={['fas', 'book']} className="w-5" />Kho Sách
                    </Link>

                    <Link to="/admin/users" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/users')}`}>
                        <FontAwesomeIcon icon={['fas', 'users']} className="w-5" />Người dùng
                    </Link>

                    <Link to="/admin/vouchers" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/vouchers')}`}>
                        <FontAwesomeIcon icon={['fas', 'ticket-alt']} className="w-5" />Mã giảm giá
                    </Link>

                    <Link to="/admin/promotions" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/promotions')}`}>
                        <FontAwesomeIcon icon={['fas', 'bullhorn']} className="w-5" />Chiến dịch KM
                    </Link>

                    <Link to="/admin/comments" className={`flex items-center gap-3 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/comments')}`}>
                        <FontAwesomeIcon icon={['fas', 'comments']} className="w-5" />Bình luận
                    </Link>

                    <Link to="/admin/messages" className={`flex items-center justify-between py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/messages')}`}>
                        <div className="flex items-center gap-3"><FontAwesomeIcon icon={['fas', 'envelope']} className="w-5" />Tin nhắn</div>
                        {unreadMessagesCount > 0 && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ">{unreadMessagesCount}</span>}
                    </Link>
                </nav>
            </div>

            <div className="px-4 py-4 border-t border-gray-300 bg-gray-50">
                <p className="text-sm mb-3 italic">Quyền: <strong>{userRole.toUpperCase()}</strong></p>
                <button onClick={logout} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <FontAwesomeIcon icon={['fas', 'right-from-bracket']} />
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
};

export default AdminNavbar;