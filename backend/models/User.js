const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: '' }, // đường dẫn ảnh đại diện
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    rank: {
        type: String,
        enum: ['Khách hàng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương'],
        default: 'Khách hàng'
    },
    lastPurchaseDate: {
        type: Date,
        default: null // Ghi nhận thời gian mua đơn hàng gần nhất
    },
    isLocked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
