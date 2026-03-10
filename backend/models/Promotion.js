const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: '' // ✅ Bổ sung trường này để lưu Ghi chú
    },
    discountType: {
        type: String,
        enum: ['percent', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    targetType: {
        type: String,
        enum: ['all', 'genre', 'book'], // Đảm bảo có chữ 'book' ở đây
        required: true
    },
    targetValue: {
        type: String,
        default: ''
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Promotion', promotionSchema);