const Promotion = require('../../models/Promotion');
const PricingService = require('../../services/pricingService');
const { clearBotCache } = require('../messageController'); // ✅ Xóa cache chatbot khi có thay đổi promotion

// Helper dùng chung: refresh pricing + clear bot cache sau mỗi thay đổi
const syncAfterChange = async () => {
    await PricingService.refreshCache(); // Cập nhật RAM + ghi discountedPrice vào DB
    clearBotCache();                     // Chatbot sẽ lấy data promotion mới ở lần hỏi tiếp theo
};

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

        await syncAfterChange(); // ✅ Refresh pricing + clear bot cache

        const io = req.app.get('io');
        if (io) {
            io.emit('new_notification', {
                _id: promotion._id,
                title: `🔥 Khuyến mãi sốc: ${promotion.name}`,
                message: promotion.description || 'Khám phá ngay!',
                createdAt: promotion.createdAt,
                type: 'promotion',
                endDate: promotion.endDate
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
        if (!updatedPromotion) return res.status(404).json({ message: 'Không tìm thấy chiến dịch' });

        await syncAfterChange(); // ✅ Refresh pricing + clear bot cache

        res.json({ message: 'Cập nhật thành công', promotion: updatedPromotion });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật chiến dịch', error: err.message });
    }
};

exports.deletePromotion = async (req, res) => {
    try {
        const deleted = await Promotion.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Không tìm thấy chiến dịch' });

        await syncAfterChange(); // ✅ Refresh pricing + clear bot cache

        res.json({ message: 'Xóa chiến dịch thành công' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa chiến dịch', error: err.message });
    }
};