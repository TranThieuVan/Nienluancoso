const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');

// Lấy tất cả bình luận của một sách
router.get('/:bookId/comments', commentController.getCommentsByBook);

// Tạo bình luận (cần đăng nhập)
router.post('/', authMiddleware.verifyToken, commentController.createComment);

// Xoá bình luận (chỉ chủ sở hữu hoặc admin)
router.delete('/:id', authMiddleware.verifyToken, commentController.deleteComment);

module.exports = router;
