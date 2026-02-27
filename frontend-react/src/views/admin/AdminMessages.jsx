import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AdminMessages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
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
    } catch (err) {
      console.error('Lỗi fetch conversations:', err);
    }
  };

  const selectConversation = async (conv) => {
    try {
      setSelectedConversation(conv);

      // Đánh dấu đã đọc cục bộ
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
        _id: res.data._id,
        text: messageText,
        sender: { role: 'admin' }
      };

      setMessages(prev => [...prev, newMsg]);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    }
  };

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  return (
    <div className="flex bg-white" style={{ height: 'calc(100vh - 50px)' }}>
      {/* Sidebar */}
      <div className="w-1/3 border-r overflow-y-auto p-4">
        <h2 className="text-xl font-bold mb-4">Khách hàng</h2>
        {conversations.map((conv) => (
          <div
            key={conv._id}
            onClick={() => selectConversation(conv)}
            className={`p-3 rounded cursor-pointer hover:bg-gray-100 flex items-center justify-between ${selectedConversation?._id === conv._id ? 'bg-gray-200' : ''
              }`}
          >
            <div className="flex items-center gap-3">
              <img src={`/${conv.participants[0]?.avatar}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              <span className="truncate">{conv.participant?.name || 'Người dùng'}</span>
            </div>
            {conv.unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {conv.unreadCount}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Main Chat */}
      <div className="w-2/3 flex flex-col">
        <div className="p-4 border-b font-bold text-lg bg-gray-50">
          {selectedConversation?.participant?.name || 'Chọn hội thoại'}
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