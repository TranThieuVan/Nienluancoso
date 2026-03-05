import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatIcon from '../components/ChatIcon';
import ChatBox from '../components/ChatBox'; // ✅ Nhớ import ChatBox vào nhé

const UserLayout = () => {
    // ✅ State quản lý đóng/mở chat
    const [isChatOpen, setIsChatOpen] = useState(false);

    // ✅ State lưu ID của người dùng đang đăng nhập
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        // Lấy thông tin user từ localStorage để truyền cho ChatBox biết ai đang chat
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && user._id) {
                    setUserId(user._id);
                }
            } catch (error) {
                console.error('Lỗi khi đọc dữ liệu user:', error);
            }
        }
    }, []);

    return (
        <div className="flex flex-col min-h-screen relative">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />

            {/* ✅ LOGIC ĐÓNG MỞ CHAT NẰM Ở ĐÂY */}

            {/* Nếu khung chat chưa mở -> Hiện cục Icon tròn tròn */}
            {!isChatOpen && (
                <ChatIcon onToggle={() => setIsChatOpen(true)} />
            )}

            {/* Nếu click vào Icon (isChatOpen = true) -> Hiện cái khung ChatBox lên */}
            {isChatOpen && (
                <ChatBox
                    userId={userId}
                    onClose={() => setIsChatOpen(false)}
                />
            )}
        </div>
    );
};

export default UserLayout;