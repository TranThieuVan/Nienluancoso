import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Nếu bạn muốn dùng SweetAlert cho đẹp (đồng bộ với app) thì uncomment dòng dưới:
// import Swal from 'sweetalert2'; 

const ChatIcon = ({ onToggle }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  // Dùng useRef để lưu ID của interval/timeout, giúp dễ dàng dọn dẹp khi unmount
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

    // Logic đợi token tương đương vòng lặp while của Vue
    const checkToken = () => {
      if (localStorage.getItem('token')) {
        fetchUnreadCount();
        intervalRef.current = setInterval(fetchUnreadCount, 1000);
      } else if (waited < 5000) {
        waited += 100;
        timeoutRef.current = setTimeout(checkToken, 100);
      }
    };

    checkToken();

    // Cleanup function: Chạy khi component bị hủy (onBeforeUnmount bên Vue)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = () => {
    const token = localStorage.getItem('token');

    // Y hệt logic bên Vue: Chặn lại nếu không có token
    if (!token) {
      alert('Bạn cần đăng nhập để sử dụng chức năng chat.');

      // Hoặc nếu bạn muốn xịn xò hơn, dùng Swal thay vì alert mặc định:
      // Swal.fire({ icon: 'warning', title: 'Bạn cần đăng nhập để sử dụng chức năng chat.', confirmButtonColor: '#3085d6' });
      return;
    }

    // Tương đương với emit('toggle') của Vue
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