const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { verifyToken } = require('../middleware/authMiddleware'); // Destructuring cho gọn

// Áp dụng middleware cho tất cả các route bên dưới
router.use(verifyToken);

router.post('/', addressController.createAddress);
router.get('/', addressController.getMyAddresses);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);

module.exports = router;