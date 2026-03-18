import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { io } from 'socket.io-client';

// ─── Socket URL: ưu tiên env var, fallback về origin (tự động đúng cả dev lẫn prod) ───
const SOCKET_URL = import.meta.env?.VITE_API_URL || window.location.origin;

/* ─────────────────────────────────────────────────────────────────
   MessageItem — render từng tin nhắn (memo để tránh re-render thừa)
───────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────
   ChatBox
───────────────────────────────────────────────────────────────── */
const ChatBox = ({ userId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);

  const [isBotActive, setIsBotActive] = useState(true);

  // ✅ STATE MỚI: Ẩn nút ngay lập tức khi khách vừa bấm gọi nhân viên
  const [hasRequestedHuman, setHasRequestedHuman] = useState(false);

  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const aiResponseReceivedRef = useRef(false);
  const messageContainerRef = useRef(null);

  const isBusy = isThinking || isStreaming;

  const currentUserId = useMemo(() => {
    if (userId) return String(userId);
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        return String(u._id || u.id);
      }
    } catch (err) {
      console.error('Lỗi parse user từ localStorage:', err);
    }
    return null;
  }, [userId]);

  /* ── API helpers ───────────────────────────────────────────────── */
  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.post('/api/messages/start', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversationId(res.data._id);
      setIsBotActive(res.data.isBotActive !== false);
    } catch (err) {
      console.error('Lỗi fetch conversation:', err);
      if (err.response?.status === 404) {
        alert('Hệ thống chưa có tài khoản Admin nào để nhận tin nhắn!');
      }
    }
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
    } catch (err) {
      console.error('Lỗi fetch messages:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/messages/read/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  };

  /* ── Socket: lắng nghe sự kiện ─────────────────────────────────── */
  useEffect(() => {
    if (!conversationId) return;

    const socket = io(SOCKET_URL);

    socket.on('ai_start_typing', (data) => {
      if (data.conversationId !== conversationId) return;
      setIsThinking(false);
      setIsStreaming(true);
      if (!aiResponseReceivedRef.current) {
        setMessages(prev => [
          ...prev,
          { _id: 'temp_ai', text: '', sender: 'ai_temp' },
        ]);
      }
    });

    socket.on('ai_typing_chunk', (data) => {
      if (data.conversationId !== conversationId) return;
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx]._id === 'temp_ai') {
          updated[lastIdx] = {
            ...updated[lastIdx],
            text: updated[lastIdx].text + data.content,
          };
        }
        return updated;
      });
    });

    socket.on('ai_finish_typing', (data) => {
      if (data.conversationId !== conversationId) return;
      setIsStreaming(false);
    });

    socket.on('new_message_user', (data) => {
      if (data.conversationId === conversationId && data.sender !== currentUserId) {
        setMessages(prev => [...prev, data]);
        markAsRead(conversationId);
      }
    });

    // ✅ Lắng nghe khi trạng thái Bot bị đổi 
    socket.on('bot_status_changed', (data) => {
      if (data.conversationId === conversationId) {
        setIsBotActive(data.isBotActive);
        // Nếu Admin bật lại AI -> Hiển thị lại nút gọi nhân viên cho lần sau
        if (data.isBotActive) {
          setHasRequestedHuman(false);
        }
      }
    });

    return () => socket.disconnect();
  }, [conversationId]);

  /* ── Send message ───────────────────────────────────────────────── */
  const sendMessage = async (overrideText = null) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : newMessage;
    if (!textToSend.trim() || isBusy) return;
    if (!conversationId) {
      alert('Đang kết nối, vui lòng thử lại sau giây lát.');
      return;
    }

    setNewMessage('');
    aiResponseReceivedRef.current = false;
    const isRequestingHuman = textToSend === '[REQUEST_HUMAN]';
    const tempId = Date.now().toString();

    if (!isRequestingHuman) {
      setMessages(prev => [...prev, { _id: tempId, text: textToSend, sender: currentUserId }]);
    } else {
      // ✅ Khách vừa bấm gọi nhân viên -> Ẩn nút đi lập tức
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

        if (isRequestingHuman) {
          if (res.data.userMessage) updated.push(res.data.userMessage);
        } else {
          updated = updated.map(msg => msg._id === tempId ? res.data.userMessage : msg).filter(Boolean);
        }

        if (res.data.aiMessage) {
          const hasTempAi = updated.some(m => m._id === 'temp_ai');
          if (hasTempAi) {
            updated = updated.map(m => m._id === 'temp_ai' ? res.data.aiMessage : m);
          } else {
            updated.push(res.data.aiMessage);
          }
        }

        return updated;
      });

    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
      setMessages(prev => prev.filter(m => m._id !== 'temp_ai' && m._id !== tempId));
      alert('Không thể gửi tin nhắn, vui lòng kiểm tra kết nối.');

      // Khôi phục lại nút nếu gửi lỗi
      if (isRequestingHuman) setHasRequestedHuman(false);
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
  };

  /* ── Effects ────────────────────────────────────────────────────── */
  useEffect(() => { fetchConversation(); }, []);
  useEffect(() => { if (conversationId) fetchMessages(conversationId); }, [conversationId]);
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking, isStreaming, isBotActive]);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="fixed bottom-20 right-5 z-50 w-[340px] md:w-[380px] h-[520px] bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 fade-in duration-300 origin-bottom-right">

      {/* Header */}
      <div className={`px-5 py-4 flex items-center justify-between flex-shrink-0 transition-colors ${isBotActive ? 'bg-black text-white' : 'bg-black text-white'}`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold leading-tight">{isBotActive ? 'Trợ lý AI' : 'Nhân viên CSKH'}</p>
            <p className="text-[10px] tracking-wide text-white/80">{isBotActive ? 'BookNest · Luôn sẵn sàng hỗ trợ' : 'Đang trực tuyến'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <FontAwesomeIcon icon={['fas', 'xmark']} className="text-sm" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-stone-50 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-200"
      >
        {messages.length === 0 && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-8">
            <div className={`w-12 h-12 flex items-center justify-center ${isBotActive ? 'bg-black' : 'bg-black'}`}>
              <FontAwesomeIcon icon={['fas', 'comments']} className="text-white text-lg" />
            </div>
            <div>
              <p className="text-sm font-semibold text-black">Xin chào!</p>
              <p className="text-xs text-stone-400 mt-1">Hỏi tôi về sách, phí ship, đơn hàng...</p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const senderId =
            typeof msg.sender === 'object' && msg.sender !== null
              ? String(msg.sender._id || msg.sender.id)
              : String(msg.sender);
          const isMine = senderId === currentUserId;
          return <MessageItem key={msg._id} msg={msg} isMine={isMine} />;
        })}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ✅ Bổ sung điều kiện: Chỉ hiện khi Bot Active VÀ khách chưa bấm nút gọi */}
      {isBotActive && !hasRequestedHuman && (
        <div className="px-4 py-2.5 bg-stone-100 border-t border-gray-100 text-center flex-shrink-0">
          <button
            onClick={() => sendMessage('[REQUEST_HUMAN]')}
            disabled={isBusy}
            className="text-xs font-semibold text-stone-600 hover:text-black underline transition-colors disabled:opacity-50"
          >
            Bạn cần gặp nhân viên hỗ trợ trực tiếp?
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isThinking ? 'Đang xử lý...' :
              isStreaming ? 'Đang trả lời...' :
                'Hỏi về sách, phí ship...'
          }
          className="flex-1 bg-stone-50 border border-gray-200 focus:border-black outline-none px-4 py-2.5 text-sm transition-colors placeholder:text-stone-400 disabled:opacity-50"
          disabled={isBusy}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!newMessage.trim() || isBusy}
          className={`w-10 h-10 text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 ${isBotActive ? 'bg-black hover:bg-stone-800' : 'bg-stone-500 hover:bg-black'}`}
        >
          <FontAwesomeIcon icon={['fas', 'paper-plane']} className="text-xs" />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;