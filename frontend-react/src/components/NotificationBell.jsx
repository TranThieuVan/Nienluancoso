import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

// Khởi tạo socket ở BÊN NGOÀI component
const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    reconnection: true
});

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [toastNoti, setToastNoti] = useState(null);
    const [readIds, setReadIds] = useState([]);

    const [deletedIds, setDeletedIds] = useState([]);
    const dropdownRef = useRef(null);

    useEffect(() => {
        // Khôi phục trạng thái "đã đọc" và "đã xoá" từ localStorage
        const localReadIds = JSON.parse(localStorage.getItem('readNotifications')) || [];
        const localDeletedIds = JSON.parse(localStorage.getItem('deletedNotifications')) || [];
        setReadIds(localReadIds);
        setDeletedIds(localDeletedIds);

        const fetchNotifications = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/notifications');
                setNotifications(res.data);
            } catch (error) {
                console.error("Lỗi tải thông báo", error);
            }
        };
        fetchNotifications();

        const handleNewNotification = (newNoti) => {
            setNotifications(prev => [newNoti, ...prev].slice(0, 50));
            setToastNoti(newNoti);
            setTimeout(() => setToastNoti(null), 5000);
        };

        socket.on('new_notification', handleNewNotification);

        return () => {
            socket.off('new_notification', handleNewNotification);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = (id) => {
        if (!readIds.includes(id)) {
            const newReadIds = [...readIds, id];
            setReadIds(newReadIds);
            localStorage.setItem('readNotifications', JSON.stringify(newReadIds));
        }
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        const newDeletedIds = [...deletedIds, id];
        setDeletedIds(newDeletedIds);
        localStorage.setItem('deletedNotifications', JSON.stringify(newDeletedIds));
    };

    const { visibleNotifications, unreadCount } = useMemo(() => {
        const now = new Date();
        const visible = notifications.filter(n => {
            // 1. Ẩn nếu nằm trong danh sách đã người dùng chủ động xóa
            if (deletedIds.includes(n._id)) return false;

            // 2. TỰ ĐỘNG ẨN: Nếu là promotion và đã qua ngày kết thúc
            // (Lưu ý: Đảm bảo Backend trả về field endDate hoặc expiresAt cho thông báo loại này)
            if (n.type === 'promotion') {
                const expiryDate = n.endDate || n.expiresAt || (n.relatedData && n.relatedData.endDate);
                if (expiryDate && new Date(expiryDate) < now) {
                    return false; // Hết hạn -> tự ẩn
                }
            }

            return true;
        });

        const unread = visible.filter(n => !readIds.includes(n._id)).length;
        return { visibleNotifications: visible, unreadCount: unread };
    }, [notifications, deletedIds, readIds]);

    const displayNotifications = visibleNotifications.slice(0, 5);

    return (
        <>
            {toastNoti && (
                <div className="fixed top-24 right-5 z-[9999] animate-bounce">
                    <div className="bg-white border-l-4 border-blue-500 shadow-xl rounded-r-lg p-4 w-80 flex items-start space-x-3 cursor-pointer" onClick={() => setIsOpen(true)}>
                        <span className="text-2xl">{toastNoti.type === 'voucher' ? '🎟️' : '🔥'}</span>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-800">{toastNoti.title}</h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{toastNoti.message}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setToastNoti(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                </div>
            )}

            <div className="relative flex items-center" ref={dropdownRef}>
                <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-600 hover:text-black transition focus:outline-none">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border border-white shadow-sm">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-2xl overflow-hidden z-50 border border-gray-100">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-800">Thông báo mới</h3>
                            {unreadCount > 0 && <span className="text-xs text-blue-600">{unreadCount} chưa đọc</span>}
                        </div>

                        <ul className="max-h-80 overflow-y-auto">
                            {displayNotifications.length > 0 ? (
                                displayNotifications.map(noti => {
                                    const isRead = readIds.includes(noti._id);
                                    return (
                                        <li
                                            key={noti._id}
                                            onClick={() => {
                                                handleMarkAsRead(noti._id);

                                                // CHUYỂN HƯỚNG TÙY THEO LOẠI THÔNG BÁO
                                                if (noti.type === 'voucher') {
                                                    setIsOpen(false);
                                                    navigate('/profile', { state: { tab: 'vouchers' } });
                                                } else if (noti.type === 'promotion') {
                                                    setIsOpen(false);

                                                    // Nếu chưa ở trang chủ thì điều hướng về trang chủ trước
                                                    if (window.location.pathname !== '/') {
                                                        navigate('/');
                                                    }

                                                    // Dùng timeout nhỏ để đảm bảo trang (và section) đã kịp render 
                                                    setTimeout(() => {
                                                        const flashSaleSection = document.getElementById('flash-sale');
                                                        if (flashSaleSection) {
                                                            // Cuộn mượt mà đến khu vực giảm giá
                                                            flashSaleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                        }
                                                    }, 300);
                                                } else if (noti.type === 'order') {
                                                    setIsOpen(false);
                                                    navigate(noti.link); // Sẽ bay tới http://localhost:5174/orders/ID_DON_HANG
                                                }
                                            }}
                                            className={`relative px-4 py-3 border-b border-gray-50 cursor-pointer transition group
                        ${!isRead ? 'bg-blue-50/30 hover:bg-blue-50' : 'bg-white hover:bg-gray-50'}
                      `}
                                        >
                                            <button
                                                onClick={(e) => handleDelete(e, noti._id)}
                                                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                title="Xóa thông báo"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>

                                            <div className="flex items-start space-x-3 pr-4">
                                                <span className="text-lg mt-0.5">{noti.type === 'voucher' ? '🎟️' : '🔥'}</span>
                                                <div className="flex flex-col flex-1">
                                                    <span className={`text-sm ${!isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                        {noti.title}
                                                    </span>
                                                    <span className={`text-xs mt-1 line-clamp-2 ${!isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                                                        {noti.message}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 mt-2">
                                                        {new Date(noti.createdAt).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                                {!isRead && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>}
                                            </div>
                                        </li>
                                    )
                                })
                            ) : (
                                <li className="px-4 py-8 text-center text-sm text-gray-500">
                                    Chưa có thông báo nào.
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
};

export default NotificationBell;