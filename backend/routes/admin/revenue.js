const express = require('express');
const router = express.Router();
const adminRevenueController = require('../../controllers/admin/adminRevenueController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

// Bảo vệ tất cả route trong file này
router.use(verifyToken, verifyAdmin);

// GET /api/admin/revenue/monthly?year=2025
router.get('/monthly', adminRevenueController.getMonthlyRevenue);
router.get('/weekly', adminRevenueController.getWeeklyRevenue);
module.exports = router;
