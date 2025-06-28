const Comment = require('../models/Comment');

// GET all comments for a specific book
exports.getCommentsByBook = async (req, res) => {
    try {
        const { bookId } = req.params;
        const comments = await Comment.find({ bookId })
            .populate('userId', 'name avatar') // lấy tên + avatar user
            .sort({ createdAt: -1 }); // mới nhất trước
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy bình luận' });
    }
};

// POST a new comment
exports.createComment = async (req, res) => {
    try {
        const { bookId, content } = req.body;
        const userId = req.user.id; // từ middleware auth

        if (!content) {
            return res.status(400).json({ message: 'Nội dung không được để trống' });
        }

        const newComment = new Comment({ bookId, userId, content });
        await newComment.save();

        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo bình luận' });
    }
};

// DELETE a comment
exports.deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json({ message: 'Không tìm thấy bình luận' });

        if (comment.userId.toString() !== userId && !isAdmin) {
            return res.status(403).json({ message: 'Bạn không có quyền xoá bình luận này' });
        }

        await comment.deleteOne();
        res.json({ message: 'Đã xoá bình luận' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xoá bình luận' });
    }
};
