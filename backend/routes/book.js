const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { verifyToken, verifyStaff } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// 🟢 CÁC ROUTE CỐ ĐỊNH (Phải để lên trên cùng)
router.get('/genres', bookController.getAllGenres);
router.get('/publishers', bookController.getAllPublishers); // ✅ ĐÃ THÊM VÀO ĐÂY
router.get('/top-selling', bookController.getTopSellingBooks);
router.get('/low-stock', verifyToken, verifyStaff, bookController.getLowStockBooks);
router.get('/analytics', verifyToken, verifyStaff, bookController.getBookManagementAnalytics);

router.get('/', bookController.getAllBooks);

// 🟡 CÁC ROUTE ĐỘNG (Có chứa :id - Phải xếp xuống dưới)
router.get('/:id/recommend', bookController.getRecommendations);
router.get('/:id', bookController.getBookById);

// 🔴 CÁC ROUTE QUẢN TRỊ (POST/PUT/DELETE)
router.post('/', verifyToken, verifyStaff, upload.single('image'), bookController.createBook);
router.put('/:id', verifyToken, verifyStaff, upload.single('image'), bookController.updateBook);
router.delete('/:id', verifyToken, verifyStaff, bookController.deleteBook);

module.exports = router;