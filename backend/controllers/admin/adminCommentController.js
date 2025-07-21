const Comment = require('../../models/Comment');
const User = require('../../models/User');
const Book = require('../../models/Book');

// Lấy danh sách bình luận (có thể lọc theo sách, user, phân trang)
exports.getAllComments = async (req, res) => {
    try {
        const { page = 1, limit = 10, bookTitle = '', userName = '' } = req.query;

        const query = {};

        if (bookTitle) {
            const books = await Book.find({ title: { $regex: bookTitle, $options: 'i' } }).select('_id');
            query.bookId = { $in: books.map(b => b._id) };
        }

        if (userName) {
            const users = await User.find({ name: { $regex: userName, $options: 'i' } }).select('_id');
            query.userId = { $in: users.map(u => u._id) };
        }

        const total = await Comment.countDocuments(query);

        const comments = await Comment.find(query)
            .populate('userId', 'name email')
            .populate('bookId', 'title')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({ total, comments });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách bình luận', error: err.message });
    }
};




exports.hideComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Không tìm thấy bình luận' });
        }

        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ message: 'Lý do xoá là bắt buộc' });
        }

        comment.isHidden = true;
        comment.hiddenReason = reason;
        await comment.save();

        res.json({ message: 'Đã ẩn bình luận thành công', reason });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi ẩn bình luận', error: err.message });
    }
};