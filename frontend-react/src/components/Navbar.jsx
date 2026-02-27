import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Components & Assets
import InputSearch from './InputSearch';
import logo from '../assets/image/logo.png';

// Stores
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../composables/cartStore';

const Navbar = () => {
    const navigate = useNavigate();

    // State quản lý UI
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [genres, setGenres] = useState([]);
    const [showGenres, setShowGenres] = useState(false);

    // Refs
    const dropdownRef = useRef(null);

    // Lấy dữ liệu từ Global Stores
    const { user, logout, token } = useAuthStore();
    const { cartCount, setCartCount } = useCartStore();

    // Đóng mở Menu & Dropdown
    const toggleMenu = () => setMenuOpen(!menuOpen);
    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
    const closeDropdown = () => setDropdownOpen(false);

    // Xử lý Avatar URL
    const getAvatarUrl = () => {
        if (!user) return '';
        // Thêm http://localhost:5000 nếu backend của bạn chạy ở cổng này
        return `http://localhost:5000/${user.avatar || 'uploads/avatars/default-user.png'}?t=${Date.now()}`;
    };

    // Lấy số lượng giỏ hàng
    const loadCartCount = async () => {
        if (!token) {
            setCartCount(0);
            return;
        }
        try {
            const { data } = await axios.get('http://localhost:5000/api/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const total = data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            setCartCount(total);
        } catch {
            setCartCount(0);
        }
    };

    // Đăng xuất
    const handleLogout = () => {
        logout(); // Hàm logout từ zustand store (sẽ tự xóa token/user localStorage)
        closeDropdown();
        navigate('/');
    };

    // Lấy danh sách thể loại
    const fetchGenres = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/books/genres');
            setGenres(data);
        } catch (err) {
            console.error('Lỗi khi tải thể loại:', err);
        }
    };

    // Điều hướng thể loại
    const goToGenre = (genre) => {
        navigate(`/books/view-all?genre=${encodeURIComponent(genre)}`);
        setShowGenres(false);
    };

    const goToGenreMobile = (genre) => {
        navigate(`/books/view-all?genre=${encodeURIComponent(genre)}`);
        setMenuOpen(false);
    };

    // Click outside để đóng dropdown user
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Khởi tạo data khi mount
    useEffect(() => {
        loadCartCount();
        fetchGenres();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]); // Chạy lại loadCartCount nếu token thay đổi (đăng nhập/đăng xuất)

    return (
        <>
            {/* ================= TOP BAR ================= */}
            <div className="bg-gray-100 px-5 py-2 text-sm flex justify-between items-center md:justify-end gap-3 relative">
                {/* Logo on small screen */}
                <Link to="/" className="md:hidden font-semibold text-lg bigger">BookNest</Link>

                {/* User dropdown or login/register */}
                <div className="flex items-center gap-3 ml-auto">
                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            <img
                                src={getAvatarUrl()}
                                alt="User Avatar"
                                onClick={toggleDropdown}
                                className="w-8 h-8 rounded-full object-cover cursor-pointer border-2 border-gray-300 bigger"
                                onError={(e) => { e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png'; }}
                            />
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-[999]">
                                    <div className="px-4 py-2 text-sm text-gray-700 font-semibold truncate">
                                        {user.name || user.username}
                                    </div>
                                    <hr className="my-1" />
                                    <Link to="/profile" onClick={closeDropdown} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        Hồ sơ cá nhân
                                    </Link>
                                    <Link to="/orders" onClick={closeDropdown} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        Lịch sử mua hàng
                                    </Link>
                                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link className="hover:underline font-medium" to="/register">Join Us</Link>
                            <Link className="hover:underline font-medium border-l pl-3 border-gray-400" to="/login">Sign In</Link>
                        </>
                    )}
                </div>
            </div>

            {/* ================= NAVBAR CHÍNH ================= */}
            <nav className="bg-white sticky top-0 shadow py-3 z-50">
                <div className="container mx-auto flex items-center justify-between px-4 md:px-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center flex-shrink-0">
                        <img src={logo} alt="Logo" className="h-10 w-auto bigger-small" />
                    </Link>

                    {/* Center links (desktop) */}
                    <div className="hidden md:flex gap-6 text-base font-medium text-gray-700 relative">
                        <Link to="/" className="hover:text-blue-600">Trang chủ</Link>

                        {/* Thể loại Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={() => setShowGenres(true)}
                            onMouseLeave={() => setShowGenres(false)}
                        >
                            <span className="cursor-pointer hover:text-blue-600">Thể loại</span>
                            {/* Thay thế <transition> của Vue bằng conditional rendering đơn giản */}
                            {showGenres && (
                                <div className="absolute left-0 top-full mt-2 w-48 bg-white shadow-lg border rounded z-50 transition-opacity duration-300">
                                    <ul className="p-2 space-y-1">
                                        {genres.map(genre => (
                                            <li
                                                key={genre}
                                                className="cursor-pointer hover:text-blue-600 px-2 py-1"
                                                onClick={() => goToGenre(genre)}
                                            >
                                                {genre}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <Link to="/books" className="hover:text-blue-600">Sách</Link>
                    </div>

                    {/* Search & icons (desktop) */}
                    <div className="hidden md:flex items-center gap-4">
                        <InputSearch />
                        <Link to="/favorites" className="text-gray-700 hover:text-red-600 text-lg bigger">
                            <FontAwesomeIcon icon={['far', 'heart']} />
                        </Link>
                        <Link to="/cart" className="relative text-gray-700 hover:text-green-600 text-xl bigger">
                            <FontAwesomeIcon icon={['fas', 'bag-shopping']} />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Mobile menu toggle button */}
                    <button className="md:hidden text-black text-xl ml-4" onClick={toggleMenu}>
                        <FontAwesomeIcon icon={['fas', 'bars']} />
                    </button>
                </div>

                {/* ================= MOBILE MENU ================= */}
                <div
                    className={`md:hidden fixed top-0 right-0 h-full w-full bg-white shadow-md z-40 transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className="flex items-center justify-between p-4 border-b">
                        <img src={logo} alt="Logo" className="h-8 w-auto" />
                        <button onClick={toggleMenu} className="text-gray-500 hover:text-black">
                            <FontAwesomeIcon icon={['fas', 'xmark']} className="text-2xl" />
                        </button>
                    </div>
                    <ul className="flex flex-col gap-4 p-5 text-lg font-medium text-gray-800">
                        <li>
                            <Link to="/" onClick={toggleMenu} className="hover:text-blue-600 transition-colors">Trang chủ</Link>
                        </li>
                        <li>
                            <Link to="/books" onClick={toggleMenu} className="hover:text-blue-600 transition-colors">Sách</Link>
                        </li>

                        {/* Dropdown thể loại trên Mobile */}
                        <li>
                            <details>
                                <summary className="cursor-pointer hover:text-blue-600 transition-colors">Thể loại</summary>
                                <ul className="ml-4 mt-2 flex flex-col gap-2 text-base font-normal">
                                    {genres.map(genre => (
                                        <li key={genre}>
                                            <button onClick={() => goToGenreMobile(genre)} className="text-left hover:text-blue-500 transition-colors w-full">
                                                {genre}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        </li>

                        <li>
                            <Link to="/favorites" onClick={toggleMenu} className="hover:text-blue-600 transition-colors">Yêu thích</Link>
                        </li>
                        <li>
                            <Link to="/cart" onClick={toggleMenu} className="hover:text-blue-600 transition-colors">Giỏ hàng</Link>
                        </li>
                        {!user && (
                            <li>
                                <Link to="/login" onClick={toggleMenu} className="hover:text-blue-600 transition-colors">Đăng nhập</Link>
                            </li>
                        )}
                    </ul>
                </div>
            </nav>
        </>
    );
};

export default Navbar;