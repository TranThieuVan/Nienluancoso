// routes/voucher.js
const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const auth = require('../middleware/authMiddleware'); // Đảm bảo bạn gọi đúng đường dẫn middleware

router.post('/apply', auth.verifyToken, voucherController.applyVoucher);
router.get('/active', auth.verifyToken, voucherController.getActiveVouchers);
module.exports = router;