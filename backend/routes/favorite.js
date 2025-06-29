// routes/favoriteRoutes.js
const express = require('express')
const router = express.Router()
const favoriteController = require('../controllers/favoriteController')
const auth = require('../middleware/authMiddleware')

router.get('/', auth.verifyToken, favoriteController.getFavorites)
router.post('/add', auth.verifyToken, favoriteController.addFavorite)
router.delete('/remove/:bookId', auth.verifyToken, favoriteController.removeFavorite)

module.exports = router
