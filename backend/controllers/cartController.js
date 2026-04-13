const Cart = require('../models/Cart');
const PricingService = require('../services/pricingService');

exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.user.id })
            .populate('items.bookId')
            .lean(); // Vẫn giữ .lean() cho chắc cốp nhé

        if (!cart) return res.json({ items: [], total: 0 });

        const booksInCart = cart.items.map(item => item.bookId).filter(b => b != null);

        // ✅ 1. BẮT LẤY KẾT QUẢ ĐÃ TÍNH TOÁN (Giống bên orderController)
        const pricedBooks = PricingService.applyPricing(booksInCart);

        const items = cart.items.map(item => {
            if (!item.bookId) return null;

            // ✅ 2. TÌM SÁCH CÓ GIÁ MỚI NHẤT (50k) TRONG MẢNG VỪA TÍNH
            const bookWithNewPrice = pricedBooks.find(b => String(b._id) === String(item.bookId._id)) || item.bookId;

            return {
                book: bookWithNewPrice, // 👉 Trả về sách đã update giá
                quantity: item.quantity
            };
        }).filter(item => item != null);

        const total = items.reduce((sum, item) => {
            const currentPrice = item.book.discountedPrice || item.book.price;
            return sum + (currentPrice * item.quantity);
        }, 0);

        res.json({ items, total });
    } catch (err) {
        console.error("Lỗi getCart:", err);
        res.status(500).json({ msg: 'Lỗi' });
    }
};
exports.addToCart = async (req, res) => {
    const { bookId, quantity = 1 } = req.body;
    try {
        let cart = await Cart.findOne({ userId: req.user.id });
        if (!cart) cart = new Cart({ userId: req.user.id, items: [] });
        const index = cart.items.findIndex(item => String(item.bookId) === String(bookId));
        if (index >= 0) cart.items[index].quantity += quantity;
        else cart.items.push({ bookId, quantity });
        await cart.save();
        res.json(cart);
    } catch (err) { res.status(500).json({ msg: 'Lỗi' }); }
};

exports.removeFromCart = async (req, res) => {
    try {
        const cart = await Cart.findOneAndUpdate(
            { userId: req.user.id },
            { $pull: { items: { bookId: req.params.bookId } } },
            { new: true }
        );
        res.json(cart);
    } catch (err) { res.status(500).json({ msg: 'Lỗi' }); }
};

exports.updateQuantity = async (req, res) => {
    const { bookId, quantity } = req.body;
    try {
        const cart = await Cart.findOne({ userId: req.user.id });
        const item = cart.items.find(i => String(i.bookId) === String(bookId));
        if (item) { item.quantity = quantity; await cart.save(); res.json(cart); }
        else res.status(404).json({ msg: 'Không tìm thấy' });
    } catch (err) { res.status(500).json({ msg: 'Lỗi' }); }
};