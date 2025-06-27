const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const multer = require('multer');
const path = require('path');

// Cấu hình multer để lưu ảnh vào uploads/avatars
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

router.post('/register', upload.single('avatar'), register);
router.post('/login', login);

module.exports = router;
