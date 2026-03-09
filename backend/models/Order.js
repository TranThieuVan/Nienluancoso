const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [
        {
            book: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Book',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],
    // Dùng totalPrice cho tổng tiền (Bao gồm sách + ship)
    totalPrice: {
        type: Number,
        required: true
    },
    shippingAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        street: { type: String, required: true },
        ward: { type: String, required: true }, // ✅ ĐÃ THÊM PHƯỜNG/XÃ
        district: { type: String, required: true },
        city: { type: String, required: true },
    },

    // ✅ THÊM THÔNG TIN THANH TOÁN
    paymentMethod: {
        type: String,
        enum: ['cod', 'transfer', 'vnpay'],
        required: true,
        default: 'cod'
    },
    paymentStatus: {
        type: String,
        enum: ['Chờ thanh toán', 'Đã thanh toán', 'Hoàn tiền', "Đã hoàn tiền"],
        default: 'Chờ thanh toán'
    },

    vnpayTransactionNo: { type: String }, // Mã giao dịch độc nhất của VNPAY
    vnpayPayDate: { type: String },
    status: {
        type: String,
        enum: ['pending', 'shipping', 'delivered', 'cancelled'],
        default: 'pending'
    },
    statusHistory: [
        {
            status: { type: String, enum: ['pending', 'shipping', 'delivered', 'cancelled'] },
            date: { type: Date, default: Date.now }
        }
    ],
    shippingFee: { type: Number, default: 40000 },
    cancelReason: { type: String, default: null },
    deliveredAt: { type: Date }

}, {
    timestamps: true
})

module.exports = mongoose.model('Order', orderSchema)