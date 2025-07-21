const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/adminController');

router.post('/login', adminController.login);
router.get('/check', adminController.checkAdmin);
router.get('/dashboard', adminController.getDashboardStats); // (nếu có)

module.exports = router;
