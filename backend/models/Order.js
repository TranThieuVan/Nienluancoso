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

    // ✅ THÔNG TIN THANH TOÁN
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

    // ✅ CẬP NHẬT BUSINESS LOGIC: Thêm failed_delivery và returned
    status: {
        type: String,
        enum: ['pending', 'shipping', 'delivered', 'failed_delivery', 'returned', 'cancelled'],
        default: 'pending'
    },
    statusHistory: [
        {
            status: {
                type: String,
                enum: ['pending', 'shipping', 'delivered', 'failed_delivery', 'returned', 'cancelled']
            },
            date: { type: Date, default: Date.now }
        }
    ],

    shippingFee: { type: Number, default: 40000 },
    cancelReason: { type: String, default: null },

    // ✅ THÊM CÁC CỘT TIMESTAMPS PHỤC VỤ TÍNH TOÁN LOGISTICS & RATE METRICS
    deliveredAt: { type: Date }, // Để tính thời gian giao hàng trung bình
    cancelledAt: { type: Date }, // Để vẽ biểu đồ số đơn hủy theo ngày (nếu cần)
    returnedAt: { type: Date }   // Để track xem khách trả hàng bao lâu sau khi mua

}, {
    timestamps: true
})

module.exports = mongoose.model('Order', orderSchema)