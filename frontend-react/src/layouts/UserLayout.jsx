import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatIcon from '../components/ChatIcon';
import { useAuthStore } from '../stores/auth'; // ✅ Import Zustand store

const ChatBox = lazy(() => import('../components/ChatBox'));

const UserLayout = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);

    // ✅ Đọc thẳng từ Zustand — tự động re-render khi login/logout
    const user = useAuthStore((state) => state.user);
    const userId = user?._id || user?.id || null;

    // ✅ Tự đóng chatbox khi logout
    useEffect(() => {
        if (!userId) setIsChatOpen(false);
    }, [userId]);

    return (
        <div className="flex flex-col min-h-screen relative">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />

            {userId && !isChatOpen && (
                <ChatIcon onToggle={() => setIsChatOpen(true)} />
            )}

            {userId && isChatOpen && (
                <Suspense fallback={
                    <div className="fixed bottom-20 right-5 p-4 bg-white shadow-lg rounded">
                        Đang tải trợ lý AI...
                    </div>
                }>
                    {/* key={userId} đảm bảo ChatBox reset sạch khi đổi tài khoản */}
                    <ChatBox
                        key={userId}
                        userId={userId}
                        onClose={() => setIsChatOpen(false)}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default UserLayout;