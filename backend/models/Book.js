const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: String,
    description: String,
    price: { type: Number, required: true },
    image: String,
    genre: String,
    stock: { type: Number, required: true },
    sold: { type: Number, default: 0 },
    // ✅ THÊM DÒNG NÀY: Mảng chứa 1536 con số của AI
    embedding: { type: [Number], select: false }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);