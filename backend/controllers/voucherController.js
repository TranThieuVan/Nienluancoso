// controllers/voucherController.js
const Voucher = require('../models/Voucher');
const User = require('../models/User');
// 1. API: Áp dụng mã giảm giá (Dành cho User gọi từ trang Checkout)
exports.applyVoucher = async (req, res) => {
    try {
        const { code, orderTotal } = req.body;

        // Tìm mã giảm giá hợp lệ đang hoạt động
        const voucher = await Voucher.findOne({
            code: code.toUpperCase(),
            isActive: true
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Mã giảm giá không tồn tại hoặc đã bị khóa.' });
        }

        const now = new Date();
        if (now < voucher.startDate) {
            return res.status(400).json({ message: 'Mã giảm giá này chưa đến thời gian sử dụng.' });
        }

        if (now > voucher.expirationDate) {
            return res.status(400).json({ message: 'Mã giảm giá này đã hết hạn.' });
        }

        if (voucher.usedCount >= voucher.usageLimit) {
            return res.status(400).json({ message: 'Mã giảm giá này đã hết lượt sử dụng.' });
        }

        if (orderTotal < voucher.minOrderValue) {
            return res.status(400).json({ message: `Đơn hàng phải từ ${voucher.minOrderValue.toLocaleString('vi-VN')}đ để sử dụng mã này.` });
        }

        // Tính toán số tiền được giảm
        let discountAmount = 0;
        if (voucher.discountType === 'percent') {
            discountAmount = (orderTotal * voucher.discountValue) / 100;
            // Kiểm tra giới hạn giảm tối đa (nếu có)
            if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
                discountAmount = voucher.maxDiscountAmount;
            }
        } else if (voucher.discountType === 'fixed') {
            discountAmount = voucher.discountValue;
        }

        // Đảm bảo số tiền giảm không vượt quá tổng giá trị đơn hàng
        discountAmount = Math.min(discountAmount, orderTotal);

        res.json({
            message: 'Áp dụng mã thành công!',
            voucherCode: voucher.code,
            discountAmount: discountAmount
        });

    } catch (err) {
        console.error("Lỗi apply voucher:", err);
        res.status(500).json({ message: 'Lỗi server khi kiểm tra mã giảm giá.' });
    }
};



// Lấy danh sách voucher đang hoạt động để hiển thị cho User chọn
exports.getActiveVouchers = async (req, res) => {
    try {
        const now = new Date();

        // 1. Tìm thông tin User đang đăng nhập để lấy Rank của họ
        const user = await User.findById(req.user.id);
        const userRank = (user && user.rank) ? user.rank : 'Khách hàng';
        // 2. Query Database: Chỉ lấy những mã mà cột applicableRanks có chứa Hạng của User này
        const vouchers = await Voucher.find({
            isActive: true,
            startDate: { $lte: now },
            expirationDate: { $gt: now },
            applicableRanks: { $in: [userRank] }, // 👈 CHỐT CHẶN NẰM Ở ĐÂY
            $expr: { $lt: ["$usedCount", "$usageLimit"] }
        }).sort({ discountValue: -1 });

        res.json(vouchers);
    } catch (err) {
        console.error("Lỗi get active vouchers:", err);
        res.status(500).json({ message: 'Lỗi lấy danh sách voucher' });
    }
};
