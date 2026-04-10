const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { verifyToken, verifyStaff } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/genres', bookController.getAllGenres);
router.get('/top-selling', bookController.getTopSellingBooks);
router.get('/low-stock', verifyToken, verifyStaff, bookController.getLowStockBooks);
router.get('/analytics', verifyToken, verifyStaff, bookController.getBookManagementAnalytics);

router.get('/', bookController.getAllBooks);

router.get('/:id/recommend', bookController.getRecommendations);
router.get('/:id', bookController.getBookById);

router.post('/', verifyToken, verifyStaff, upload.single('image'), bookController.createBook);
router.put('/:id', verifyToken, verifyStaff, upload.single('image'), bookController.updateBook);
router.delete('/:id', verifyToken, verifyStaff, bookController.deleteBook);

module.exports = router; 