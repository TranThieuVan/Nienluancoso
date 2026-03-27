import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const ChatIcon = ({ onToggle, isOpen }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('/api/messages/unread/count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount((res.data?.unreadCount ?? 0) > 0 ? res.data.unreadCount : 0);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    let waited = 0;
    const checkToken = () => {
      if (localStorage.getItem('token')) {
        fetchUnreadCount();
        intervalRef.current = setInterval(fetchUnreadCount, 30000);
      } else if (waited < 5000) {
        waited += 100;
        timeoutRef.current = setTimeout(checkToken, 100);
      }
    };
    checkToken();

    const handleWindowFocus = () => {
      if (localStorage.getItem('token')) fetchUnreadCount();
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const handleClick = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Bạn cần đăng nhập để sử dụng chức năng chat.');
      return;
    }
    if (onToggle) onToggle();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button
        onClick={handleClick}
        className={`relative w-12 h-12 bg-black text-white flex rounded-full items-center justify-center shadow-lg hover:-translate-y-2 hover:bg-stone-800 transition-all duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
        title="Chat với AI"
      >
        <FontAwesomeIcon
          icon={['fas', isOpen ? 'xmark' : 'comments']}
          className="text-base transition-all duration-200"
        />

        {/* Unread Badge */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -right-1.5 bg-white text-black text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1 border border-black">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default ChatIcon;