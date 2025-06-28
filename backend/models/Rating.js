// models/Rating.js
const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
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
    value: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    }
}, { timestamps: true });

ratingSchema.index({ bookId: 1, userId: 1 }, { unique: true }); // 1 người chỉ rate 1 lần mỗi sách

module.exports = mongoose.model('Rating', ratingSchema);
