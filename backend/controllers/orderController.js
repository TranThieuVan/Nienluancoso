const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Book = require('../models/Book')
// Tạo đơn hàng mới từ giỏ hàng
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { items, shippingAddress } = req.body;

        // Validate địa chỉ
        const { fullName, phone, street, district, city } = shippingAddress || {};
        if (!fullName || !phone || !street || !district || !city) {
            return res.status(400).json({ msg: 'Thiếu thông tin giao hàng' });
        }

        // Validate items
        if (!items || items.length === 0) {
            return res.status(400).json({ msg: 'Không có sản phẩm nào' });
        }

        // Lấy thông tin sách từ DB để tính tổng tiền và kiểm tra tồn kho
        const bookIds = items.map(i => i.book);
        const books = await Book.find({ _id: { $in: bookIds } });

        if (books.length !== items.length) {
            return res.status(400).json({ msg: 'Một số sách không tồn tại' });
        }

        // ✅ Kiểm tra tồn kho từng sách
        for (const item of items) {
            const book = books.find(b => String(b._id) === String(item.book));
            if (!book) {
                return res.status(400).json({ msg: `Sách không tồn tại.` });
            }
            if (book.stock < item.quantity) {
                return res.status(400).json({ msg: `Sách "${book.title}" chỉ còn ${book.stock} cuốn.` });
            }
        }

        // Gộp lại items với thông tin sách
        const mergedItems = items.map(item => {
            const book = books.find(b => String(b._id) === String(item.book));
            return {
                book: book._id,
                quantity: item.quantity
            };
        });

        const subTotal = mergedItems.reduce((sum, item) => {
            const book = books.find(b => String(b._id) === String(item.book));
            return sum + book.price * item.quantity;
        }, 0);

        const shippingFee = 40000;
        const totalPrice = subTotal + shippingFee;

        // Tạo đơn hàng
        const order = new Order({
            user: userId,
            items: mergedItems,
            shippingAddress,
            shippingFee,
            totalPrice,
            status: 'pending',
            statusHistory: [
                {
                    status: 'pending',
                    date: new Date()
                }
            ]
        });

        await order.save();

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


exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params
        const { reason } = req.body
        const userId = req.user.id

        const order = await Order.findById(id)
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' })

        // Kiểm tra quyền user
        if (order.user.toString() !== userId)
            return res.status(403).json({ message: 'Không có quyền hủy đơn hàng này' })

        // Chỉ cho hủy đơn pending
        if (order.status !== 'pending')
            return res.status(400).json({ message: 'Chỉ có thể hủy đơn khi đang chờ xử lý' })

        order.status = 'cancelled'
        order.cancelReason = reason
        await order.save()

        res.json({ message: 'Đã hủy đơn hàng thành công' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Lỗi server khi hủy đơn hàng' })
    }
}
