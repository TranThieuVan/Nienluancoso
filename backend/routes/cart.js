const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken } = require('../middleware/authMiddleware');

// 💼 Yêu cầu đăng nhập để thao tác với giỏ hàng
router.get('/', verifyToken, cartController.getCart);
router.post('/add', verifyToken, cartController.addToCart);
router.delete('/remove/:bookId', verifyToken, cartController.removeFromCart);
router.put('/update', verifyToken, cartController.updateQuantity);


module.exports = router;
