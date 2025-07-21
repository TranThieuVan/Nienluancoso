// routes/messages.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken } = require('../middleware/authMiddleware');

// 🟡 USER – Gửi tin, xem tin
router.post('/start', verifyToken, messageController.startConversation);
router.post('/', verifyToken, messageController.sendMessage);
router.get('/:conversationId', verifyToken, messageController.getMessages);

// 🟢 ADMIN – Xem danh sách conversation
router.get('/admin/all', verifyToken, messageController.getAllConversations);


// 🔵 Đếm số tin nhắn chưa đọc
router.get('/unread/count', verifyToken, messageController.getUnreadCount);

// 🔵 Đánh dấu là đã đọc
router.put('/read/:conversationId', verifyToken, messageController.markMessagesAsRead);

module.exports = router;
