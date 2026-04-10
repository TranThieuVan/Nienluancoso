const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: '' },
    password: { type: String, required: true },
    // ✅ ĐÃ SỬA: Thêm 'employee' vào enum
    role: {
        type: String,
        enum: ['user', 'admin', 'employee'],
        default: 'user'
    },
    rank: {
        type: String,
        enum: ['Khách hàng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương'],
        default: 'Khách hàng'
    },
    lastPurchaseDate: { type: Date, default: null },

    // HỆ THỐNG TRỪNG PHẠT
    failedDeliveryCount: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    lockedUntil: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);