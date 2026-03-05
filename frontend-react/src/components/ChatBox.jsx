import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const ChatBox = ({ userId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messageContainerRef = useRef(null);

  // Lấy currentUserId MỘT LẦN DUY NHẤT để tối ưu hiệu năng
  const currentUserId = useMemo(() => {
    if (userId) return String(userId);
    try {
      const storedUserStr = localStorage.getItem('user');
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        return String(storedUser._id || storedUser.id);
      }
    } catch (error) {
      console.error('Lỗi parse thông tin user từ localStorage:', error);
    }
    return null;
  }, [userId]);

  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.post('/api/messages/start', {}, { headers: { Authorization: `Bearer ${token}` } });
      setConversationId(res.data._id);
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
      const res = await axios.get(`/api/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(res.data);
      await markAsRead(id);
    } catch (err) { console.error('Lỗi fetch messages:', err); }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/messages/read/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { console.error('Lỗi đánh dấu đã đọc:', err); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    if (!conversationId) {
      alert("Đang kết nối với hệ thống chat, vui lòng thử lại sau giây lát.");
      return;
    }

    const textToSend = newMessage;
    setNewMessage('');

    const tempUserId = Date.now().toString();
    const tempUserMsg = { _id: tempUserId, text: textToSend, sender: currentUserId };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/messages', {
        text: textToSend,
        conversationId: conversationId
      }, { headers: { Authorization: `Bearer ${token}` } });

      setMessages((prev) => {
        const filtered = prev.filter(msg => msg._id !== tempUserId);
        const updatedMessages = [...filtered, res.data.userMessage];

        if (res.data.aiMessage) {
          updatedMessages.push(res.data.aiMessage);
        }
        return updatedMessages;
      });

    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
      alert('Không thể gửi tin nhắn, vui lòng kiểm tra kết nối.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    fetchConversation();
  }, []);

  useEffect(() => {
    if (conversationId) fetchMessages(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    // NÂNG CẤP HIỆU ỨNG: origin-bottom-right giúp cửa sổ phóng ra từ vị trí của ChatIcon
    // bottom-20 giúp ChatBox nổi lên trên, không đè lấp mất cái icon Chat tròn tròn
    <div className="fixed bottom-20 right-4 z-50 w-[350px] md:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 fade-in duration-300 origin-bottom-right">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="font-bold tracking-wide">Trợ lý AI Nhà Sách</span>
        </div>
        <button onClick={onClose} className="hover:bg-blue-700 w-8 h-8 rounded-full flex items-center justify-center transition">✕</button>
      </div>

      {/* Nội dung tin nhắn */}
      <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => {
          const senderId = typeof msg.sender === 'object' && msg.sender !== null
            ? String(msg.sender._id || msg.sender.id)
            : String(msg.sender);

          const isMine = senderId === currentUserId;

          return (
            <div key={msg._id} className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${isMine
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                }`}
              >
                {/* TÍCH HỢP MARKDOWN GIÚP AI XUỐNG DÒNG VÀ IN ĐẬM */}
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-2 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal ml-5 mb-2 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}

        {/* Hiệu ứng AI đang gõ */}
        {isTyping && (
          <div className="w-full flex justify-start animate-in fade-in">
            <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 rounded-tl-sm shadow-sm flex gap-1.5 items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          placeholder={isTyping ? "AI đang phản hồi..." : "Hỏi về sách, phí ship..."}
          className="flex-1 border-0 bg-gray-100 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || isTyping}
          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default ChatBox;