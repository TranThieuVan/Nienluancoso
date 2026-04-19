// services/pricingService.js
const Promotion = require('../models/Promotion');
const Book = require('../models/Book'); // ✅ Cần để ghi discountedPrice vào DB

class PricingService {
    // Biến static lưu trữ khuyến mãi trên RAM
    static activePromotions = [];

    // Hàm 1: Load khuyến mãi từ DB lên RAM + đồng bộ discountedPrice vào từng Book
    static async refreshCache() {
        try {
            const now = new Date();

            // Bước 1: Load promotions đang active vào RAM — giữ cho applyPricing() dùng
            this.activePromotions = await Promotion.find({
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            }).lean();

            // Bước 2: Reset toàn bộ discountedPrice về null trong 1 query duy nhất
            await Book.updateMany({}, { $set: { discountedPrice: null } });

            // Bước 3: Tính và ghi giá KM theo từng promotion bằng bulkWrite — không N+1
            for (const promo of this.activePromotions) {

                if (promo.targetType === 'all') {
                    if (promo.discountType === 'percent') {
                        const books = await Book.find({}).select('_id price').lean();
                        const bulkOps = books.map(b => ({
                            updateOne: {
                                filter: { _id: b._id },
                                // $min giữ giá thấp nhất nếu nhiều KM cùng áp dụng lên 1 cuốn
                                update: { $min: { discountedPrice: Math.max(0, Math.round(b.price * (1 - promo.discountValue / 100))) } }
                            }
                        }));
                        if (bulkOps.length) await Book.bulkWrite(bulkOps);
                    } else {
                        // fixed: dùng aggregation pipeline để tính trực tiếp từ $price trên DB
                        await Book.updateMany(
                            { price: { $gt: promo.discountValue } },
                            [{ $set: { discountedPrice: { $min: [{ $ifNull: ['$discountedPrice', '$price'] }, { $subtract: ['$price', promo.discountValue] }] } } }]
                        );
                    }

                } else if (promo.targetType === 'genre') {
                    if (promo.discountType === 'percent') {
                        const books = await Book.find({ genre: promo.targetValue }).select('_id price').lean();
                        const bulkOps = books.map(b => ({
                            updateOne: {
                                filter: { _id: b._id },
                                update: { $min: { discountedPrice: Math.max(0, Math.round(b.price * (1 - promo.discountValue / 100))) } }
                            }
                        }));
                        if (bulkOps.length) await Book.bulkWrite(bulkOps);
                    } else {
                        await Book.updateMany(
                            { genre: promo.targetValue, price: { $gt: promo.discountValue } },
                            [{ $set: { discountedPrice: { $min: [{ $ifNull: ['$discountedPrice', '$price'] }, { $subtract: ['$price', promo.discountValue] }] } } }]
                        );
                    }

                } else if (promo.targetType === 'book') {
                    try {
                        const configs = typeof promo.targetValue === 'string'
                            ? JSON.parse(promo.targetValue)
                            : promo.targetValue;

                        // Dùng aggregation pipeline trong bulkWrite để tính giá dựa trên $price thực của từng cuốn
                        const bulkOps = configs.map(c => ({
                            updateOne: {
                                filter: { _id: c.bookId },
                                update: [{
                                    $set: {
                                        discountedPrice: {
                                            $min: [
                                                { $ifNull: ['$discountedPrice', '$price'] },
                                                c.discountType === 'percent'
                                                    ? { $max: [0, { $round: [{ $multiply: ['$price', { $subtract: [1, { $divide: [c.discountValue, 100] }] }] }, 0] }] }
                                                    : { $max: [0, { $subtract: ['$price', c.discountValue] }] }
                                            ]
                                        }
                                    }
                                }]
                            }
                        }));
                        if (bulkOps.length) await Book.bulkWrite(bulkOps);
                    } catch (e) {
                        console.error('❌ Lỗi parse targetValue book promotion:', e);
                    }
                }
            }

            console.log(`✅ PricingService: cache refreshed — ${this.activePromotions.length} promotions active.`);
        } catch (err) {
            console.error('❌ Lỗi PricingService.refreshCache:', err);
        }
    }

    // Hàm 2: Ráp giá khuyến mãi vào danh sách Sách từ RAM (chạy trong mili-giây, không query DB)
    static applyPricing(books) {
        if (!books) return null;
        const isArray = Array.isArray(books);
        const bookList = isArray ? books : [books];

        const processedBooks = bookList.map(book => {
            const bookData = book.toObject ? book.toObject() : book;
            let bestPrice = bookData.price;

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
                            const discountAmt = matchedConfig.discountType === 'percent'
                                ? (bookData.price * matchedConfig.discountValue) / 100
                                : matchedConfig.discountValue;
                            currentPromoPrice = Math.max(0, Math.round(bookData.price - discountAmt));
                        }
                    } catch (e) { }
                }

                if (isMatch && promo.targetType !== 'book') {
                    const discountAmt = promo.discountType === 'percent'
                        ? (bookData.price * promo.discountValue) / 100
                        : promo.discountValue;
                    currentPromoPrice = Math.max(0, Math.round(bookData.price - discountAmt));
                }

                if (isMatch && currentPromoPrice < bestPrice) {
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