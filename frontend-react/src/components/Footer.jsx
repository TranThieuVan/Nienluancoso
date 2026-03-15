import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Footer = () => {
    return (
        <footer className="bg-black text-white mt-10">
            <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-12">

                {/* ── Brand ── */}
                <div>
                    <p className="text-[10px] tracking-[0.4em] uppercase text-stone-500 mb-3">Est. 2024</p>
                    <h2 className="text-2xl font-bold text-white mb-4">BookNest</h2>
                    <p className="text-sm text-stone-400 leading-relaxed max-w-xs">
                        Nền tảng mua sách trực tuyến với hàng ngàn đầu sách chất lượng, hỗ trợ người dùng 24/7.
                    </p>
                </div>

                {/* ── Links ── */}
                <div>
                    <p className="text-[10px] tracking-[0.4em] uppercase text-stone-500 mb-5">Điều hướng</p>
                    <ul className="space-y-3">
                        {[
                            { to: '/', label: 'Trang chủ' },
                            { to: '/books', label: 'Sách' },
                            { to: '/favorites', label: 'Yêu thích' },
                            { to: '/cart', label: 'Giỏ hàng' },
                            { to: '/profile', label: 'Tài khoản' },
                        ].map(link => (
                            <li key={link.to}>
                                <Link
                                    to={link.to}
                                    className="text-sm text-stone-400 hover:text-white transition-colors duration-200 relative pb-0.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full"
                                >
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ── Contact ── */}
                <div>
                    <p className="text-[10px] tracking-[0.4em] uppercase text-stone-500 mb-5">Liên hệ</p>
                    <ul className="space-y-4">
                        {[
                            { icon: 'phone', text: '0123 456 789' },
                            { icon: 'envelope', text: 'support@booknest.vn' },
                            { icon: 'location-dot', text: '123 Nguyễn Văn Cừ, Q.5, TP.HCM' },
                        ].map(({ icon, text }) => (
                            <li key={text} className="flex items-start gap-3">
                                <FontAwesomeIcon
                                    icon={['fas', icon]}
                                    className="text-stone-500 w-4 mt-0.5 flex-shrink-0"
                                />
                                <span className="text-sm text-stone-400">{text}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Social Icons */}
                    <div className="flex items-center gap-3 mt-6">
                        {[
                            { icon: ['fab', 'facebook-f'], label: 'Facebook', href: 'https://www.facebook.com/' },
                            { icon: ['fab', 'instagram'], label: 'Instagram', href: 'https://www.instagram.com/' },
                            { icon: ['fab', 'x-twitter'], label: 'X', href: 'https://www.x.com/' },
                        ].map(({ icon, label, href }) => (
                            <a
                                key={label}
                                href={href}
                                title={label}
                                target="_blank"
                                className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-black text-sm transition-transform duration-200 hover:-translate-y-1"
                            >
                                <FontAwesomeIcon icon={icon} />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Bottom Bar ── */}
            <div className="border-t border-stone-800">
                <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-xs text-stone-600">
                        © 2025 BookNest. All rights reserved.
                    </p>
                    <p className="text-xs text-stone-700 tracking-widest uppercase">
                        Sách · Tri thức · Cảm hứng
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;