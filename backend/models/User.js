const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: '' },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    rank: {
        type: String,
        enum: ['Khách hàng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương'],
        default: 'Khách hàng'
    },
    lastPurchaseDate: { type: Date, default: null },

    // ✅ HỆ THỐNG TRỪNG PHẠT
    failedDeliveryCount: { type: Number, default: 0 }, // Đếm số lần boom hàng
    isLocked: { type: Boolean, default: false },
    lockedUntil: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);