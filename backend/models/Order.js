const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
            quantity: { type: Number, required: true, min: 1 }
        }
    ],
    totalPrice: { type: Number, required: true },
    shippingAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        street: { type: String, required: true },
        ward: { type: String, required: true },
        district: { type: String, required: true },
        city: { type: String, required: true },
    },
    paymentMethod: {
        type: String, enum: ['cod', 'transfer', 'vnpay'], required: true, default: 'cod'
    },
    paymentStatus: {
        type: String, enum: ['Chờ thanh toán', 'Đã thanh toán', 'Hoàn tiền', "Đã hoàn tiền"], default: 'Chờ thanh toán'
    },
    vnpayTransactionNo: { type: String },
    vnpayPayDate: { type: String },

    status: {
        type: String,
        enum: [
            'pending', 'confirmed', 'delivering', 'delivered', 'completed',
            'failed_delivery', 'return_requested', 'return_approved',
            'returning', 'returned', 'cancelled'
        ],
        default: 'pending'
    },
    statusHistory: [
        {
            status: { type: String },
            date: { type: Date, default: Date.now }
        }
    ],

    shippingFee: { type: Number, default: 40000 },

    // TRACKING GIAO HÀNG
    shippingProvider: { type: String, default: null },
    trackingLink: { type: String, default: null },

    // THÔNG TIN HỦY / TRẢ HÀNG & HOÀN TIỀN
    cancelReason: { type: String, default: null },
    returnReasonType: { type: String, default: null },
    returnReasonDetail: { type: String, default: null },
    returnMedia: [{ type: String }],
    returnBankQR: { type: String, default: null },
    returnBankDetails: { type: String, default: null },

    // ✅ THÔNG TIN VẬN ĐƠN KHÁCH GỬI TRẢ
    returnShippingProvider: { type: String, default: null },
    returnTrackingCode: { type: String, default: null },
    returnReceipt: { type: String, default: null },

    // GHI CHÚ NỘI BỘ
    adminNote: { type: String, default: "" },
    callAttempts: { type: Number, default: 0 },

    // TIMESTAMPS
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    returnedAt: { type: Date }

}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)