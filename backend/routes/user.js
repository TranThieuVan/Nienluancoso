const express = require('express');
const router = express.Router();
const { getMe, updateProfile, changePassword, updateEmail } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, upload.single('avatar'), updateProfile);
router.put('/change-password', verifyToken, changePassword);
router.put('/update-email', verifyToken, updateEmail);

module.exports = router;
