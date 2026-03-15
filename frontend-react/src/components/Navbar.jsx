import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Components & Assets
import InputSearch from './InputSearch';
import logo from '../assets/image/logo.png';
import NotificationBell from './NotificationBell';
// Stores
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../composables/cartStore';

const Navbar = () => {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [genres, setGenres] = useState([]);
    const [showGenres, setShowGenres] = useState(false);

    const dropdownRef = useRef(null);

    const { user, logout, token } = useAuthStore();
    const { cartCount, setCartCount } = useCartStore();

    const toggleMenu = () => setMenuOpen(!menuOpen);
    const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
    const closeDropdown = () => setDropdownOpen(false);

    const getAvatarUrl = () => {
        if (!user) return '';
        return `http://localhost:5000/${user.avatar || 'uploads/avatars/default-user.png'}?t=${Date.now()}`;
    };

    const loadCartCount = async () => {
        if (!token) { setCartCount(0); return; }
        try {
            const { data } = await axios.get('http://localhost:5000/api/cart', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const total = data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            setCartCount(total);
        } catch { setCartCount(0); }
    };

    const handleLogout = () => {
        logout();
        closeDropdown();
        navigate('/');
    };

    const fetchGenres = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/books/genres');
            setGenres(data);
        } catch (err) { console.error('Lỗi khi tải thể loại:', err); }
    };

    const goToGenre = (genre) => {
        navigate(`/books/view-all?genre=${encodeURIComponent(genre)}`);
        setShowGenres(false);
    };

    const goToGenreMobile = (genre) => {
        navigate(`/books/view-all?genre=${encodeURIComponent(genre)}`);
        setMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        loadCartCount();
        fetchGenres();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    return (
        <>
            {/* ── TOP BAR ── */}
            <div className="bg-black border-b border-gray-100 px-6 py-2 text-xs flex justify-between items-center">
                <p className="text-white tracking-widest uppercase hidden md:block text-[10px] ml-[40%] select-none">
                    Sách · Tri thức · Cảm hứng
                </p>

                <div className="flex items-center gap-4 ml-auto">
                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={toggleDropdown}
                                className="flex items-center gap-2 text-stone-600 hover:text-black transition-colors duration-200"
                            >
                                <img
                                    src={getAvatarUrl()}
                                    alt="Avatar"
                                    className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                    onError={(e) => { e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png'; }}
                                />
                                <span className="text-xs font-medium hidden sm:block text-white">
                                    {user.name || user.username}
                                </span>
                                <FontAwesomeIcon
                                    icon={['fas', dropdownOpen ? 'chevron-up' : 'chevron-down']}
                                    className="text-[10px] text-stone-400"
                                />
                            </button>

                            {/* User Dropdown */}
                            <div className={`absolute right-0 mt-3 w-52 bg-white border border-gray-100 shadow-lg z-[999] transition-all duration-200 origin-top-right ${dropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                <div className="px-4 py-3 border-b border-gray-50">
                                    <p className="text-xs text-stone-400 uppercase tracking-wider">Tài khoản</p>
                                    <p className="text-sm font-semibold text-black truncate mt-0.5">{user.name || user.username}</p>
                                </div>
                                <div className="py-1">
                                    <Link
                                        to="/profile"
                                        onClick={closeDropdown}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:text-black hover:bg-stone-50 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={['far', 'user']} className="w-4" />
                                        Hồ sơ cá nhân
                                    </Link>
                                    <Link
                                        to="/orders"
                                        onClick={closeDropdown}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 hover:text-black hover:bg-stone-50 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={['fas', 'box']} className="w-4" />
                                        Lịch sử mua hàng
                                    </Link>
                                    <hr className="my-1 border-gray-100" />
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={['fas', 'arrow-right-from-bracket']} className="w-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link
                                to="/register"
                                className="text-xs font-medium text-white hover:text-gray-200 transition-colors tracking-wide"
                            >
                                Đăng ký
                            </Link>
                            <span className="text-stone-200">|</span>
                            <Link
                                to="/login"
                                className="text-xs font-medium text-white hover:text-gray-200 transition-colors tracking-wide"
                            >
                                Đăng nhập
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* ── MAIN NAVBAR ── */}
            <nav className="bg-white sticky top-0 shadow-sm z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">

                    {/* Logo */}
                    <Link to="/" className="flex items-center flex-shrink-0 group">
                        <img
                            src={logo}
                            alt="BookNest"
                            className="h-9 w-auto transition-opacity duration-200 group-hover:opacity-80"
                        />
                    </Link>

                    {/* Center Links (desktop) */}
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-700">
                        <Link
                            to="/"
                            className="relative pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:text-black transition-colors duration-200"
                        >
                            Trang chủ
                        </Link>

                        {/* Genre Dropdown */}
                        <div
                            className="relative py-4"
                            onMouseEnter={() => setShowGenres(true)}
                            onMouseLeave={() => setShowGenres(false)}
                        >
                            <span className="relative cursor-pointer pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:text-black transition-colors duration-200 flex items-center gap-1.5">
                                Thể loại
                                <FontAwesomeIcon
                                    icon={['fas', 'chevron-down']}
                                    className={`text-[10px] transition-transform duration-200 ${showGenres ? 'rotate-180' : ''}`}
                                />
                            </span>

                            <div className={`absolute left-0 top-full pt-1 w-52 z-50 transition-all duration-200 origin-top ${showGenres ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none'}`}>
                                <div className="bg-white border border-gray-100 shadow-lg py-2">
                                    {genres.map((genre, i) => (
                                        <button
                                            key={genre}
                                            onClick={() => goToGenre(genre)}
                                            className="w-full text-left px-5 py-2.5 text-sm text-stone-600 hover:text-black hover:bg-stone-50 transition-colors duration-150 tracking-wide"
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Link
                            to="/books"
                            className="relative pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:text-black transition-colors duration-200"
                        >
                            Sách
                        </Link>
                    </div>

                    {/* Right Icons (desktop) */}
                    <div className="hidden md:flex items-center gap-5">
                        <InputSearch />

                        <NotificationBell />

                        <Link
                            to="/favorites"
                            className="text-stone-500 hover:text-black transition-colors duration-200 relative"
                            title="Yêu thích"
                        >
                            <FontAwesomeIcon icon={['far', 'heart']} className="text-lg" />
                        </Link>

                        <Link
                            to="/cart"
                            className="relative text-stone-500 hover:text-black transition-colors duration-200"
                            title="Giỏ hàng"
                        >
                            <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-xl" />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] min-h-[18px] px-1 animate-in zoom-in">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Mobile Right */}
                    <div className="md:hidden flex items-center gap-4">
                        <NotificationBell />
                        <Link to="/cart" className="relative text-stone-600 hover:text-black transition-colors">
                            <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-xl" />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold rounded-full min-w-[18px] min-h-[18px] flex items-center justify-center px-1">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        <button
                            onClick={toggleMenu}
                            className="text-stone-600 hover:text-black transition-colors p-1"
                        >
                            <FontAwesomeIcon icon={['fas', menuOpen ? 'xmark' : 'bars']} className="text-xl" />
                        </button>
                    </div>
                </div>

                {/* ── MOBILE MENU ── */}
                <div className={`md:hidden fixed inset-0 bg-white z-40 transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    {/* Mobile Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <img src={logo} alt="Logo" className="h-8 w-auto" />
                        <button onClick={toggleMenu} className="text-stone-500 hover:text-black transition-colors">
                            <FontAwesomeIcon icon={['fas', 'xmark']} className="text-2xl" />
                        </button>
                    </div>

                    {/* Mobile Nav Links */}
                    <div className="overflow-y-auto h-full pb-20">
                        <nav className="flex flex-col px-6 py-6 gap-1">
                            {[{ to: '/', label: 'Trang chủ' }, { to: '/books', label: 'Sách' }].map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={toggleMenu}
                                    className="py-3 text-base font-medium text-stone-700 hover:text-black border-b border-gray-50 transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ))}

                            {/* Genre Accordion */}
                            <details className="group">
                                <summary className="py-3 text-base font-medium text-stone-700 hover:text-black border-b border-gray-50 cursor-pointer list-none flex items-center justify-between">
                                    Thể loại
                                    <FontAwesomeIcon icon={['fas', 'chevron-down']} className="text-xs text-stone-400 transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <div className="pl-4 py-2 flex flex-col gap-1">
                                    {genres.map(genre => (
                                        <button
                                            key={genre}
                                            onClick={() => goToGenreMobile(genre)}
                                            className="text-left py-2 text-sm text-stone-500 hover:text-black transition-colors"
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </details>

                            <Link to="/favorites" onClick={toggleMenu} className="py-3 text-base font-medium text-stone-700 hover:text-black border-b border-gray-50 transition-colors flex items-center gap-3">
                                <FontAwesomeIcon icon={['far', 'heart']} className="text-stone-400 w-5" />
                                Yêu thích
                            </Link>
                            <Link to="/cart" onClick={toggleMenu} className="py-3 text-base font-medium text-stone-700 hover:text-black border-b border-gray-50 transition-colors flex items-center gap-3">
                                <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-stone-400 w-5" />
                                Giỏ hàng
                                {cartCount > 0 && <span className="ml-auto bg-black text-white text-xs rounded-full px-2 py-0.5">{cartCount}</span>}
                            </Link>

                            {!user && (
                                <>
                                    <Link to="/login" onClick={toggleMenu} className="py-3 text-base font-medium text-stone-700 hover:text-black border-b border-gray-50 transition-colors">
                                        Đăng nhập
                                    </Link>
                                    <Link to="/register" onClick={toggleMenu} className="py-3 text-base font-medium text-stone-700 hover:text-black transition-colors">
                                        Đăng ký
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                {menuOpen && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/20 z-30 backdrop-blur-sm"
                        onClick={toggleMenu}
                    />
                )}
            </nav>
        </>
    );
};

export default Navbar;