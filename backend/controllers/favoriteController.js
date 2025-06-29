// controllers/favoriteController.js
const Favorite = require('../models/Favorite')

// Lấy danh sách yêu thích của user
exports.getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.find({ user: req.user.id }).populate('book')
        res.json(favorites.map(fav => fav.book))
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách yêu thích' })
    }
}

// Thêm sách vào yêu thích
exports.addFavorite = async (req, res) => {
    try {
        const favorite = new Favorite({ user: req.user.id, book: req.body.bookId })
        await favorite.save()
        res.json({ message: 'Đã thêm vào yêu thích' })
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Sách đã có trong yêu thích' })
        }
        res.status(500).json({ message: 'Lỗi khi thêm yêu thích' })
    }
}

// Xoá sách khỏi yêu thích
exports.removeFavorite = async (req, res) => {
    try {
        await Favorite.findOneAndDelete({ user: req.user.id, book: req.params.bookId })
        res.json({ message: 'Đã xoá khỏi yêu thích' })
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi xoá yêu thích' })
    }
}
