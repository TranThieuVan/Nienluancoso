// models/Book.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: String,
    description: String,
    price: { type: Number, required: true },
    importPrice: {
        type: Number,
        default: function () {
            return this.price ? Math.round(this.price * 0.6) : 0;
        }
    },
    image: String,
    genre: String,
    stock: { type: Number, required: true },
    sold: { type: Number, default: 0 },
    embedding: { type: [Number], select: false }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);