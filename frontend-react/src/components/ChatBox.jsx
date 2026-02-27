import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatBox = ({ userId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const messageContainerRef = useRef(null);

  // Lấy thông tin cuộc trò chuyện
  const fetchConversation = async () => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.post('/api/messages/start', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConversationId(res.data._id);
    } catch (err) {
      console.error('Lỗi fetch conversation:', err);
    }
  };

  // Lấy danh sách tin nhắn
  const fetchMessages = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get(`/api/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(res.data);
      await markAsRead(id);
    } catch (err) {
      console.error('Lỗi fetch messages:', err);
    }
  };

  // Đánh dấu đã đọc
  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.put(`/api/messages/read/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  };

  // Gửi tin nhắn
  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.post('/api/messages', {
        text: newMessage,
        conversationId: conversationId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Thêm tin nhắn mới vào mảng hiện tại
      setMessages((prev) => [
        ...prev,
        { ...res.data, sender: { _id: userId } }
      ]);
      setNewMessage('');
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    }
  };

  // Xử lý sự kiện Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Tương đương với watch(() => props.userId) có immediate: true
  useEffect(() => {
    if (userId) {
      fetchConversation();
    }
  }, [userId]);

  // Tự động gọi fetchMessages khi đã có conversationId
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId]);

  // Cuộn xuống cuối (Tương đương nextTick)
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[400px] max-h-[500px] min-h-[400px] bg-white rounded-lg shadow-lg flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 flex justify-between items-center rounded-t-lg">
        <span>Hỗ trợ khách hàng</span>
        <button onClick={onClose}>❌</button>
      </div>

      {/* Nội dung tin nhắn */}
      <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => {
          const isMine = msg.sender?._id === userId;

          return (
            <div
              key={msg._id}
              className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`px-3 py-2 rounded-lg max-w-[80%] break-words ${isMine ? 'bg-blue-100 text-right' : 'bg-gray-200 text-left'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button onClick={sendMessage} className="text-blue-600 font-semibold">
          Gửi
        </button>
      </div>
    </div>
  );
};

export default ChatBox;