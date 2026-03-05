const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true }, // Số nhà, tên đường
    ward: { type: String, required: true },    // ✅ THÊM TRƯỜNG NÀY (Phường/Xã)
    district: { type: String, required: true }, // Quận/Huyện
    city: { type: String, required: true },     // Tỉnh/Thành phố
    isDefault: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Address', addressSchema);