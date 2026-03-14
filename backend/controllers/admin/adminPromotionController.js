const Promotion = require('../../models/Promotion');
const Book = require('../../models/Book');

// 🛠️ HÀM HELPER: Quét và cập nhật giá sách tự động
const syncDiscountToBooks = async (promotion, isRemoving = false) => {

    // ==========================================
    // TRƯỜNG HỢP 1: GIẢM THEO TỪNG SÁCH CỤ THỂ (Có mức giảm riêng)
    // ==========================================
    if (promotion.targetType === 'book') {
        try {
            // Frontend gửi lên chuỗi JSON chứa mảng Object: [{ bookId, discountType, discountValue }]
            const bookConfigs = JSON.parse(promotion.targetValue);

            // Trích xuất ra mảng chỉ chứa chữ ID (Tránh lỗi BSON ObjectId)
            const bookIds = bookConfigs.map(c => c.bookId);

            if (isRemoving || !promotion.isActive) {
                // Nếu xóa / tắt chiến dịch -> Gỡ sạch giá giảm của các sách này
                await Book.updateMany({ _id: { $in: bookIds } }, { $set: { discountedPrice: null } });
                return;
            }

            // Nếu đang chạy -> Tính toán giá giảm riêng rẽ cho TỪNG CUỐN SÁCH
            for (let config of bookConfigs) {
                const book = await Book.findById(config.bookId);
                if (book) {
                    let discountAmount = config.discountType === 'percent'
                        ? (book.price * config.discountValue) / 100
                        : config.discountValue;

                    let newPrice = Math.round(book.price - discountAmount); // Làm tròn

                    await Book.updateOne(
                        { _id: book._id },
                        { $set: { discountedPrice: newPrice > 0 ? newPrice : 0 } }
                    );
                }
            }
        } catch (e) {
            console.error("Lỗi parse cấu hình Sách cụ thể:", e);
        }
        return; // Xử lý xong sách cụ thể thì thoát hàm, không chạy phần Thể loại bên dưới nữa
    }

    // ==========================================
    // TRƯỜNG HỢP 2: GIẢM THEO THỂ LOẠI HOẶC TOÀN SHOP (Mức giảm chung)
    // ==========================================
    let filter = {};
    if (promotion.targetType === 'genre') {
        filter.genre = promotion.targetValue;
    }

    const books = await Book.find(filter);

    for (let book of books) {
        let updateData = {};

        if (isRemoving || !promotion.isActive) {
            updateData = { $set: { discountedPrice: null } };
        } else {
            let discountAmount = promotion.discountType === 'percent'
                ? (book.price * promotion.discountValue) / 100
                : promotion.discountValue;

            let newPrice = Math.round(book.price - discountAmount);
            updateData = { $set: { discountedPrice: newPrice > 0 ? newPrice : 0 } };
        }

        // Cập nhật thẳng vào DB, bỏ qua validation thừa
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

        // 👈 THÊM ĐOẠN NÀY ĐỂ BẮN THÔNG BÁO REAL-TIME QUA SOCKET
        const io = req.app.get('io');
        if (io) {
            io.emit('new_notification', {
                _id: promotion._id,
                title: `🔥 Khuyến mãi sốc: ${promotion.name}`,
                message: promotion.description || 'Nhiều tựa sách đang được giảm giá cực mạnh. Khám phá ngay!',
                createdAt: promotion.createdAt,
                type: 'promotion'
            });
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