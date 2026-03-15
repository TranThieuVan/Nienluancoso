import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const ChatBox = ({ userId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isBotActive, setIsBotActive] = useState(true); // ✨ Cờ hiển thị giao diện
  const messageContainerRef = useRef(null);

  const currentUserId = useMemo(() => {
    if (userId) return String(userId);
    try {
      const storedUserStr = localStorage.getItem('user');
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        return String(storedUser._id || storedUser.id);
      }
    } catch (error) { console.error('Lỗi parse user:', error); }
    return null;
  }, [userId]);

  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.post('/api/messages/start', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversationId(res.data._id);
      setIsBotActive(res.data.isBotActive !== false); // Cập nhật trạng thái Bot
    } catch (err) {
      console.error('Lỗi fetch conversation:', err);
    }
  };

  const fetchMessages = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`/api/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
      await markAsRead(id);
    } catch (err) { console.error('Lỗi fetch messages:', err); }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/messages/read/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) { }
  };

  // ✨ Hàm gọi nhân viên thật
  const requestHuman = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/messages/${conversationId}/toggle-bot`, { isBotActive: false }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsBotActive(false);
      setMessages(prev => [...prev, {
        _id: Date.now().toString(),
        text: "Hệ thống đang kết nối bạn với nhân viên hỗ trợ. Vui lòng đợi trong giây lát!",
        sender: "system"
      }]);
    } catch (err) { console.error(err); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    const textToSend = newMessage;
    setNewMessage('');

    const tempId = Date.now().toString();
    setMessages((prev) => [...prev, { _id: tempId, text: textToSend, sender: currentUserId }]);

    // Nếu Bot đang bật thì mới hiện hiệu ứng gõ phím
    if (isBotActive) setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/messages', {
        text: textToSend,
        conversationId
      }, { headers: { Authorization: `Bearer ${token}` } });

      setMessages((prev) => {
        const filtered = prev.filter(msg => msg._id !== tempId);
        const updated = [...filtered, res.data.userMessage];
        if (res.data.aiMessage) updated.push(res.data.aiMessage);
        return updated;
      });
    } catch (err) {
      alert('Không thể gửi tin nhắn, vui lòng thử lại.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
  };

  useEffect(() => { fetchConversation(); }, []);
  useEffect(() => { if (conversationId) fetchMessages(conversationId); }, [conversationId]);
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="fixed bottom-20 right-5 z-50 w-[340px] md:w-[380px] h-[520px] bg-white border border-gray-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 fade-in duration-300 origin-bottom-right">

      {/* Header */}
      <div className={`${isBotActive ? 'bg-black' : 'bg-green-600'} text-white px-5 py-4 flex items-center justify-between flex-shrink-0 transition-colors`}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold leading-tight">{isBotActive ? 'Trợ lý AI' : 'Nhân viên hỗ trợ'}</p>
            <p className="text-[10px] text-stone-200 tracking-wide">BookNest · Luôn sẵn sàng hỗ trợ</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-black/20 rounded transition-colors">
          <FontAwesomeIcon icon={['fas', 'xmark']} className="text-sm" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-stone-50"
      >
        {messages.map((msg) => {
          const senderId = typeof msg.sender === 'object' && msg.sender !== null
            ? String(msg.sender._id || msg.sender.id)
            : String(msg.sender);

          const isMine = senderId === currentUserId;
          const isSystem = senderId === 'system'; // Render tin nhắn hệ thống

          if (isSystem) {
            return (
              <div key={msg._id} className="text-center text-xs font-medium text-stone-500 my-4 bg-stone-200/50 py-1.5 rounded-full px-4 w-fit mx-auto">
                {msg.text}
              </div>
            );
          }

          return (
            <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-3 max-w-[82%] text-sm leading-relaxed ${isMine
                ? 'bg-black text-white'
                : 'bg-white border border-gray-100 text-stone-700 shadow-sm'
                }`}>
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className={`font-semibold ${isMine ? 'text-white' : 'text-black'}`} {...props} />,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nút Gọi Nhân Viên */}
      {messages.length > 0 && isBotActive && (
        <div className="px-4 py-2 bg-stone-50 border-t border-gray-100 flex justify-center">
          <button onClick={requestHuman} className="text-[11px] font-medium text-stone-500 hover:text-black hover:underline transition-all">
            Cần gặp nhân viên hỗ trợ thực?
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
          disabled={isTyping}
          placeholder="Hỏi về sách, phí ship..."
          className="flex-1 bg-stone-50 border border-gray-200 focus:border-black outline-none px-4 py-2.5 text-sm transition-colors disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || isTyping}
          className="w-10 h-10 bg-black text-white flex items-center justify-center hover:bg-stone-800 transition-colors disabled:opacity-30"
        >
          <FontAwesomeIcon icon={['fas', 'paper-plane']} className="text-xs" />
        </button>
      </div>
    </div>
  );
};

export default ChatBox;