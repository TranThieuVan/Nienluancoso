const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: String,
    description: String,
    price: { type: Number, required: true },
    image: String, // Đường dẫn ảnh bìa
    genre: String,
    stock: { type: Number, required: true },
    sold: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
