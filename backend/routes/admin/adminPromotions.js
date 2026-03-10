const express = require('express');
const router = express.Router();
const adminPromotionController = require('../../controllers/admin/adminPromotionController');
const auth = require('../../middleware/authMiddleware');

// Áp dụng bảo vệ: Chỉ Admin mới được quản lý
router.use(auth.verifyToken, auth.verifyAdmin);

router.get('/', adminPromotionController.getAllPromotions);
router.post('/', adminPromotionController.createPromotion);
router.put('/:id', adminPromotionController.updatePromotion);
router.delete('/:id', adminPromotionController.deletePromotion);

module.exports = router;