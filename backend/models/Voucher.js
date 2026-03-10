// models/Voucher.js
const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true, // Ép mã giảm giá tự động viết hoa
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percent', 'fixed'], // 'percent' (giảm theo %), 'fixed' (giảm thẳng tiền mặt)
        required: true
    },
    discountValue: {
        type: Number,
        required: true // Ví dụ: 10 (nếu là percent), hoặc 50000 (nếu là fixed)
    },
    minOrderValue: {
        type: Number,
        default: 0 // Giá trị đơn hàng tối thiểu để được áp dụng
    },
    maxDiscountAmount: {
        type: Number, // Số tiền giảm tối đa (thường dùng cho loại 'percent')
        default: null
    },
    startDate: {
        type: Date,
        required: true
    },
    expirationDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number, // Tổng số lần mã này có thể được sử dụng bởi tất cả user
        required: true
    },
    usedCount: {
        type: Number,
        default: 0
    },
    applicableRanks: {
        type: [String],
        enum: ['Khách hàng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương'],
        // Mặc định tạo ra là ai cũng xài được (áp dụng cho mọi hạng)
        default: ['Khách hàng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);