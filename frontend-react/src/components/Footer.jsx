import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white py-10 mt-10">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Logo + Giới thiệu */}
                <div>
                    <h2 className="text-2xl font-bold mb-4">BookNest</h2>
                    <p className="text-sm text-gray-300">
                        Nền tảng mua sách trực tuyến với hàng ngàn đầu sách chất lượng, hỗ trợ người dùng 24/7.
                    </p>
                </div>

                {/* Liên kết */}
                <div>
                    <h3 className="text-xl font-semibold mb-4">Liên kết</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                        <li><Link to="/" className="hover:underline">Trang chủ</Link></li>
                        <li><Link to="/books" className="hover:underline">Sách</Link></li>
                        <li><Link to="/cart" className="hover:underline">Giỏ hàng</Link></li>
                        <li><Link to="/profile" className="hover:underline">Tài khoản</Link></li>
                    </ul>
                </div>

                {/* Liên hệ */}
                <div>
                    <h3 className="text-xl font-semibold mb-4">Liên hệ</h3>
                    <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-center gap-2">
                            <FontAwesomeIcon icon={['fas', 'phone-alt']} className="text-yellow-400" />
                            Hotline: 0123 456 789
                        </li>
                        <li className="flex items-center gap-2">
                            <FontAwesomeIcon icon={['fas', 'envelope']} className="text-yellow-400" />
                            Email: support@booknest.vn
                        </li>
                        <li className="flex items-center gap-2">
                            <FontAwesomeIcon icon={['fas', 'map-marker-alt']} className="text-yellow-400" />
                            123 Nguyễn Văn Cừ, Q.5, TP.HCM
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-10 text-center text-gray-500 text-xs border-t border-gray-700 pt-4">
                © 2025 BookNest. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;