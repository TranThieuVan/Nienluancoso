const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');
const { verifyToken, verifyStaff } = require('../../middleware/authMiddleware')
router.use(verifyToken, verifyStaff)

const adminDashboardController = require('../../controllers/admin/adminDashBoardController');

router.post('/login', adminController.login);
router.get('/check', adminController.checkAdmin);
router.get('/dashboard', adminController.getDashboardStats); // (nếu có)

// THÊM 2 DÒNG MỚI NÀY VÀO:
router.get('/dashboard/overview', adminDashboardController.getDashboardOverview);
router.get('/dashboard/analytics', adminDashboardController.getDashboardAnalytics);
router.get('/dashboard/top', adminDashboardController.getTopData);
module.exports = router;