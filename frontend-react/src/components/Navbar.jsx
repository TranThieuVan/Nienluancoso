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

const GENRES = [
    'Comics', 'Kinh tế', 'Chính trị', 'Tình cảm/Lãng mạn',
    'Viễn tưởng', 'Kinh dị', 'Self-help', 'Kinh doanh/Tài chính', 'Bí ẩn/Trinh thám'
];

const Navbar = () => {
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    return (
        <>
            <nav className="bg-white sticky top-0 shadow-sm z-50 border-b border-gray-100">
                <div className="w-full px-6 lg:px-10 py-2.5 flex items-center justify-between">

                    {/* 1. TRÁI: Logo (Ôm khít nội dung, sát lề trái) */}
                    <div className="flex-shrink-0">
                        <Link to="/" className="flex items-center group select-none">
                            <img
                                src={logo}
                                alt="BookNest"
                                className="h-8 w-auto transition-opacity duration-200 group-hover:opacity-80"
                            />
                        </Link>
                    </div>

                    {/* 2. GIỮA: Navigation Links (flex-1 để lấp đầy khoảng trống giữa Logo và cụm Phải) */}
                    <div className="hidden lg:flex flex-1 items-center justify-center gap-8 text-[13px] font-semibold text-stone-700 select-none px-4">
                        <Link
                            to="/"
                            className="relative pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:text-black transition-colors duration-200"
                        >
                            Trang chủ
                        </Link>

                        <div
                            className="relative py-3"
                            onMouseEnter={() => setShowGenres(true)}
                            onMouseLeave={() => setShowGenres(false)}
                        >
                            <span className="relative cursor-pointer select-none pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:text-black transition-colors duration-200 flex items-center gap-1.5">
                                Thể loại
                                <FontAwesomeIcon
                                    icon={['fas', 'chevron-down']}
                                    className={`text-[9px] transition-transform duration-200 ${showGenres ? 'rotate-180' : ''}`}
                                />
                            </span>

                            <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-[-4px] w-52 z-50 transition-all duration-200 origin-top ${showGenres ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none'}`}>
                                <div className="bg-white border border-gray-100 shadow-lg py-2 rounded-b-lg">
                                    {GENRES.map((genre) => (
                                        <button
                                            key={genre}
                                            onClick={() => goToGenre(genre)}
                                            className="w-full text-left px-5 py-2 text-sm text-stone-600 hover:text-black hover:bg-stone-50 transition-colors duration-150 tracking-wide"
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Link
                            to="/books"
                            className="relative pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full hover:text-black transition-colors duration-200"
                        >
                            Sách
                        </Link>
                    </div>

                    {/* 3. PHẢI: Icons, Search và Đăng nhập (Ôm khít nội dung, sát lề phải) */}
                    <div className="hidden lg:flex flex-shrink-0 items-center gap-5 select-none">
                        <InputSearch />
                        <NotificationBell />

                        <Link to="/favorites" className="text-stone-500 hover:text-black transition-colors duration-200 relative" title="Yêu thích">
                            <FontAwesomeIcon icon={['far', 'heart']} className="text-[17px]" />
                        </Link>

                        <Link to="/cart" className="relative text-stone-500 hover:text-black transition-colors duration-200 select-none" title="Giỏ hàng">
                            <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-[18px]" />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[16px] min-h-[16px] px-1 animate-in zoom-in">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        {/* Thanh phân cách dọc */}
                        <div className="w-px h-5 bg-gray-200 mx-1"></div>

                        {/* Khu vực Tài khoản / Đăng nhập */}
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
                                    <span className="text-xs font-semibold hidden lg:block text-stone-700">
                                        {user.name || user.username}
                                    </span>
                                    <FontAwesomeIcon icon={['fas', dropdownOpen ? 'chevron-up' : 'chevron-down']} className="text-[9px] text-stone-400" />
                                </button>

                                {/* User Dropdown */}
                                <div className={`absolute right-0 mt-3 w-52 bg-white border border-gray-100 shadow-lg rounded-xl z-[999] transition-all duration-200 origin-top-right ${dropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                                    <div className="px-4 py-3 border-b border-gray-50 bg-stone-50/50 rounded-t-xl">
                                        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Tài khoản</p>
                                        <p className="text-sm font-semibold text-black truncate mt-0.5">{user.name || user.username}</p>
                                    </div>
                                    <div className="py-2">
                                        <Link to="/profile" onClick={closeDropdown} className="flex items-center gap-3 px-4 py-2 text-sm text-stone-600 hover:text-black hover:bg-stone-50 transition-colors">
                                            <FontAwesomeIcon icon={['far', 'user']} className="w-4" />
                                            Hồ sơ cá nhân
                                        </Link>
                                        <Link to="/orders" onClick={closeDropdown} className="flex items-center gap-3 px-4 py-2 text-sm text-stone-600 hover:text-black hover:bg-stone-50 transition-colors">
                                            <FontAwesomeIcon icon={['fas', 'box']} className="w-4" />
                                            Lịch sử mua hàng
                                        </Link>
                                        <hr className="my-1 border-gray-100" />
                                        <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                                            <FontAwesomeIcon icon={['fas', 'arrow-right-from-bracket']} className="w-4" />
                                            Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link to="/login" className="text-xs font-semibold text-stone-600 hover:text-black transition-colors tracking-wide">
                                    Đăng nhập
                                </Link>
                                <Link to="/register" className="text-xs font-semibold text-white bg-black hover:bg-stone-800 transition-colors tracking-wide px-4 py-1.5 rounded-full">
                                    Đăng ký
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Right (Icons + Hamburger) */}
                    <div className="lg:hidden flex flex-shrink-0 items-center gap-4">
                        <NotificationBell />
                        <Link to="/cart" className="relative text-stone-600 hover:text-black transition-colors">
                            <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-lg" />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-black text-white text-[9px] font-bold rounded-full min-w-[16px] min-h-[16px] flex items-center justify-center px-1">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        <button onClick={toggleMenu} className="text-stone-600 hover:text-black transition-colors p-1">
                            <FontAwesomeIcon icon={['fas', menuOpen ? 'xmark' : 'bars']} className="text-xl" />
                        </button>
                    </div>
                </div>

                {/* ── MOBILE MENU (Dạng Side Drawer 25%) ── */}
                {/* Đổi inset-0 thành inset-y-0 right-0, w-full thành w-full sm:w-[25%] */}
                <div className={`lg:hidden fixed inset-y-0 right-0 w-full sm:w-[25%] min-w-[260px] bg-white z-40 shadow-2xl transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-stone-50/50">
                        <img src={logo} alt="Logo" className="h-7 w-auto" />
                        <button onClick={toggleMenu} className="text-stone-500 hover:text-black transition-colors p-2">
                            <FontAwesomeIcon icon={['fas', 'xmark']} className="text-xl" />
                        </button>
                    </div>

                    <div className="overflow-y-auto h-full pb-20">
                        <nav className="flex flex-col px-6 py-4 gap-1 select-none">
                            {[{ to: '/', label: 'Trang chủ' }, { to: '/books', label: 'Sách' }].map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={toggleMenu}
                                    className="py-3 text-sm font-semibold text-stone-700 hover:text-black border-b border-gray-50 transition-colors select-none"
                                >
                                    {link.label}
                                </Link>
                            ))}

                            <details className="group">
                                <summary className="py-3 text-sm font-semibold text-stone-700 hover:text-black border-b border-gray-50 cursor-pointer list-none flex items-center justify-between">
                                    Thể loại
                                    <FontAwesomeIcon icon={['fas', 'chevron-down']} className="text-[10px] text-stone-400 transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <div className="pl-4 py-2 flex flex-col gap-1 bg-stone-50/30">
                                    {GENRES.map(genre => (
                                        <button
                                            key={genre}
                                            onClick={() => goToGenreMobile(genre)}
                                            className="text-left py-2.5 text-[13px] text-stone-600 hover:text-black transition-colors"
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </details>

                            <Link to="/favorites" onClick={toggleMenu} className="py-3 text-sm font-semibold text-stone-700 hover:text-black border-b border-gray-50 transition-colors flex items-center gap-3">
                                <FontAwesomeIcon icon={['far', 'heart']} className="text-stone-400 w-4" />
                                Yêu thích
                            </Link>
                            <Link to="/cart" onClick={toggleMenu} className="py-3 text-sm font-semibold text-stone-700 hover:text-black border-b border-gray-50 transition-colors flex items-center gap-3">
                                <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-stone-400 w-4" />
                                Giỏ hàng
                                {cartCount > 0 && <span className="ml-auto bg-black text-white text-[10px] font-bold rounded-full px-2 py-0.5">{cartCount}</span>}
                            </Link>

                            {user ? (
                                <>
                                    <Link to="/profile" onClick={toggleMenu} className="py-3 text-sm font-semibold text-stone-700 hover:text-black border-b border-gray-50 transition-colors flex items-center gap-3">
                                        <FontAwesomeIcon icon={['far', 'user']} className="text-stone-400 w-4" />
                                        Hồ sơ cá nhân
                                    </Link>
                                    <Link to="/orders" onClick={toggleMenu} className="py-3 text-sm font-semibold text-stone-700 hover:text-black border-b border-gray-50 transition-colors flex items-center gap-3">
                                        <FontAwesomeIcon icon={['fas', 'box']} className="text-stone-400 w-4" />
                                        Lịch sử mua hàng
                                    </Link>
                                    <button onClick={() => { handleLogout(); toggleMenu(); }} className="py-3 text-sm font-semibold text-red-500 text-left transition-colors flex items-center gap-3 mt-2">
                                        <FontAwesomeIcon icon={['fas', 'arrow-right-from-bracket']} className="text-red-400 w-4" />
                                        Đăng xuất
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col gap-3 mt-6">
                                    <Link to="/login" onClick={toggleMenu} className="py-2.5 text-sm font-semibold text-center text-stone-700 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
                                        Đăng nhập
                                    </Link>
                                    <Link to="/register" onClick={toggleMenu} className="py-2.5 text-sm font-semibold text-center text-white bg-black rounded-lg hover:bg-stone-800 transition-colors">
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </nav>
                    </div>
                </div>

                {/* Mobile Backdrop Overlay (Nền tối ở phần màn hình còn lại) */}
                {menuOpen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/20 z-30 backdrop-blur-sm transition-opacity"
                        onClick={toggleMenu}
                    />
                )}
            </nav>
        </>
    );
};

export default Navbar;