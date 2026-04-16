const Comment = require('../../models/Comment');
const User = require('../../models/User');
const Book = require('../../models/Book');

// ✅ Lấy danh sách bình luận (Tìm kiếm đa năng & Thống kê)
exports.getAllComments = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const query = {};

        // 1. Xử lý logic Tìm kiếm đa năng (Search)
        if (search) {
            // Tìm các ID của Sách và User khớp với từ khóa
            const [books, users] = await Promise.all([
                Book.find({ title: { $regex: search, $options: 'i' } }).select('_id'),
                User.find({ name: { $regex: search, $options: 'i' } }).select('_id')
            ]);

            const bookIds = books.map(b => b._id);
            const userIds = users.map(u => u._id);

            // Tìm bình luận khớp 1 trong 3: thuộc về sách đó, thuộc về user đó, hoặc nội dung chứa text đó
            query.$or = [
                { bookId: { $in: bookIds } },
                { userId: { $in: userIds } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // 2. Thống kê số lượng (Stats) song song để tối ưu tốc độ
        const [total, totalVisible, totalHidden] = await Promise.all([
            Comment.countDocuments(query),
            Comment.countDocuments({ ...query, isHidden: false }),
            Comment.countDocuments({ ...query, isHidden: true })
        ]);

        // 3. Truy xuất dữ liệu chính
        const comments = await Comment.find(query)
            .populate('userId', 'name email')
            .populate('bookId', 'title')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // ✅ Trả về đúng các trường mà Frontend đang mong đợi
        res.json({
            total,
            totalVisible,
            totalHidden,
            comments
        });

    } catch (err) {
        console.error("🔥 Lỗi getAllComments:", err);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách bình luận', error: err.message });
    }
};

// --- Các hàm hide/unhide giữ nguyên logic của bro nhưng tối ưu nhẹ ---

exports.hideComment = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ message: 'Lý do ẩn là bắt buộc' });

        const comment = await Comment.findByIdAndUpdate(
            req.params.id,
            { isHidden: true, hiddenReason: reason },
            { new: true }
        );

        if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
        res.json({ message: 'Đã ẩn bình luận thành công', reason });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi ẩn bình luận', error: err.message });
    }
};

exports.unhideComment = async (req, res) => {
    try {
        const comment = await Comment.findByIdAndUpdate(
            req.params.id,
            { isHidden: false, hiddenReason: '' },
            { new: true }
        );

        if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });
        res.json({ message: 'Đã hiện bình luận thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi hiện bình luận', error: err.message });
    }
};