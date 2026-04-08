const Promotion = require('../../models/Promotion');
const PricingService = require('../../services/pricingService'); // Nhớ import Service

exports.getAllPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find().sort({ createdAt: -1 });
        res.json(promotions);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách chiến dịch' });
    }
};

exports.createPromotion = async (req, res) => {
    try {
        const promotion = new Promotion(req.body);
        await promotion.save();

        // 🟢 CẬP NHẬT LẠI RAM CACHE NGAY LẬP TỨC
        await PricingService.refreshCache();

        const io = req.app.get('io');
        if (io) {
            io.emit('new_notification', {
                _id: promotion._id,
                title: `🔥 Khuyến mãi sốc: ${promotion.name}`,
                message: promotion.description || 'Khám phá ngay!',
                createdAt: promotion.createdAt,
                type: 'promotion',
                endDate: promotion.endDate // Trả về endDate để React tự ẩn
            });
        }
        res.status(201).json({ message: 'Tạo thành công', promotion });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo chiến dịch', error: err.message });
    }
};

exports.updatePromotion = async (req, res) => {
    try {
        const updatedPromotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // 🟢 CẬP NHẬT LẠI RAM CACHE
        await PricingService.refreshCache();

        res.json({ message: 'Cập nhật thành công', promotion: updatedPromotion });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật chiến dịch' });
    }
};

exports.deletePromotion = async (req, res) => {
    try {
        await Promotion.findByIdAndDelete(req.params.id);

        // 🟢 CẬP NHẬT LẠI RAM CACHE
        await PricingService.refreshCache();

        res.json({ message: 'Xóa chiến dịch thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa chiến dịch' });
    }
};