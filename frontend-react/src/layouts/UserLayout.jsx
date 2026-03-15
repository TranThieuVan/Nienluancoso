import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatIcon from '../components/ChatIcon';
import ChatBox from '../components/ChatBox';
import ClickSpark from '../components/ClickSpark';

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
        <ClickSpark sparkColor="#666" sparkSize={10}
            sparkRadius={10}
            sparkCount={8}
            duration={400}>
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
                    <ChatBox
                        userId={userId}
                        onClose={() => setIsChatOpen(false)}
                    />
                )}
            </div>
        </ClickSpark>
    );
};

export default UserLayout;