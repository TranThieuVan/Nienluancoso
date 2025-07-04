const Order = require('../models/Order')
const Cart = require('../models/Cart')

// Tạo đơn hàng mới từ giỏ hàng
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id

        // Lấy giỏ hàng của user
        const cart = await Cart.findOne({ user: userId }).populate('items.book')
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ msg: 'Giỏ hàng trống' })
        }

        // Tính tổng tiền
        const totalPrice = cart.items.reduce((sum, item) => {
            return sum + item.book.price * item.quantity
        }, 0)

        // Nhận địa chỉ từ client gửi lên
        const {
            fullName,
            phone,
            street,
            district,
            city
        } = req.body.shippingAddress || {}

        if (!fullName || !phone || !street || !district || !city) {
            return res.status(400).json({ msg: 'Thiếu thông tin giao hàng' })
        }

        // Tạo đơn hàng
        const order = new Order({
            user: userId,
            items: cart.items.map(item => ({
                book: item.book.id,
                quantity: item.quantity
            })),
            totalPrice,
            shippingAddress: { fullName, phone, street, district, city },
            status: 'pending'
        })

        await order.save()

        // Xóa giỏ hàng
        await Cart.findOneAndDelete({ user: userId })

        res.status(201).json({ msg: 'Đặt hàng thành công', order })
    } catch (err) {
        console.error(err)
        res.status(500).json({ msg: 'Lỗi server khi tạo đơn hàng' })
    }
}

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