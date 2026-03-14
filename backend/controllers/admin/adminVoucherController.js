const Voucher = require('../../models/Voucher');

// 1. LẤY DANH SÁCH VOUCHER (Hiển thị ra bảng cho Admin xem)
exports.getAllVouchers = async (req, res) => {
    try {
        // Sắp xếp mã mới tạo lên đầu
        const vouchers = await Voucher.find().sort({ createdAt: -1 });
        res.json(vouchers);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách Voucher' });
    }
};

// 2. TẠO VOUCHER MỚI
exports.createVoucher = async (req, res) => {
    try {
        const { code, discountType, discountValue, minOrderValue, maxDiscountAmount, startDate, expirationDate, usageLimit, applicableRanks } = req.body;

        const upperCode = code.toUpperCase().trim();
        const existingVoucher = await Voucher.findOne({ code: upperCode });
        if (existingVoucher) {
            return res.status(400).json({ message: 'Mã giảm giá này đã tồn tại!' });
        }

        const newVoucher = new Voucher({
            code: upperCode,
            discountType, discountValue, minOrderValue: minOrderValue || 0,
            maxDiscountAmount: maxDiscountAmount || null, startDate, expirationDate,
            usageLimit, applicableRanks: applicableRanks || ['Khách hàng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương']
        });

        await newVoucher.save();

        // 👈 THÊM ĐOẠN NÀY ĐỂ BẮN THÔNG BÁO REAL-TIME
        const io = req.app.get('io');
        if (io) {
            io.emit('new_notification', {
                _id: newVoucher._id,
                title: '🎟️ Voucher Mới Trình Làng!',
                message: `Nhập mã ${newVoucher.code} để nhận ưu đãi. Nhanh tay kẻo lỡ!`,
                createdAt: newVoucher.createdAt,
                type: 'voucher'
            });
        }

        res.status(201).json({ message: 'Tạo mã giảm giá thành công!', voucher: newVoucher });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server khi tạo Voucher' });
    }
};
// 3. CẬP NHẬT VOUCHER (Sửa ngày hết hạn, sửa đối tượng sử dụng, khóa mã...)
exports.updateVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Nếu Admin có đổi tên mã, ép nó thành in hoa
        if (updates.code) {
            updates.code = updates.code.toUpperCase().trim();
            // Kiểm tra xem tên mã mới có bị trùng với mã khác không
            const existing = await Voucher.findOne({ code: updates.code, _id: { $ne: id } });
            if (existing) return res.status(400).json({ message: 'Tên mã này đã bị trùng!' });
        }

        const updatedVoucher = await Voucher.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedVoucher) {
            return res.status(404).json({ message: 'Không tìm thấy mã giảm giá này' });
        }

        res.json({ message: 'Cập nhật thành công!', voucher: updatedVoucher });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi cập nhật Voucher' });
    }
};

// 4. XÓA VOUCHER
exports.deleteVoucher = async (req, res) => {
    try {
        const deletedVoucher = await Voucher.findByIdAndDelete(req.params.id);
        if (!deletedVoucher) {
            return res.status(404).json({ message: 'Không tìm thấy mã giảm giá' });
        }
        res.json({ message: 'Đã xóa mã giảm giá thành công!' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi xóa Voucher' });
    }
};