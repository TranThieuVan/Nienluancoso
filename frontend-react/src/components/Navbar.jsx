import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import InputSearch from './InputSearch';
import logo from '../assets/image/logo.png';
import NotificationBell from './NotificationBell';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../composables/cartStore';

/* ─── Data ─────────────────────────────────────────── */
const NAV_LINKS = [
    { to: '/', label: 'Trang chủ' },
    { to: '/books', label: 'Kho Sách' },
    { to: '/about', label: 'Giới thiệu' },
];

const GENRES = [
    'Comics', 'Kinh tế', 'Chính trị', 'Tình cảm/Lãng mạn',
    'Viễn tưởng', 'Kinh dị', 'Self-help', 'Kinh doanh/Tài chính', 'Bí ẩn/Trinh thám',
];

const iconBtn = 'w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-50 transition-colors text-stone-600 hover:text-black relative';

/* ─── Component ─────────────────────────────────────── */
const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showGenres, setShowGenres] = useState(false);

    const dropdownRef = useRef(null);
    const genreTimer = useRef(null);

    const { user, logout, token } = useAuthStore();
    const { cartCount, setCartCount } = useCartStore();

    const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
    const handleLogout = () => { logout(); setDropdownOpen(false); navigate('/'); };
    const getAvatarUrl = () => user ? `http://localhost:5000/${user.avatar || 'uploads/avatars/default-user.png'}?t=${Date.now()}` : '';

    const loadCartCount = async () => {
        if (!token) { setCartCount(0); return; }
        try {
            const { data } = await axios.get('http://localhost:5000/api/cart', { headers: { Authorization: `Bearer ${token}` } });
            setCartCount(data.items?.reduce((s, i) => s + i.quantity, 0) || 0);
        } catch { setCartCount(0); }
    };

    // ✅ ĐÃ SỬA: Chuyển hướng trực tiếp sang BookList kèm theo query parameter
    const goToGenre = (g) => {
        navigate(`/books?genre=${encodeURIComponent(g)}`);
        setShowGenres(false);
        setMenuOpen(false);
    };

    const onGenreEnter = () => { clearTimeout(genreTimer.current); setShowGenres(true); };
    const onGenreLeave = () => { genreTimer.current = setTimeout(() => setShowGenres(false), 140); };

    useEffect(() => {
        const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => { loadCartCount(); }, [token]); // eslint-disable-line
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    return (
        <>
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm" >
                <div className="w-full px-6 lg:px-10 flex items-center justify-between h-16">

                    {/* 1. Trái: Logo */}
                    <div className="flex-1 lg:flex-none">
                        <Link to="/" className="inline-block group select-none">
                            <img src={logo} alt="BookNest" className="h-14 w-auto transition-opacity duration-200 group-hover:opacity-60" />
                        </Link>
                    </div>

                    {/* 2. Giữa: NavLinks */}
                    <nav className="hidden lg:flex flex-1 items-center justify-center gap-10">
                        {NAV_LINKS.map(({ to, label }) => (
                            <Link key={to} to={to} className={`text-[15px] tracking-[0.15em] uppercase font-bold transition-colors duration-200 relative pb-1.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:transition-all after:duration-300 hover:after:w-full ${isActive(to) ? 'text-black after:w-full' : 'text-stone-400 hover:text-black after:w-0 after:bg-black'}`}>
                                {label}
                            </Link>
                        ))}
                        <div className="relative flex items-center h-10" onMouseEnter={onGenreEnter} onMouseLeave={onGenreLeave}>
                            <span className="text-[15px] tracking-[0.15em] uppercase font-bold text-stone-400 hover:text-black transition-colors duration-200 relative pb-1.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-black after:transition-all after:duration-300 hover:after:w-full flex items-center gap-1.5 cursor-pointer">
                                Thể loại <FontAwesomeIcon icon={['fas', 'chevron-down']} className={`text-[10px] transition-transform duration-200 ${showGenres ? 'rotate-180' : ''}`} />
                            </span>
                            <div className={`absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 transition-all duration-300 origin-top ${showGenres ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'}`}>
                                <div className="w-56 bg-white py-3 shadow-2xl border border-gray-100">
                                    {GENRES.map((genre) => (
                                        <button key={genre} onClick={() => goToGenre(genre)} className="w-full text-left px-5 py-3 text-[13px] font-bold tracking-[0.2em] uppercase text-stone-500 hover:text-black hover:bg-stone-50 transition-colors">
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </nav>

                    {/* 3. Phải: Icons & Auth */}
                    <div className="flex items-center gap-1 lg:gap-3">
                        <div className="flex items-center gap-1">
                            <InputSearch />
                            <NotificationBell />
                            <Link to="/favorites" className={iconBtn} title="Yêu thích">
                                <FontAwesomeIcon icon={['far', 'heart']} className="text-[20px]" />
                            </Link>
                            <Link to="/cart" className={iconBtn} title="Giỏ hàng">
                                <FontAwesomeIcon icon={['fas', 'bag-shopping']} className="text-[20px]" />
                                {cartCount > 0 && <span className="absolute top-1.5 right-1 inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 text-[10px] font-bold text-white bg-black rounded-full">{cartCount}</span>}
                            </Link>
                        </div>

                        <div className="hidden lg:block w-px h-4 bg-gray-200 mx-2" />

                        <div className="hidden lg:flex items-center">
                            {user ? (
                                <div className="relative" ref={dropdownRef}>
                                    <button onClick={() => setDropdownOpen(v => !v)} className="flex items-center gap-2.5 outline-none group">
                                        <div className="text-right leading-none">
                                            <p className="text-[15px] font-bold tracking-widest uppercase text-black group-hover:text-stone-500 transition-colors">{user.name || user.username}</p>
                                        </div>
                                        <img src={getAvatarUrl()} alt="Avatar" className="w-9 h-9 rounded-full object-cover transition-opacity group-hover:opacity-80" onError={(e) => { e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png'; }} />
                                    </button>

                                    <div className={`absolute right-0 top-full mt-4 w-56 bg-white z-[999] transition-all duration-300 origin-top shadow-2xl border border-gray-100 ${dropdownOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                        <div className="py-2">
                                            {[
                                                { to: '/profile', icon: ['far', 'user'], label: 'Hồ sơ cá nhân' },
                                                { to: '/orders', icon: ['fas', 'box'], label: 'Lịch sử mua hàng' },
                                            ].map(({ to, icon, label }) => (
                                                <Link key={to} to={to} onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-5 py-3.5 text-[13px] tracking-[0.15em] uppercase font-bold text-stone-500 hover:text-black hover:bg-stone-50 transition-colors">
                                                    <FontAwesomeIcon icon={icon} className="w-4 text-stone-300" /> {label}
                                                </Link>
                                            ))}
                                            <div className="h-px bg-gray-100 mx-5 my-1" />
                                            <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left px-5 py-3.5 text-[13px] tracking-[0.15em] uppercase font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                                <FontAwesomeIcon icon={['fas', 'arrow-right-from-bracket']} className="w-4" /> Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <Link to="/login" className="flex items-center gap-2 text-[15px] tracking-[0.2em] font-bold text-black hover:text-stone-500 transition-colors pl-2">
                                    ĐĂNG NHẬP <FontAwesomeIcon icon={['far', 'user']} className="text-[18px]" />
                                </Link>
                            )}
                        </div>

                        <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden ml-2 w-10 h-10 flex items-center justify-center text-stone-600 hover:text-black transition-colors">
                            <FontAwesomeIcon icon={['fas', menuOpen ? 'xmark' : 'bars']} className="text-xl" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer */}
            <div className={`lg:hidden fixed inset-0 bg-black/20 z-50 transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)} />

            <div className={`lg:hidden fixed inset-y-0 right-0 w-[280px] bg-white z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`} >
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <img src={logo} alt="Logo" className="h-7 w-auto" />
                    <button onClick={() => setMenuOpen(false)} className="text-stone-400 hover:text-black"><FontAwesomeIcon icon={['fas', 'xmark']} className="text-xl" /></button>
                </div>

                <div className="overflow-y-auto flex-1 py-4">
                    <div className="px-6 pb-6 mb-2 border-b border-gray-100">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <img src={getAvatarUrl()} alt="Avatar" className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png'; }} />
                                <div>
                                    <p className="text-[15px] font-bold tracking-[0.15em] uppercase text-black">{user.name || user.username}</p>
                                    <button onClick={handleLogout} className="text-[13px] text-stone-400 hover:text-red-500 mt-1 uppercase tracking-wider">Đăng xuất</button>
                                </div>
                            </div>
                        ) : (
                            <Link to="/login" onClick={() => setMenuOpen(false)} className="flex items-center justify-center gap-3 py-3.5 bg-stone-50 hover:bg-stone-100 transition-colors">
                                <span className="text-[12px] tracking-[0.2em] font-bold text-black">LOGIN</span>
                                <FontAwesomeIcon icon={['far', 'user']} className="text-stone-600" />
                            </Link>
                        )}
                    </div>

                    <div className="px-6 space-y-1">
                        {NAV_LINKS.map(({ to, label }) => (
                            <Link key={to} to={to} onClick={() => setMenuOpen(false)} className={`block py-3 text-[15px] tracking-[0.2em] uppercase font-bold transition-colors ${isActive(to) ? 'text-black' : 'text-stone-400 hover:text-black'}`}>
                                {label}
                            </Link>
                        ))}
                        <details className="group">
                            <summary className="flex items-center justify-between py-3 text-[15px] tracking-[0.2em] uppercase font-bold text-stone-400 hover:text-black cursor-pointer list-none transition-colors">
                                Thể loại <FontAwesomeIcon icon={['fas', 'chevron-down']} className="text-[11px] transition-transform duration-200 group-open:rotate-180" />
                            </summary>
                            <div className="pl-4 py-1">
                                {GENRES.map(genre => (
                                    <button key={genre} onClick={() => goToGenre(genre)} className="block w-full text-left py-2.5 text-[12px] tracking-[0.15em] uppercase font-bold text-stone-400 hover:text-black transition-colors">
                                        {genre}
                                    </button>
                                ))}
                            </div>
                        </details>
                    </div>

                    {user && (
                        <div className="mt-6 px-6 pt-6 border-t border-gray-100 space-y-1">
                            <p className="text-[15px] uppercase tracking-[0.3em] text-stone-700 font-bold mb-3">Tài khoản</p>
                            {[
                                { to: '/profile', label: 'Hồ sơ cá nhân' },
                                { to: '/orders', label: 'Lịch sử mua hàng' },
                            ].map(({ to, label }) => (
                                <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="block py-2.5 text-[13px] tracking-[0.15em] uppercase font-bold text-stone-400 hover:text-black transition-colors">
                                    {label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Navbar;