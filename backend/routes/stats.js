const express = require('express');
const router = express.Router();

// Import các model
const Book = require('../models/Book');
const User = require('../models/User');
const Rating = require('../models/Rating');

router.get('/', async (req, res) => {
    try {
        // 1. Đếm tổng số đầu sách
        const totalBooks = await Book.countDocuments();

        // 2. Đếm tổng số người dùng (Thành viên)
        const totalUsers = await User.countDocuments();

        // 3. Tính điểm đánh giá trung bình từ trường 'value'
        const ratings = await Rating.aggregate([
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$value" } // Đã đổi thành $value theo file bạn gửi
                }
            }
        ]);

        // Nếu chưa có đánh giá nào thì mặc định để 5.0 cho đẹp
        const avgRating = ratings.length > 0 ? ratings[0].averageRating.toFixed(1) : 5.0;

        res.json({
            totalBooks,
            totalUsers,
            avgRating
        });
    } catch (error) {
        console.error("Lỗi lấy thống kê:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
});

module.exports = router;