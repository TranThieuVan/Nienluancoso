const express = require('express');
const router = express.Router();
const Voucher = require('../models/Voucher');
const Promotion = require('../models/Promotion');

router.get('/', async (req, res) => {
    try {
        // 1. Lấy 10 voucher và 10 promotion mới nhất từ DB
        const vouchers = await Voucher.find().sort({ createdAt: -1 }).limit(10);
        const promotions = await Promotion.find().sort({ createdAt: -1 }).limit(10);

        // 2. Định dạng lại mảng Voucher thành mảng Thông báo
        const formattedVouchers = vouchers.map(v => ({
            _id: v._id,
            title: '🎟️ Voucher Mới Trình Làng!',
            message: `Nhập mã ${v.code} để nhận ngay ưu đãi cực hời.`,
            createdAt: v.createdAt,
            type: 'voucher'
        }));

        // 3. Định dạng lại mảng Promotion thành mảng Thông báo
        const formattedPromotions = promotions.map(p => ({
            _id: p._id,
            title: `🔥 Khuyến mãi sốc: ${p.name}`,
            message: p.description || 'Nhiều tựa sách đang được giảm giá cực mạnh. Khám phá ngay!',
            createdAt: p.createdAt,
            type: 'promotion'
        }));

        // 4. Gộp cả 2 mảng lại, sắp xếp theo thời gian mới nhất (từ mới đến cũ)
        const allNotifications = [...formattedVouchers, ...formattedPromotions]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5); // Chỉ lấy tối đa 15 thông báo mới nhất gửi về Frontend

        res.json(allNotifications);
    } catch (error) {
        console.error("Lỗi fetch dữ liệu thông báo:", error);
        res.status(500).json({ message: "Lỗi server khi lấy thông báo", error });
    }
});

module.exports = router;