const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Book = require('../models/Book')
const User = require('../models/User');
// Tạo đơn hàng mới từ giỏ hàng
// Tạo đơn hàng mới từ giỏ hàng
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, shippingAddress, paymentMethod, totalAmount } = req.body;

        const { fullName, phone, street, ward, district, city } = shippingAddress || {};
        if (!fullName || !phone || !street || !ward || !district || !city) {
            return res.status(400).json({ msg: 'Thiếu thông tin giao hàng' });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ msg: 'Không có sản phẩm nào' });
        }

        const bookIds = items.map(i => i.book);
        const books = await Book.find({ _id: { $in: bookIds } });

        if (books.length !== items.length) {
            return res.status(400).json({ msg: 'Một số sách không tồn tại' });
        }

        for (const item of items) {
            const book = books.find(b => String(b._id) === String(item.book));
            if (!book) {
                return res.status(400).json({ msg: `Sách không tồn tại.` });
            }
            if (book.stock < item.quantity) {
                return res.status(400).json({ msg: `Sách "${book.title}" chỉ còn ${book.stock} cuốn.` });
            }
        }

        const mergedItems = items.map(item => {
            const book = books.find(b => String(b._id) === String(item.book));
            return {
                book: book._id,
                quantity: item.quantity
            };
        });

        const shippingFee = 40000;

        const order = new Order({
            user: userId,
            items: mergedItems,
            shippingAddress,
            shippingFee,
            totalPrice: totalAmount,
            paymentMethod: paymentMethod || 'cod',
            paymentStatus: 'Chờ thanh toán',
            status: 'pending',
            statusHistory: [
                {
                    status: 'pending',
                    date: new Date()
                }
            ]
        });

        // 1. LƯU ĐƠN HÀNG VÀO DATABASE
        await order.save();

        // ==========================================
        // 2. ✅ LOGIC THĂNG HẠNG ĐẶT VÀO TRONG NÀY 
        // ==========================================
        const user = await User.findById(req.user.id);
        if (user) {
            user.lastPurchaseDate = new Date();
            let newRank = user.rank;
            const amount = totalAmount;

            if (amount >= 10000000) {
                newRank = 'Kim cương';
            } else if (amount >= 5000000 && ['Khách hàng', 'Bạc', 'Vàng'].includes(user.rank)) {
                newRank = 'Bạch kim';
            } else if (amount >= 2000000 && ['Khách hàng', 'Bạc'].includes(user.rank)) {
                newRank = 'Vàng';
            } else if (amount >= 500000 && user.rank === 'Khách hàng') {
                newRank = 'Bạc';
            }

            user.rank = newRank;
            await user.save();
        }
        // ==========================================

        // 3. TRẢ VỀ KẾT QUẢ THÀNH CÔNG CHO FRONTEND
        res.status(201).json({ msg: 'Đặt hàng thành công', order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Lỗi server khi tạo đơn hàng' });
    }
};
// Lấy đơn hàng của người dùng
exports.getMyOrders = async (req, res) => {
    try {
        const userId = req.user.id
        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).populate('items.book')
        res.json(orders)
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi khi lấy danh sách đơn hàng' })
    }
}

// Lấy chi tiết đơn hàng
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.book')
        if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' })

        // Nếu không phải admin, chỉ cho xem đơn của mình
        if (String(order.user) !== String(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Không có quyền truy cập' })
        }

        res.json(order)
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi khi lấy chi tiết đơn hàng' })
    }
}

// Hủy đơn hàng
// Hủy đơn hàng
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        // Bọc thép: Lấy id hoặc _id tuỳ thuộc vào payload của JWT
        const userId = req.user.id || req.user._id;

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

        // Bọc thép: Ép về String an toàn tuyệt đối
        if (String(order.user) !== String(userId))
            return res.status(403).json({ message: 'Không có quyền hủy đơn' });

        if (order.status !== 'pending')
            return res.status(400).json({ message: 'Chỉ có thể hủy đơn khi đang chờ xử lý' });

        // Cập nhật trạng thái
        order.status = 'cancelled';
        order.cancelReason = reason;

        if (order.paymentStatus === 'Đã thanh toán') {
            order.paymentStatus = 'Hoàn tiền';
        }

        // Bọc thép: Khởi tạo mảng nếu trong DB bị rỗng
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
            status: 'cancelled',
            date: new Date()
        });

        await order.save();
        res.json({ message: 'Đã hủy đơn hàng thành công', order });
    } catch (error) {
        console.error("Lỗi HỦY ĐƠN HÀNG:", error);
        res.status(500).json({ message: 'Lỗi server khi hủy đơn hàng' });
    }
};

// ✅ API: Cập nhật trạng thái đơn hàng thành "Đã thanh toán" (Gọi từ VNPAY)
exports.updateOrderToPaid = async (req, res) => {
    try {
        const orderId = req.params.id;

        // 1. Nhận thêm 2 thông số từ Frontend gửi lên
        const { vnpayTransactionNo, vnpayPayDate } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                paymentStatus: 'Đã thanh toán',
                // 2. Lưu vào Database
                vnpayTransactionNo: vnpayTransactionNo,
                vnpayPayDate: vnpayPayDate
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        res.json({ message: "Cập nhật thanh toán thành công", order: updatedOrder });
    } catch (error) {
        console.error("Lỗi cập nhật thanh toán:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};
