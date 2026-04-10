const express = require('express');
const router = express.Router();
const adminCommentController = require('../../controllers/admin/adminCommentController');
// ✅ ĐÃ SỬA: Import thêm verifyStaff
const { verifyToken, verifyStaff } = require('../../middleware/authMiddleware');

// ✅ ĐÃ SỬA: Nhân viên được quyền duyệt/ẩn Comment
router.use(verifyToken, verifyStaff);

router.get('/', adminCommentController.getAllComments);
router.put('/:id/unhide', adminCommentController.unhideComment);
router.put('/:id/hide', adminCommentController.hideComment);

module.exports = router;