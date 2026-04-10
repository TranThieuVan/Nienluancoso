const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController')

// Route này không có verifyToken vì GHTK là người gọi, họ không có Token đăng nhập của User
router.post('/ghtk', webhookController.ghtkWebhook);

module.exports = router;