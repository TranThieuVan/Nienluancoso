const express = require('express');
const router = express.Router();
const vnpayController = require('../controllers/vnpayController');

// Route này frontend sẽ gọi để lấy link
router.post('/create_payment_url', vnpayController.createPaymentUrl);

module.exports = router;