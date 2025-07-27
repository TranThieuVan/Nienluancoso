const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Công khai
router.get('/genres', bookController.getAllGenres);
router.get('/top-selling', bookController.getTopSellingBooks)// ✅ Đưa lên trước
router.get('/low-stock', bookController.getLowStockBooks);
router.get('/', bookController.getAllBooks);
router.get('/:id', bookController.getBookById);
// Admin – có upload ảnh
router.post('/', upload.single('image'), bookController.createBook);
router.put('/:id', upload.single('image'), bookController.updateBook);
router.delete('/:id', bookController.deleteBook);

module.exports = router;
