const Promotion = require('../../models/Promotion');
const Book = require('../../models/Book');

// 🛠️ HÀM HELPER: Quét và cập nhật giá sách tự động
const syncDiscountToBooks = async (promotion, isRemoving = false) => {
    let filter = {};

    // 1. Phân loại điều kiện lọc sách
    if (promotion.targetType === 'genre') {
        filter.genre = promotion.targetValue;
    } else if (promotion.targetType === 'book') {
        try {
            const bookIds = JSON.parse(promotion.targetValue);
            filter._id = { $in: bookIds };
        } catch (e) {
            return; // Lỗi parse thì bỏ qua
        }
    }

    const books = await Book.find(filter);

    // 2. Cập nhật từng cuốn sách (Sử dụng updateOne để chống lỗi Validation)
    for (let book of books) {
        let updateData = {};

        if (isRemoving || !promotion.isActive) {
            // Gỡ giảm giá, về lại giá gốc
            updateData = { $set: { discountedPrice: null } };
        } else {
            // Tính toán giá mới
            let discountAmount = promotion.discountType === 'percent'
                ? (book.price * promotion.discountValue) / 100
                : promotion.discountValue;

            let newPrice = Math.round(book.price - discountAmount); // Làm tròn số tiền
            updateData = { $set: { discountedPrice: newPrice > 0 ? newPrice : 0 } };
        }

        // ✅ Cập nhật thẳng vào DB, cực nhanh và không sợ lỗi sách cũ bị thiếu dữ liệu
        await Book.updateOne({ _id: book._id }, updateData);
    }
};

// --- CÁC API CRUD CHO ADMIN ---

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

        // Cập nhật giá sách ngay lập tức nếu chiến dịch đang active
        if (promotion.isActive) {
            await syncDiscountToBooks(promotion, false);
        }
        res.status(201).json({ message: 'Tạo chiến dịch thành công', promotion });
    } catch (err) {
        console.error("LỖI TẠO CHIẾN DỊCH:", err);
        res.status(500).json({ message: 'Lỗi tạo chiến dịch', error: err.message });
    }
};

exports.updatePromotion = async (req, res) => {
    try {
        const oldPromotion = await Promotion.findById(req.params.id);
        if (!oldPromotion) return res.status(404).json({ message: 'Không tìm thấy chiến dịch' });

        // Gỡ bỏ giá giảm cũ khỏi các cuốn sách bị ảnh hưởng trước đó
        await syncDiscountToBooks(oldPromotion, true);

        // Cập nhật thông tin chiến dịch mới
        const updatedPromotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // Áp dụng lại giá giảm mới cho sách (nếu đang active)
        if (updatedPromotion.isActive) {
            await syncDiscountToBooks(updatedPromotion, false);
        }

        res.json({ message: 'Cập nhật thành công', promotion: updatedPromotion });
    } catch (err) {
        console.error("LỖI SỬA CHIẾN DỊCH:", err);
        res.status(500).json({ message: 'Lỗi cập nhật chiến dịch' });
    }
};

exports.deletePromotion = async (req, res) => {
    try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion) return res.status(404).json({ message: 'Không tìm thấy chiến dịch' });

        // Gỡ bỏ giá giảm khỏi các cuốn sách đang được áp dụng
        await syncDiscountToBooks(promotion, true);

        await Promotion.findByIdAndDelete(req.params.id);
        res.json({ message: 'Xóa chiến dịch thành công và đã khôi phục giá gốc cho sách' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xóa chiến dịch' });
    }
};