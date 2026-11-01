import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

const MessageItem = React.memo(({ msg, isMine }) => (
  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
    <div className={`px-4 py-3 max-w-[82%] text-sm leading-relaxed ${isMine
      ? 'bg-black text-white'
      : 'bg-white border border-gray-100 text-stone-700 shadow-sm'
      }`}>
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li {...props} />,
          strong: ({ node, ...props }) => (
            <strong className={`font-semibold ${isMine ? 'text-white' : 'text-black'}`} {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-blue-500 underline hover:text-blue-700" target="_blank" rel="noreferrer" {...props} />
          )
        }}
      >
        {msg.text}
      </ReactMarkdown>
    </div>
  </div>
));

const ChatBox = ({ userId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isBotActive, setIsBotActive] = useState(true);
  const [hasRequestedHuman, setHasRequestedHuman] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const aiResponseReceivedRef = useRef(false);
  const messageContainerRef = useRef(null);
  const inputRef = useRef(null);
  const isBusy = isThinking || isStreaming;

  const currentUserId = useMemo(() => {
    if (userId) return String(userId);
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        return String(u._id || u.id);
      }
    } catch (err) { console.error('Lỗi parse user:', err); }
    return null;
  }, [userId]);

  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.post('/api/messages/start', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversationId(res.data._id);
      setIsBotActive(res.data.isBotActive !== false);
    } catch (err) { console.error('Lỗi fetch conversation:', err); }
  };

  const fetchMessages = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`/api/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data);
      await markAsRead(id);
    } catch (err) { console.error('Lỗi fetch messages:', err); }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/messages/read/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) { console.error('Lỗi đánh dấu đã đọc:', err); }
  };

  /* ── Socket: Khôi phục cả 2 listener và thêm check ID ── */
  useEffect(() => {
    if (!conversationId) return;
    const socket = io(SOCKET_URL);
    socket.emit('join', conversationId);

    // 1. Listener cho tin nhắn chung (Admin/User)
    socket.on('newMessage', (data) => {
      const senderId = data.sender?._id || data.sender;
      if (String(data.conversationId) === String(conversationId) && String(senderId) !== String(currentUserId)) {
        setMessages(prev => {
          if (prev.some(m => String(m._id) === String(data._id))) return prev;
          return [...prev, data];
        });
        markAsRead(conversationId);
      }
    });

    // 2. Listener cho tin nhắn Bot (Cái bạn cần giữ lại)
    socket.on('new_message_user', (data) => {
      const senderId = data.sender?._id || data.sender;
      if (String(data.conversationId) === String(conversationId) && String(senderId) !== String(currentUserId)) {
        setMessages(prev => {
          // ✅ CHECK ID CỰC KỲ QUAN TRỌNG: Ngăn chặn Bot bị nhân đôi
          if (prev.some(m => String(m._id) === String(data._id))) return prev;
          return [...prev, data];
        });
        markAsRead(conversationId);
      }
    });

    socket.on('botStatusChanged', (data) => {
      if (String(data.conversationId) === String(conversationId)) {
        setIsBotActive(data.isBotActive);
        if (data.isBotActive) setHasRequestedHuman(false);
      }
    });

    return () => socket.disconnect();
  }, [conversationId, currentUserId]);

  /* ── Send message: Tối ưu hóa việc cập nhật state từ API ── */
  const sendMessage = async (overrideText = null) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : newMessage;
    if (!textToSend.trim() || isBusy) return;
    if (!conversationId) return;

    setNewMessage('');
    aiResponseReceivedRef.current = false;
    const isRequestingHuman = textToSend === '[REQUEST_HUMAN]';
    const tempId = Date.now().toString();

    if (!isRequestingHuman) {
      setMessages(prev => [...prev, { _id: tempId, text: textToSend, sender: currentUserId }]);
    } else {
      setHasRequestedHuman(true);
    }

    setIsThinking(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/messages',
        { text: textToSend, conversationId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      aiResponseReceivedRef.current = true;

      setMessages(prev => {
        let updated = [...prev];

        // Thay thế tin nhắn tạm của User
        if (isRequestingHuman) {
          if (res.data.userMessage && !updated.some(m => String(m._id) === String(res.data.userMessage._id))) {
            updated.push(res.data.userMessage);
          }
        } else {
          updated = updated.map(msg => msg._id === tempId ? res.data.userMessage : msg);
        }

        // ✅ CHỈ ADD TIN NHẮN AI NẾU SOCKET CHƯA KỊP ADD (Để tránh lặp)
        if (res.data.aiMessage) {
          const alreadyExists = updated.some(m => String(m._id) === String(res.data.aiMessage._id));
          if (!alreadyExists) {
            updated.push(res.data.aiMessage);
          }
        }

        return updated.filter(Boolean);
      });

    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
      setMessages(prev => prev.filter(m => m._id !== tempId));
      if (isRequestingHuman) setHasRequestedHuman(false);
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } };

  useEffect(() => { fetchConversation(); }, []);
  useEffect(() => { if (conversationId) fetchMessages(conversationId); }, [conversationId]);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking, isStreaming, isBotActive]);

  return (
    <div className="fixed bottom-20 right-5 z-50 w-[340px] md:w-[380px] h-[520px] bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 fade-in duration-300 origin-bottom-right">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0 select-none bg-black text-white">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold leading-tight">{isBotActive ? 'Trợ lý AI' : 'Nhân viên CSKH'}</p>
            <p className="text-[10px] tracking-wide text-white/80">{isBotActive ? 'BookNest · Here to help' : 'Online now'}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <FontAwesomeIcon icon={['fas', 'xmark']} className="text-sm" />
        </button>
      </div>

      {/* Messages */}
      <div ref={messageContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-stone-50 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-200">
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-8">
            <div className="w-12 h-12 flex items-center justify-center bg-black">
              <FontAwesomeIcon icon={['fas', 'comments']} className="text-white text-lg" />
            </div>
            <div>
              <p className="text-sm font-semibold text-black">Hello!</p>
              <p className="text-xs text-stone-400 mt-1">Ask about books, shipping, or orders.</p>
            </div>
          </div>
        )}
        {messages.map((msg) => {
          const senderId = typeof msg.sender === 'object' && msg.sender !== null ? String(msg.sender._id || msg.sender.id) : String(msg.sender);
          return <MessageItem key={msg._id} msg={msg} isMine={senderId === currentUserId} />;
        })}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gọi nhân viên */}
      {isBotActive && !hasRequestedHuman && (
        <div className="px-4 py-2.5 bg-stone-100 border-t border-gray-100 text-center flex-shrink-0">
          <button onClick={() => sendMessage('[REQUEST_HUMAN]')} disabled={isBusy} className="text-xs font-semibold text-stone-600 hover:text-black underline transition-colors disabled:opacity-50">
            Need help from a support agent?
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
        <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder={isThinking ? 'Thinking...' : 'Ask about books or shipping...'} className="flex-1 bg-stone-50 border border-gray-200 focus:border-black outline-none px-4 py-2.5 text-sm transition-colors disabled:opacity-50" disabled={isBusy} />
        <button onClick={() => sendMessage()} disabled={!newMessage.trim() || isBusy} className={`w-10 h-10 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 ${isBotActive ? 'bg-black hover:bg-stone-800' : 'bg-stone-500 hover:bg-black'}`}>
          <FontAwesomeIcon icon={['fas', 'paper-plane']} className="text-xs" />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;