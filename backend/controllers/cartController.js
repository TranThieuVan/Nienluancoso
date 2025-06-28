// controllers/cartController.js

const Cart = require('../models/Cart');
const Book = require('../models/Book');

// 1. Lấy giỏ hàng của user
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id }).populate('items.bookId');
        res.json(cart || { userId: req.user.id, items: [] });
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server' });
    }
};

// 2. Thêm hoặc tăng số lượng sách trong giỏ
exports.addToCart = async (req, res) => {
    const { bookId, quantity = 1 } = req.body;
    try {
        let cart = await Cart.findOne({ userId: req.user.id });

        if (!cart) {
            cart = new Cart({ userId: req.user.id, items: [] });
        }

        const index = cart.items.findIndex(item => item.bookId.equals(bookId));
        if (index >= 0) {
            cart.items[index].quantity += quantity;
        } else {
            cart.items.push({ bookId, quantity });
        }

        await cart.save();
        res.json(cart);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi khi thêm vào giỏ hàng' });
    }
};

// 3. Xoá 1 mục
exports.removeFromCart = async (req, res) => {
    const { bookId } = req.params;
    try {
        const cart = await Cart.findOneAndUpdate(
            { userId: req.user.id },
            { $pull: { items: { bookId } } },
            { new: true }
        );
        res.json(cart);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi khi xoá khỏi giỏ hàng' });
    }
};

// 4. Cập nhật số lượng
exports.updateQuantity = async (req, res) => {
    const { bookId, quantity } = req.body;
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) return res.status(404).json({ msg: 'Không tìm thấy giỏ hàng' });

        const item = cart.items.find(i => i.bookId.equals(bookId));
        if (item) {
            item.quantity = quantity;
            await cart.save();
            res.json(cart);
        } else {
            res.status(404).json({ msg: 'Không tìm thấy sách trong giỏ' });
        }
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi cập nhật số lượng' });
    }
};
