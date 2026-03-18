import React, { useState, useEffect, Suspense, lazy } from 'react'; // ✨ Thêm React và lazy
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatIcon from '../components/ChatIcon';
import ClickSpark from '../components/ClickSpark'; // ✨ Đưa import này lên trên cùng

// ✨ Đưa khai báo biến xuống dưới CÙNG của khu vực import, dùng thẳng lazy() thay vì React.lazy()
const ChatBox = lazy(() => import('../components/ChatBox'));

const UserLayout = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
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
        // <ClickSpark sparkColor="#666" sparkSize={10}
        //     sparkRadius={10}
        //     sparkCount={8}
        //     duration={400}>
        <div className="flex flex-col min-h-screen relative">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />

            {!isChatOpen && (
                <ChatIcon onToggle={() => setIsChatOpen(true)} />
            )}

            {isChatOpen && (
                <Suspense fallback={<div className="fixed bottom-20 right-5 p-4 bg-white shadow-lg rounded">Đang tải trợ lý AI...</div>}>
                    <ChatBox
                        userId={userId}
                        onClose={() => setIsChatOpen(false)}
                    />
                </Suspense>
            )}
        </div>
        // </ClickSpark>
    );
};

export default UserLayout;