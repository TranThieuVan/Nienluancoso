const express = require('express');
const router = express.Router();
const { getMe, updateProfile, changePassword, updateEmail } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Cấu hình multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/avatars');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, upload.single('avatar'), updateProfile);
router.put('/change-password', verifyToken, changePassword);
router.put('/update-email', verifyToken, updateEmail);
module.exports = router;
