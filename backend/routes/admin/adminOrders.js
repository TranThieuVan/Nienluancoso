const express = require('express')
const router = express.Router()
const adminOrderController = require('../../controllers/admin/adminOrderController')
// ✅ ĐÃ SỬA: Import thêm verifyStaff
const { verifyToken, verifyStaff } = require('../../middleware/authMiddleware')

// ✅ ĐÃ SỬA: Sử dụng verifyStaff cho toàn bộ route Đơn hàng
router.use(verifyToken, verifyStaff)

router.get('/stats', adminOrderController.getOrderStats)
router.get('/', adminOrderController.getAllOrders)
router.put('/:id/refund', adminOrderController.confirmRefund);
router.put('/:id/status', adminOrderController.updateOrderStatus)
router.delete('/delete-all', adminOrderController.deleteAllOrders);
router.delete('/:id', adminOrderController.deleteOrder)
router.get('/:id', adminOrderController.getOrderById)
router.get('/top-customer', adminOrderController.getTopCustomer);
module.exports = router