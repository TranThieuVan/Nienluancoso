const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const auth = require('../middleware/authMiddleware')

// Tạo đơn hàng
router.post('/', auth.verifyToken, orderController.createOrder)

// Lấy đơn hàng của người dùng hiện tại
router.get('/', auth.verifyToken, orderController.getMyOrders)

// Lấy chi tiết đơn hàng theo ID
router.get('/:id', auth.verifyToken, orderController.getOrderById)

// Hủy đơn hàng
router.put('/cancel/:id', auth.verifyToken, orderController.cancelOrder)
router.put('/:id/request-return', auth.verifyToken, orderController.requestReturn);
router.put('/:id/submit-tracking', auth.verifyToken, orderController.submitReturnTracking);
router.put('/:id/pay', orderController.updateOrderToPaid);

module.exports = router
