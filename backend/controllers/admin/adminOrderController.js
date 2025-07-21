const Order = require('../../models/Order')
const User = require('../../models/User')

// Lấy tất cả đơn hàng (admin)
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'name email') // chỉ lấy name & email user
            .populate('items.book', 'title price image') // lấy title & price sách
            .sort({ createdAt: -1 })

        res.json(orders)
    } catch (err) {
        console.error('Lỗi lấy đơn hàng:', err)
        res.status(500).json({ message: 'Không thể lấy danh sách đơn hàng' })
    }
}

// Lấy chi tiết đơn hàng theo ID (cho admin)
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.book', 'title image price')
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' })

        res.json(order)
    } catch (err) {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', err)
        res.status(500).json({ message: 'Lỗi server' })
    }
}

const Book = require('../../models/Book'); // Thêm nếu chưa có

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });

        // Không cho cập nhật nếu đã bị hủy
        if (order.status === 'cancelled') {
            return res.status(400).json({ msg: 'Đơn hàng đã bị hủy, không thể cập nhật trạng thái.' });
        }

        // Nếu trạng thái thay đổi
        if (order.status !== status) {
            const isNewlyDelivered = order.status !== 'delivered' && status === 'delivered';

            order.status = status;
            order.statusHistory.push({ status, date: new Date() });

            // Nếu chuyển sang "delivered" lần đầu → trừ stock và cộng sold
            if (isNewlyDelivered) {
                order.deliveredAt = new Date();

                for (const item of order.items) {
                    const book = await Book.findById(item.book);
                    if (book) {
                        book.stock = Math.max(0, book.stock - item.quantity);
                        book.sold += item.quantity;
                        await book.save();
                    }
                }
            }

            await order.save();
        }

        res.json({ msg: 'Cập nhật trạng thái thành công', order });
    } catch (err) {
        console.error('Lỗi cập nhật trạng thái:', err);
        res.status(500).json({ msg: 'Lỗi server khi cập nhật trạng thái đơn hàng' });
    }
};


// Xóa đơn hàng (admin)
exports.deleteOrder = async (req, res) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)
        if (!deletedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng để xóa' })

        res.json({ message: 'Xóa đơn hàng thành công' })
    } catch (err) {
        console.error('Lỗi xóa đơn hàng:', err)
        res.status(500).json({ message: 'Không thể xóa đơn hàng' })
    }
}
