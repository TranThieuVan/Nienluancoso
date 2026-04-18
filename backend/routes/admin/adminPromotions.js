const express = require('express');
const router = express.Router();
const adminPromotionController = require('../../controllers/admin/adminPromotionController');
const auth = require('../../middleware/authMiddleware');

// ✅ Public: bất kỳ ai cũng có thể xem danh sách khuyến mãi
router.get('/', adminPromotionController.getAllPromotions);

// 🔒 Các route bên dưới chỉ Admin mới được dùng
router.use(auth.verifyToken, auth.verifyStaff);

router.post('/', adminPromotionController.createPromotion);
router.put('/:id', adminPromotionController.updatePromotion);
router.delete('/:id', adminPromotionController.deletePromotion);

module.exports = router;