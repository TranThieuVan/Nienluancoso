const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true } // 🔥 QUAN TRỌNG: Chốt giá lúc mua
        }
    ],
    shippingAddress: {
        fullName: String,
        phone: String,
        street: String,
        ward: String,
        district: String,
        city: String
    },
    shippingFee: { type: Number, default: 40000 },
    totalPrice: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 }, // Tiền giảm từ Voucher
    voucherCode: { type: String, default: null },
    paymentMethod: { type: String, enum: ['cod', 'vnpay', 'transfer'], default: 'cod' },
    paymentStatus: { type: String, default: 'Chờ thanh toán' },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'delivering', 'delivered', 'completed', 'cancelled', 'failed_delivery', 'return_requested', 'return_approved', 'returning', 'returned'],
        default: 'pending'
    },
    statusHistory: [
        {
            status: String,
            date: { type: Date, default: Date.now }
        }
    ],
    cancelReason: String,
    adminNote: String,
    callAttempts: { type: Number, default: 0 },
    shippingProvider: String,
    trackingLink: String,
    vnpayTransactionNo: String,
    vnpayPayDate: String,

    // Các trường phục vụ trả hàng
    returnReasonType: String,
    returnReasonDetail: String,
    returnMedia: [String],
    returnBankDetails: String,
    returnBankQR: String,
    returnShippingProvider: String,
    returnTrackingCode: String,
    returnReceipt: String
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);