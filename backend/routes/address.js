const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware.verifyToken, addressController.createAddress);
router.get('/', authMiddleware.verifyToken, addressController.getMyAddresses);
router.put('/:id', authMiddleware.verifyToken, addressController.updateAddress);
router.delete('/:id', authMiddleware.verifyToken, addressController.deleteAddress);

module.exports = router;
