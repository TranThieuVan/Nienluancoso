import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import Swal from 'sweetalert2'; 

const ChatIcon = ({ onToggle }) => {
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
    } catch (err) {
      console.error('Lỗi lấy số tin chưa đọc:', err);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    let waited = 0;

    const checkToken = () => {
      if (localStorage.getItem('token')) {
        fetchUnreadCount();

        // ✅ TĂNG TỪ 1 GIÂY (1000) LÊN 30 GIÂY (30000)
        intervalRef.current = setInterval(fetchUnreadCount, 30000);
      } else if (waited < 5000) {
        waited += 100;
        timeoutRef.current = setTimeout(checkToken, 100);
      }
    };

    checkToken();

    // ✅ TRICK TỐI ƯU UX: Tự load lại tin nhắn khi user bấm vào tab web
    const handleWindowFocus = () => {
      if (localStorage.getItem('token')) {
        fetchUnreadCount();
      }
    };
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup khi component bị hủy
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

    if (onToggle) {
      onToggle();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className="relative bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform"
        onClick={handleClick}
      >
        <FontAwesomeIcon icon={['fas', 'comments']} size="lg" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatIcon;