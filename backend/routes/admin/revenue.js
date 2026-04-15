const express = require('express');
const router = express.Router();
const adminRevenueController = require('../../controllers/admin/adminRevenueController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware');

router.use(verifyToken, verifyAdmin);

// ✅ CHỈ CẦN 1 API DUY NHẤT CHO TOÀN BỘ DASHBOARD
router.get('/dashboard', adminRevenueController.getRevenueDashboard);

module.exports = router;