const express = require('express');
const router = express.Router();
const adminCommentController = require('../../controllers/admin/adminCommentController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

// Áp dụng middleware cho toàn bộ route trong file này
router.use(verifyToken, verifyAdmin);

// Lấy tất cả bình luận (phân trang, lọc)
router.get('/', adminCommentController.getAllComments);

// Xoá bình luận
router.put('/:id/hide', adminCommentController.hideComment);

module.exports = router;
