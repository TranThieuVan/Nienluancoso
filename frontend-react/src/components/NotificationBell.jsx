import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
const socket = io('http://localhost:5000', { transports: ['websocket'], reconnection: true });

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [toastNoti, setToastNoti] = useState(null);
    const [readIds, setReadIds] = useState([]);
    const [deletedIds, setDeletedIds] = useState([]);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const localReadIds = JSON.parse(localStorage.getItem('readNotifications')) || [];
        const localDeletedIds = JSON.parse(localStorage.getItem('deletedNotifications')) || [];
        setReadIds(localReadIds);
        setDeletedIds(localDeletedIds);

        const fetchNotifications = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/notifications');
                setNotifications(res.data);
            } catch (error) { console.error("Lỗi tải thông báo", error); }
        };
        fetchNotifications();

        const handleNewNotification = (newNoti) => {
            setNotifications(prev => [newNoti, ...prev].slice(0, 50));
            setToastNoti(newNoti);
            setTimeout(() => setToastNoti(null), 5000);
        };

        socket.on('new_notification', handleNewNotification);
        return () => { socket.off('new_notification', handleNewNotification); };
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
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
            if (deletedIds.includes(n._id)) return false;
            if (n.type === 'promotion') {
                const expiryDate = n.endDate || n.expiresAt || (n.relatedData && n.relatedData.endDate);
                if (expiryDate && new Date(expiryDate) < now) return false;
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
                    <div className="bg-white border-l-4 border-blue-500 shadow-xl rounded-r-lg p-4 w-72 flex items-start space-x-3 cursor-pointer" onClick={() => setIsOpen(true)}>
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
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-50 transition-colors text-stone-600 hover:text-black focus:outline-none"
                >
                    {/* Dùng FontAwesome giống hệt các icon kia với size 18px */}
                    <FontAwesomeIcon icon={['far', 'bell']} className="text-[20px]" />

                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[8px] font-bold text-white bg-red-600 rounded-full shadow-sm">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                {isOpen && (
                    <div className="absolute right-0 top-full mt-3 w-72 bg-white rounded-lg shadow-2xl overflow-hidden z-50 border border-gray-100">
                        <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-800">Thông báo</h3>
                            {unreadCount > 0 && <span className="text-[10px] text-blue-600 font-bold">{unreadCount} mới</span>}
                        </div>

                        <ul className="max-h-72 overflow-y-auto">
                            {displayNotifications.length > 0 ? (
                                displayNotifications.map(noti => {
                                    const isRead = readIds.includes(noti._id);
                                    return (
                                        <li
                                            key={noti._id}
                                            onClick={() => {
                                                handleMarkAsRead(noti._id);
                                                if (noti.type === 'voucher') { setIsOpen(false); navigate('/profile', { state: { tab: 'vouchers' } }); }
                                                else if (noti.type === 'promotion') {
                                                    setIsOpen(false);
                                                    if (window.location.pathname !== '/') navigate('/');
                                                    setTimeout(() => { document.getElementById('flash-sale')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
                                                }
                                                else if (noti.type === 'order') { setIsOpen(false); navigate(noti.link); }
                                            }}
                                            className={`relative px-4 py-3 border-t border-gray-50 cursor-pointer transition group ${!isRead ? 'bg-blue-50/20 hover:bg-blue-50/40' : 'bg-white hover:bg-stone-50'}`}
                                        >
                                            <button onClick={(e) => handleDelete(e, noti._id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Xóa">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>

                                            <div className="flex items-start space-x-3 pr-4">
                                                <span className="text-base mt-0.5">{noti.type === 'voucher' ? '🎟️' : '🔥'}</span>
                                                <div className="flex flex-col flex-1">
                                                    <span className={`text-[13px] ${!isRead ? 'font-bold text-black' : 'font-medium text-stone-700'}`}>{noti.title}</span>
                                                    <span className={`text-[11px] mt-0.5 line-clamp-2 ${!isRead ? 'text-stone-700' : 'text-stone-500'}`}>{noti.message}</span>
                                                    <span className="text-[9px] text-stone-400 mt-1.5">{new Date(noti.createdAt).toLocaleString('vi-VN')}</span>
                                                </div>
                                                {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>}
                                            </div>
                                        </li>
                                    )
                                })
                            ) : (
                                <li className="px-4 py-8 text-center text-xs text-stone-400">Không có thông báo mới.</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
};

export default NotificationBell;