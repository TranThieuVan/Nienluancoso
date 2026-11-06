// models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    isHidden: { type: Boolean, default: false },
    hiddenReason: { type: String, default: '' },
}, { timestamps: true });

commentSchema.index({ bookId: 1, createdAt: -1 });
commentSchema.index({ bookId: 1, userId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
