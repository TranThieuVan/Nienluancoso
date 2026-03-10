const express = require('express');
const router = express.Router();
const adminVoucherController = require('../../controllers/admin/adminVoucherController');
const { verifyToken, verifyAdmin } = require('../../middleware/authMiddleware')

// Áp dụng middleware bảo mật: Chỉ Admin mới được vào
router.use(verifyToken, verifyAdmin);

router.get('/', adminVoucherController.getAllVouchers);
router.post('/', adminVoucherController.createVoucher);
router.put('/:id', adminVoucherController.updateVoucher);
router.delete('/:id', adminVoucherController.deleteVoucher);

module.exports = router;