const Rating = require('../models/Rating');
const Book = require('../models/Book');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// POST hoặc cập nhật rating (phải có đơn hàng completed)
exports.rateBook = async (req, res) => {
    try {
        const { bookId, value } = req.body;
        const userId = req.user.id;

        if (value < 1 || value > 5) {
            return res.status(400).json({ message: 'Rating phải từ 1 đến 5' });
        }

        // Nếu chưa có rating trước đó → bắt buộc phải có đơn hàng completed
        const existingRating = await Rating.findOne({ bookId, userId });
        if (!existingRating) {
            const purchasedOrder = await Order.findOne({
                user: userId,
                status: 'completed',
                'items.book': bookId
            });
            if (!purchasedOrder) {
                return res.status(403).json({ message: 'Bạn cần mua và nhận sách này trước khi đánh giá.' });
            }
        }

        const rating = await Rating.findOneAndUpdate(
            { bookId, userId },
            { value },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json(rating);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi đánh giá sách' });
    }
};

// GET điểm trung bình & số lượt đánh giá cho 1 sách
exports.getBookRating = async (req, res) => {
    try {
        const { bookId } = req.params;

        const [stats] = await Rating.aggregate([
            { $match: { bookId: new mongoose.Types.ObjectId(bookId) } },
            { $group: { _id: null, average: { $avg: '$value' }, total: { $sum: 1 } } }
        ]);

        res.json({
            average: stats ? Number(stats.average.toFixed(1)) : 0,
            total: stats?.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy điểm đánh giá' });
    }
};

exports.getMyRating = async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user.id;

        const rating = await Rating.findOne({ bookId, userId });
        res.json(rating || { value: 0 });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi lấy rating của người dùng' });
    }
};

exports.getTopRatedBooks = async (req, res) => {
    try {
        const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 10), 50);

        const topRated = await Rating.aggregate([
            {
                $group: {
                    _id: "$bookId",
                    avgRating: { $avg: "$value" },
                    totalRatings: { $sum: 1 }
                }
            },
            { $sort: { avgRating: -1, totalRatings: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "books",
                    localField: "_id",
                    foreignField: "_id",
                    as: "book"
                }
            },
            { $unwind: "$book" },
            {
                $project: {
                    _id: "$book._id",
                    title: "$book.title",
                    author: "$book.author",
                    price: "$book.price",
                    image: "$book.image",
                    genre: "$book.genre",
                    stock: "$book.stock",
                    avgRating: { $round: ["$avgRating", 1] },
                    totalRatings: 1
                }
            }
        ]);

        res.json(topRated);
    } catch (err) {
        console.error("Lỗi khi lấy top rated books:", err);
        res.status(500).json({ message: "Lỗi khi lấy sách được đánh giá cao" });
    }
};