// routes/messages.js
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// ✅ BỔ SUNG: Import verifyStaff từ middleware
const { verifyToken, verifyStaff, verifyAdmin } = require('../middleware/authMiddleware');
// 🟡 USER – Giữ nguyên verifyToken
router.post('/start', verifyToken, messageController.startConversation);
router.post('/', verifyToken, messageController.sendMessage);
router.get('/:conversationId', verifyToken, messageController.getMessages);
router.put('/:conversationId/toggle-bot', verifyToken, messageController.toggleBot);

// 🟢 ADMIN & EMPLOYEE – Thêm verifyStaff vào đây
// Thay đổi từ verifyToken thành verifyToken, verifyStaff
router.get('/admin/all', verifyToken, verifyStaff, messageController.getAllConversations);

// 🔵 Đếm số tin nhắn chưa đọc - Cũng cần verifyStaff cho Navbar Admin/Staff
router.get('/unread/count', verifyToken, verifyStaff, messageController.getUnreadCount);

// 🔵 Đánh dấu là đã đọc
router.put('/read/:conversationId', verifyToken, verifyStaff, messageController.markMessagesAsRead);
router.delete('/admin/clear-all', verifyToken, verifyAdmin, messageController.deleteAllConversations);
module.exports = router;