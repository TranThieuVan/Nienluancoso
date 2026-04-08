const express = require('express')
const router = express.Router()
const adminOrderController = require('../../controllers/admin/adminOrderController')
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware')

// Chỉ admin được truy cập
router.use(verifyToken, verifyAdmin)

router.get('/stats', adminOrderController.getOrderStats)
router.get('/', adminOrderController.getAllOrders)
router.put('/:id/refund', adminOrderController.confirmRefund);

router.put('/:id/status', adminOrderController.updateOrderStatus)
router.delete('/delete-all', adminOrderController.deleteAllOrders);
router.delete('/:id', adminOrderController.deleteOrder)
// Thêm ở dưới cùng sau các route khác
router.get('/:id', adminOrderController.getOrderById)
module.exports = router