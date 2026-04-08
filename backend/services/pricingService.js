// services/pricingService.js
const Promotion = require('../models/Promotion');

class PricingService {
    // Biến static lưu trữ khuyến mãi trên RAM
    static activePromotions = [];

    // Hàm 1: Load khuyến mãi từ DB lên RAM (Chỉ gọi khi khởi động hoặc có thay đổi)
    static async refreshCache() {
        const now = new Date();
        this.activePromotions = await Promotion.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).lean(); // Dùng .lean() để lấy object thuần, giúp RAM xử lý nhanh hơn
    }

    // Hàm 2: Ráp giá khuyễn mãi vào danh sách Sách (Chạy trong mili-giây)
    static applyPricing(books) {
        if (!books) return null;
        const isArray = Array.isArray(books);
        const bookList = isArray ? books : [books];

        const processedBooks = bookList.map(book => {
            // Chuyển Mongoose Document thành Object thuần nếu cần
            const bookData = book.toObject ? book.toObject() : book;
            let bestPrice = bookData.price;

            // Duyệt qua các khuyến mãi đang lưu trên RAM
            for (let promo of this.activePromotions) {
                let isMatch = false;
                let currentPromoPrice = bookData.price;

                if (promo.targetType === 'all') isMatch = true;
                else if (promo.targetType === 'genre' && bookData.genre === promo.targetValue) isMatch = true;
                else if (promo.targetType === 'book') {
                    try {
                        const configs = typeof promo.targetValue === 'string' ? JSON.parse(promo.targetValue) : promo.targetValue;
                        const matchedConfig = configs.find(c => c.bookId === String(bookData._id));
                        if (matchedConfig) {
                            isMatch = true;
                            // Tính giá riêng cho sách cụ thể
                            const discountAmt = matchedConfig.discountType === 'percent'
                                ? (bookData.price * matchedConfig.discountValue) / 100
                                : matchedConfig.discountValue;
                            currentPromoPrice = Math.round(bookData.price - discountAmt);
                        }
                    } catch (e) { }
                }

                // Nếu khớp logic thể loại hoặc all shop
                if (isMatch && promo.targetType !== 'book') {
                    const discountAmt = promo.discountType === 'percent'
                        ? (bookData.price * promo.discountValue) / 100
                        : promo.discountValue;
                    currentPromoPrice = Math.round(bookData.price - discountAmt);
                }

                // Chọn mức giá RẺ NHẤT nếu 1 cuốn sách nằm trong nhiều chiến dịch
                if (isMatch && currentPromoPrice < bestPrice && currentPromoPrice >= 0) {
                    bestPrice = currentPromoPrice;
                }
            }

            return {
                ...bookData,
                discountedPrice: bestPrice < bookData.price ? bestPrice : null
            };
        });

        return isArray ? processedBooks : processedBooks[0];
    }
}

module.exports = PricingService;