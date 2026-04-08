const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/genres', bookController.getAllGenres);
router.get('/top-selling', bookController.getTopSellingBooks);
router.get('/low-stock', verifyToken, verifyAdmin, bookController.getLowStockBooks);
router.get('/analytics', verifyToken, verifyAdmin, bookController.getBookManagementAnalytics);

router.get('/', bookController.getAllBooks);

router.get('/:id/recommend', bookController.getRecommendations);
router.get('/:id', bookController.getBookById);

router.post('/', verifyToken, verifyAdmin, upload.single('image'), bookController.createBook);
router.put('/:id', verifyToken, verifyAdmin, upload.single('image'), bookController.updateBook);
router.delete('/:id', verifyToken, verifyAdmin, bookController.deleteBook);

module.exports = router;