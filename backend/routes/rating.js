// routes/ratingRoutes.js
const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth.verifyToken, ratingController.rateBook);
router.get('/:bookId/rating', ratingController.getBookRating);
// Lấy rating hiện tại của người dùng cho 1 sách
router.get('/:bookId/my', auth.verifyToken, ratingController.getMyRating);

module.exports = router;
