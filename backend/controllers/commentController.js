const Comment = require('../models/Comment');
const Rating = require('../models/Rating');
const Order = require('../models/Order');

// GET all comments for a specific book (có phân trang + kèm rating)
exports.getCommentsByBook = async (req, res) => {
    try {
        const { bookId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const comments = await Comment.find({ bookId })
            .populate('userId', 'name avatar _id')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Comment.countDocuments({ bookId });

        // Lấy rating của từng user để đính kèm vào comment
        const userIds = comments.map(c => c.userId._id);
        const ratings = await Rating.find({ bookId, userId: { $in: userIds } });
        const ratingMap = {};
        ratings.forEach(r => { ratingMap[r.userId.toString()] = r.value; });

        const enrichedComments = comments.map(c => ({
            ...c.toObject(),
            userRating: ratingMap[c.userId._id.toString()] || 0
        }));

        res.json({
            comments: enrichedComments,
            hasMore: total > skip + comments.length,
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy bình luận' });
    }
};

// GET đánh giá của chính user đang đăng nhập cho 1 cuốn sách
exports.getMyComment = async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user.id;

        const comment = await Comment.findOne({ bookId, userId })
            .populate('userId', 'name avatar _id');

        if (!comment) return res.json(null);

        const ratingDoc = await Rating.findOne({ bookId, userId });
        const result = comment.toObject();
        result.userRating = ratingDoc ? ratingDoc.value : 0;

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy đánh giá của bạn' });
    }
};

// POST tạo đánh giá mới (chỉ được 1 lần, phải có đơn hàng completed)
exports.createComment = async (req, res) => {
    try {
        const { bookId, content } = req.body;
        const userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Nội dung không được để trống' });
        }

        // Kiểm tra user đã mua và nhận sách (status = completed)
        const purchasedOrder = await Order.findOne({
            user: userId,
            status: 'completed',
            'items.book': bookId
        });
        if (!purchasedOrder) {
            return res.status(403).json({ message: 'Bạn cần mua và nhận sách này trước khi đánh giá.' });
        }

        // Mỗi người chỉ được đánh giá 1 lần
        const existingComment = await Comment.findOne({ bookId, userId });
        if (existingComment) {
            return res.status(409).json({ message: 'Bạn đã đánh giá cuốn sách này rồi.' });
        }

        const newComment = new Comment({ bookId, userId, content });
        await newComment.save();
        await newComment.populate('userId', 'name avatar _id');

        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo bình luận' });
    }
};

// DELETE xoá đánh giá (chỉ chủ sở hữu)
exports.deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });

        if (comment.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Bạn không có quyền xoá bình luận này' });
        }

        await comment.deleteOne();
        res.json({ message: 'Đã xoá bình luận' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xoá bình luận' });
    }
};

// PUT cập nhật nội dung bình luận
exports.editComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Nội dung không được để trống' });
        }

        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });

        if (comment.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Bạn không có quyền sửa bình luận này' });
        }

        comment.content = content;
        await comment.save();
        await comment.populate('userId', 'name avatar');

        res.json({ message: 'Cập nhật bình luận thành công', comment });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật bình luận' });
    }
};