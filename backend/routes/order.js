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

module.exports = router
