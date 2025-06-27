const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Công khai
router.get('/', bookController.getAllBooks);
router.get('/:id', bookController.getBookById);

// Admin – có upload ảnh
// ✅ Đặt upload.single('image') TRƯỚC verifyToken/verifyAdmin
router.post('/', upload.single('image'), bookController.createBook);
router.put('/:id', upload.single('image'), bookController.updateBook);

router.delete('/:id', bookController.deleteBook);

module.exports = router;
