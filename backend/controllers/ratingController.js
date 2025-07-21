// controllers/ratingController.js
const Rating = require('../models/Rating');
const Book = require('../models/Book');

// POST hoặc cập nhật rating
exports.rateBook = async (req, res) => {
    try {
        const { bookId, value } = req.body;
        const userId = req.user.id;

        if (value < 1 || value > 5) {
            return res.status(400).json({ message: 'Rating phải từ 1 đến 5' });
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

        const ratings = await Rating.find({ bookId });
        const total = ratings.length;
        const avg = total ? (ratings.reduce((sum, r) => sum + r.value, 0) / total).toFixed(1) : 0;

        res.json({ average: parseFloat(avg), total });
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

// controllers/ratingController.js

exports.getTopRatedBooks = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const topRated = await Rating.aggregate([
            {
                $group: {
                    _id: "$bookId",
                    avgRating: { $avg: "$value" },
                    totalRatings: { $sum: 1 }
                }
            },
            {
                $sort: { avgRating: -1, totalRatings: -1 }
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: "books", // tên collection trong MongoDB, không phải tên model
                    localField: "_id",
                    foreignField: "_id",
                    as: "book"
                }
            },
            {
                $unwind: "$book"
            },
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


