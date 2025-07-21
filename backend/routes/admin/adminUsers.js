const express = require('express');
const router = express.Router();
const adminUserController = require('../../controllers/admin/adminUserController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

// Dùng middleware xác thực và kiểm tra admin cho tất cả route dưới đây
router.use(verifyToken, verifyAdmin);

router.get('/', adminUserController.getAllUsers);
router.put('/:id/toggle-lock', adminUserController.toggleUserLock);
router.put('/:id/role', adminUserController.updateRole);

module.exports = router;
