const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Book = require('../models/Book')
const User = require('../models/User');

// Tạo đơn hàng mới từ giỏ hàng
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
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

        await order.save();

        // LOGIC THĂNG HẠNG
        const user = await User.findById(userId);
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

        res.status(201).json({ msg: 'Đặt hàng thành công', order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Lỗi server khi tạo đơn hàng' });
    }
};

// Lấy đơn hàng của người dùng (ĐÃ CÓ PHÂN TRANG)
exports.getMyOrders = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ user: userId });
        const totalPages = Math.ceil(totalOrders / limit) || 1;

        const orders = await Order.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('items.book')
            .skip(skip)
            .limit(limit);

        res.json({
            orders,
            currentPage: page,
            totalPages,
            totalOrders
        });
    } catch (err) {
        console.error("Lỗi getMyOrders:", err);
        res.status(500).json({ msg: 'Lỗi khi lấy danh sách đơn hàng' });
    }
}

// Lấy chi tiết đơn hàng
exports.getOrderById = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const order = await Order.findById(req.params.id).populate('items.book')
        if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' })

        if (String(order.user) !== String(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Không có quyền truy cập' })
        }

        res.json(order)
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi khi lấy chi tiết đơn hàng' })
    }
}

// Hủy đơn hàng
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user._id || req.user.id;

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

        if (String(order.user) !== String(userId))
            return res.status(403).json({ message: 'Không có quyền hủy đơn' });

        if (order.status !== 'pending')
            return res.status(400).json({ message: 'Chỉ có thể hủy đơn khi đang chờ xử lý' });

        order.status = 'cancelled';
        order.cancelReason = reason;

        if (order.paymentStatus === 'Đã thanh toán') {
            order.paymentStatus = 'Hoàn tiền';
        }

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

// Cập nhật trạng thái đơn hàng thành "Đã thanh toán" (Gọi từ VNPAY)
exports.updateOrderToPaid = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { vnpayTransactionNo, vnpayPayDate } = req.body;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                paymentStatus: 'Đã thanh toán',
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