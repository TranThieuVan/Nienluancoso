import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const AdminNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const logout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
    };

    // Hàm kiểm tra route active
    const isActive = (path) => {
        return location.pathname === path ? 'bg-green-200' : '';
    };

    return (
        <aside className="fixed top-0 left-0 w-64 h-screen bg-white text-black flex flex-col justify-between shadow-md transition duration-200 z-50">
            <div>
                <div className="text-xl font-bold px-6 py-4 border-b border-gray-300">
                    <Link to="/admin" className="flex items-center gap-2">
                        <FontAwesomeIcon icon={['fas', 'book']} />
                        <span>QUẢN LÝ</span>
                    </Link>
                </div>

                <nav className="flex flex-col gap-2 mt-4 px-4 text-base">
                    <Link to="/admin/books" className={`flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/books')}`}>
                        <FontAwesomeIcon icon={['fas', 'book']} />
                        Sách
                    </Link>

                    <Link to="/admin/orders" className={`flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/orders')}`}>
                        <FontAwesomeIcon icon={['fas', 'box-open']} />
                        Đơn hàng
                    </Link>

                    <Link to="/admin/revenue" className={`flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/revenue')}`}>
                        <FontAwesomeIcon icon={['fas', 'chart-line']} />
                        Doanh thu
                    </Link>

                    <Link to="/admin/users" className={`flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/users')}`}>
                        <FontAwesomeIcon icon={['fas', 'user']} />
                        Người dùng
                    </Link>

                    <Link to="/admin/comments" className={`flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/comments')}`}>
                        <FontAwesomeIcon icon={['fas', 'comments']} />
                        Bình luận
                    </Link>

                    <Link to="/admin/messages" className={`flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200 ${isActive('/admin/messages')}`}>
                        <FontAwesomeIcon icon={['fas', 'envelope']} />
                        Tin nhắn
                    </Link>
                </nav>
            </div>

            <div className="px-4 py-4 border-t border-gray-300">
                <p className="text-sm mb-2">Xin chào, <strong>Admin</strong></p>
                <button
                    onClick={logout}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm flex items-center justify-center gap-2"
                >
                    <FontAwesomeIcon icon={['fas', 'right-from-bracket']} />
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
};

export default AdminNavbar;