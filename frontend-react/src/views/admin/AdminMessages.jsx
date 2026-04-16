import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AdminMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // ✨ Thêm state tìm kiếm
  const messageContainerRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await axios.get('/api/messages/admin/all', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });

      const unique = [];
      const seen = new Set();

      for (const conv of res.data) {
        const user = conv.participants?.find(p => p.role === 'user');
        if (user && !seen.has(user._id)) {
          unique.push({
            ...conv,
            participant: user,
            unreadCount: conv.unreadCount || 0
          });
          seen.add(user._id);
        }
      }

      setConversations(unique);

      // ✨ Auto focus vào khách hàng đầu tiên khi vừa tải xong danh sách
      if (unique.length > 0 && !selectedConversation) {
        selectConversation(unique[0]);
      }

    } catch (err) {
      console.error('Lỗi fetch conversations:', err);
    }
  };

  const selectConversation = async (conv) => {
    try {
      setSelectedConversation(conv);

      setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unreadCount: 0 } : c));

      await axios.put(`/api/messages/read/${conv._id}`, null, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });

      const res = await axios.get(`/api/messages/${conv._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });

      setMessages(res.data);
    } catch (err) {
      console.error('Lỗi fetch messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      const res = await axios.post('/api/messages', {
        conversationId: selectedConversation._id,
        text: messageText
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });

      const newMsg = {
        _id: res.data.userMessage?._id || Date.now().toString(),
        text: messageText,
        sender: { role: 'admin' }
      };

      setMessages(prev => [...prev, newMsg]);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    }
  };

  const toggleBot = async () => {
    try {
      const newStatus = !selectedConversation.isBotActive;
      await axios.put(`/api/messages/${selectedConversation._id}/toggle-bot`, { isBotActive: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });

      setSelectedConversation(prev => ({ ...prev, isBotActive: newStatus }));
      setConversations(prev => prev.map(c => c._id === selectedConversation._id ? { ...c, isBotActive: newStatus } : c));
    } catch (err) { console.error('Lỗi cập nhật trạng thái Bot:', err); }
  };

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  // ✨ Lọc danh sách khách hàng dựa trên từ khóa tìm kiếm
  const filteredConversations = conversations.filter(conv =>
    conv.participant?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex bg-white" style={{ height: 'calc(100vh - 50px)' }}>
      {/* Sidebar */}
      <div className="w-1/3 border-r flex flex-col p-4">
        <h2 className="text-xl font-bold mb-4">Khách hàng</h2>

        {/* ✨ Input Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Tìm tên khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          />
        </div>

        {/* Danh sách cuộn được */}
        <div className="overflow-y-auto flex-1 pr-1 -mr-1">
          {filteredConversations.map((conv) => (
            <div
              key={conv._id}
              onClick={() => selectConversation(conv)}
              className={`p-3 mb-1 rounded cursor-pointer hover:bg-gray-100 flex select-none items-center justify-between transition-colors ${selectedConversation?._id === conv._id ? 'bg-gray-200' : ''
                }`}
            >
              <div className="flex items-center gap-3">
                <img src={`/${conv.participants[0]?.avatar || 'default-avatar.png'}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                <div className="flex flex-col">
                  <span className="truncate font-medium">{conv.participant?.name || 'Người dùng'}</span>
                  {conv.isBotActive === false && <span className="text-xs text-red-500 font-semibold mt-0.5">⚠️ Đang gọi Admin</span>}
                </div>
              </div>
              {conv.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {conv.unreadCount}
                </span>
              )}
            </div>
          ))}

          {/* Hiển thị khi không tìm thấy kết quả */}
          {filteredConversations.length === 0 && (
            <div className="text-center text-gray-500 mt-4 text-sm">
              Không tìm thấy khách hàng "{searchTerm}"
            </div>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="w-2/3 flex flex-col">
        <div className="p-4 border-b font-bold text-lg bg-gray-50 flex justify-between items-center">
          <span>{selectedConversation?.participant?.name || 'Chọn hội thoại'}</span>

          {selectedConversation && (
            <button
              onClick={toggleBot}
              className={`text-sm px-4 py-1.5 select-none rounded font-medium transition-colors ${selectedConversation.isBotActive
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-red-500 text-white hover:bg-red-600 shadow-sm animate-pulse'
                }`}
            >
              {selectedConversation.isBotActive ? '🤖 AI đang Chat (Tắt AI)' : '👨‍💻 Tắt AI (Bật lại AI)'}
            </button>
          )}
        </div>

        <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg) => (
            <div key={msg._id} className={msg.sender.role === 'admin' ? 'text-right' : 'text-left'}>
              <div className={`inline-block px-3 py-2 rounded-lg max-w-[70%] text-left ${msg.sender.role === 'admin' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex gap-2 items-center">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Nhập tin nhắn..."
            disabled={!selectedConversation}
          />
          <button
            onClick={sendMessage}
            disabled={!selectedConversation}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;