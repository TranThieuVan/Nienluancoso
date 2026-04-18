const Book = require('../models/Book');
const Order = require('../models/Order');
const Promotion = require('../models/Promotion');
const PricingService = require('../services/pricingService');
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    // baseURL: "https://openrouter.ai/api/v1", // Bỏ comment nếu dùng OpenRouter
});

// ==========================================
// ✅ HELPER: GENERATE EMBEDDING (SUPER OPTIMIZED)
// ==========================================
const generateEmbedding = async (bookData) => {
    try {
        // 1. Chặn gọi API dư thừa (Phòng vệ)
        if (!bookData.title || !bookData.genre) return null;

        // 2. Chuẩn hóa chuỗi
        const normalize = (text) => (text || "").toLowerCase().replace(/\s+/g, " ").trim();

        // 3. Fallback description thông minh
        let description = normalize(bookData.description);
        if (!description || description.length < 30) {
            description = `sách thể loại ${bookData.genre || 'chưa rõ'} của ${bookData.author || 'chưa rõ'}`;
        }

        // 4. Gộp text + Boost trọng số cho Title & Genre
        let textToEmbed = `
            tên sách: ${normalize(bookData.title)}
            tên sách: ${normalize(bookData.title)} 
            thể loại: ${normalize(bookData.genre)}
            thể loại: ${normalize(bookData.genre)}
            tác giả: ${normalize(bookData.author)}
            mô tả: ${description}
        `;

        // 5. Ép token siêu nhỏ (Tối đa 500 ký tự)
        textToEmbed = textToEmbed.slice(0, 500);

        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: textToEmbed,
        });

        return {
            embedding: response.data[0].embedding,
            enrichedDescription: description
        };

    } catch (err) {
        console.error("⚠️ Lỗi embedding:", err.message);
        return null;
    }
};

// ==========================================
// ✅ HELPER: COSINE SIMILARITY (SAFE)
// ==========================================
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (!normA || !normB) return 0;

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

exports.createBook = async (req, res) => {
    try {
        const clean = (val) => typeof val === "string" ? val.trim() : val;

        const bookData = {
            title: clean(req.body.title),
            author: clean(req.body.author),
            price: Number(req.body.price),
            stock: Number(req.body.stock),
            genre: clean(req.body.genre),
            description: clean(req.body.description),
            image: req.file ? `/uploads/${req.file.filename}` : undefined
        };

        const aiResult = await generateEmbedding(bookData);
        if (aiResult) {
            bookData.embedding = aiResult.embedding;
            bookData.description = aiResult.enrichedDescription;
            bookData.embeddingUpdatedAt = new Date();
            bookData.embeddingVersion = 1;
        }

        const newBook = await Book.create(bookData);
        res.status(201).json(newBook);

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Lỗi tạo sách' });
    }
};

exports.getAllBooks = async (req, res) => {
    try {
        const filter = {};
        const now = new Date();

        if (req.query.genre) filter.genre = req.query.genre;
        if (req.query.search) {
            filter.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { author: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        if (req.query.filter === 'sale') {
            const promos = await Promotion.find({
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now }
            });

            if (promos.length === 0) {
                filter._id = { $in: [] };
            } else {
                let isAllShopSale = false;
                const saleGenres = [];
                const saleBookIds = [];

                promos.forEach(p => {
                    if (p.targetType === 'all') isAllShopSale = true;
                    else if (p.targetType === 'genre') saleGenres.push(p.targetValue);
                    else if (p.targetType === 'book') {
                        try { JSON.parse(p.targetValue).forEach(c => saleBookIds.push(c.bookId)); } catch (e) { }
                    }
                });

                if (!isAllShopSale) {
                    const conditions = [];
                    if (saleGenres.length > 0) conditions.push({ genre: { $in: saleGenres } });
                    if (saleBookIds.length > 0) conditions.push({ _id: { $in: saleBookIds } });
                    filter.$or = conditions.length > 0 ? conditions : [{ _id: { $in: [] } }];
                }
            }
        }

        let sort = { createdAt: -1 };
        if (req.query.sort === 'price_asc') sort = { price: 1 };
        if (req.query.sort === 'price_desc') sort = { price: -1 };

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [total, books] = await Promise.all([
            Book.countDocuments(filter),
            Book.find(filter).sort(sort).skip(skip).limit(limit)
        ]);

        res.json({
            books: PricingService.applyPricing(books),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (err) {
        res.status(500).json({ msg: 'Lỗi lấy sách' });
    }
};

exports.getBookById = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ msg: 'Không tìm thấy sách' });
        res.json(PricingService.applyPricing(book));
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server' });
    }
};


exports.updateBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ msg: 'Không tìm thấy sách' });

        let needUpdateAI = false;
        const normalizeStr = (v) => (v || "").toString().trim().toLowerCase();

        Object.keys(req.body).forEach(key => {
            let val = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
            if (key === 'price' || key === 'stock') val = Number(val);

            // 👉 FIX 1: So sánh cực kỳ chặt chẽ (đã xử lý khoảng trắng & in hoa)
            if (['title', 'author', 'genre', 'description'].includes(key) && normalizeStr(book[key]) !== normalizeStr(val)) {
                needUpdateAI = true;
            }
            book[key] = val;
        });

        if (req.file) {
            book.image = `/uploads/${req.file.filename}`;
        }

        if (needUpdateAI) {
            console.log(`🔄 Nội dung đổi, đang tạo lại Vector cho: ${book.title}`);
            // 👉 FIX 2: Truyền Object thuần thay vì truyền Document của Mongoose
            const aiResult = await generateEmbedding({
                title: book.title,
                author: book.author,
                genre: book.genre,
                description: book.description
            });

            if (aiResult) {
                book.embedding = aiResult.embedding;
                book.description = aiResult.enrichedDescription;
                book.embeddingUpdatedAt = new Date();
                book.embeddingVersion = (book.embeddingVersion || 1) + 1;
            }
        }

        await book.save();
        res.json(book);

    } catch (err) {
        res.status(500).json({ msg: 'Lỗi update' });
    }
};

exports.deleteBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ msg: 'Không tìm thấy sách' });

        if (book.image) {
            const imgPath = path.join(__dirname, "..", "public", book.image);
            fs.unlink(imgPath, () => { });
        }

        await book.deleteOne();
        res.json({ msg: 'Đã xoá' });
    } catch {
        res.status(500).json({ msg: 'Lỗi xoá' });
    }
};

// ==========================================
// 🚀 HỆ THỐNG GỢI Ý & CACHE
// ==========================================
const recommendationCache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

// 👉 FIX 5: Xóa rác Cache định kỳ mỗi 10 phút chống Memory Leak
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of recommendationCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            recommendationCache.delete(key);
        }
    }
}, 10 * 60 * 1000);

exports.getRecommendations = async (req, res) => {
    try {
        const bookId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const MAX_CACHE = 30;

        let allSorted = [];

        // 1. Cache
        if (recommendationCache.has(bookId)) {
            const cached = recommendationCache.get(bookId);
            if (Date.now() - cached.timestamp <= CACHE_TTL) {
                allSorted = cached.data;
            } else {
                recommendationCache.delete(bookId);
            }
        }

        // 2. Nếu chưa có cache
        if (allSorted.length === 0) {
            const currentBook = await Book.findById(bookId).select('+embedding');

            if (!currentBook || !currentBook.embedding?.length) {
                return res.json({ books: [], hasMore: false });
            }

            // ⚡ Query song song
            const [sameGenreBooks, otherBooks] = await Promise.all([
                Book.find({
                    _id: { $ne: currentBook._id },
                    genre: currentBook.genre
                }).limit(100).select('+embedding'),

                Book.find({
                    _id: { $ne: currentBook._id },
                    genre: { $ne: currentBook.genre }
                }).limit(50).select('+embedding')
            ]);

            // 🧹 Deduplicate
            const map = new Map();
            [...sameGenreBooks, ...otherBooks].forEach(b => {
                map.set(b._id.toString(), b);
            });
            const candidates = Array.from(map.values());

            // 🧠 Dynamic threshold
            const threshold = candidates.length < 50 ? 0.2 : 0.3;

            // ⚡ Scoring
            const scoredBooks = candidates.map(book => {
                if (!book.embedding?.length) return { book, score: 0 };

                let score = cosineSimilarity(currentBook.embedding, book.embedding);

                // 🔥 Business rules
                if (book.author === currentBook.author) score += 0.15;
                if (book.genre === currentBook.genre) score += 0.05;
                if (Math.abs(book.price - currentBook.price) < currentBook.price * 0.3) score += 0.03;
                if (book.stock < 5) score -= 0.05;

                return { book, score };
            });

            // 🎯 Filter + sort
            allSorted = scoredBooks
                .filter(item => item.score > threshold)
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_CACHE)
                .map(item => {
                    const obj = item.book.toObject();
                    delete obj.embedding;
                    return obj;
                });

            // 🔄 Fallback nếu rỗng (KHÔNG random nữa)
            if (allSorted.length === 0) {
                allSorted = scoredBooks
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10)
                    .map(item => {
                        const obj = item.book.toObject();
                        delete obj.embedding;
                        return obj;
                    });
            }

            // 💾 Cache
            recommendationCache.set(bookId, {
                data: allSorted,
                timestamp: Date.now()
            });
        }

        // 📄 Pagination
        const start = (page - 1) * limit;
        const end = page * limit;

        const paginated = allSorted.slice(start, end);

        // 💰 Apply pricing (QUAN TRỌNG)
        const booksWithPrice = PricingService.applyPricing(paginated);

        res.json({
            books: booksWithPrice,
            hasMore: end < allSorted.length
        });

    } catch (err) {
        console.error("Lỗi recommend:", err);
        res.status(500).json({ msg: 'Lỗi hệ thống gợi ý' });
    }
};
exports.getAllGenres = async (req, res) => {
    const genres = [
        'Comics', 'Kinh tế', 'Chính trị', 'Tình cảm/Lãng mạn',
        'Viễn tưởng', 'Kinh dị', 'Self-help', 'Kinh doanh/Tài chính', 'Bí ẩn/Trinh thám'
    ];
    res.json(genres);
};

exports.getTopSellingBooks = async (req, res) => {
    try {
        const { preset = '30days' } = req.query;
        const matchStage = { status: "completed" };

        // Xử lý bộ lọc thời gian
        if (preset && preset !== 'all') {
            const now = new Date();
            const startDate = new Date(now);
            startDate.setUTCHours(-7, 0, 0, 0);

            const endDate = new Date(now);
            endDate.setUTCHours(16, 59, 59, 999);

            switch (preset) {
                case 'today': break;
                case 'yesterday':
                    startDate.setDate(startDate.getDate() - 1);
                    endDate.setDate(endDate.getDate() - 1);
                    break;
                case '3days':
                    startDate.setDate(startDate.getDate() - 2);
                    break;
                case '7days':
                    startDate.setDate(startDate.getDate() - 6);
                    break;
                case '30days':
                    startDate.setDate(startDate.getDate() - 29);
                    break;
                case '365days':
                    startDate.setDate(startDate.getDate() - 364);
                    break;
            }
            matchStage.createdAt = { $gte: startDate, $lte: endDate };
        }

        const result = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.book",
                    totalSold: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "books",
                    localField: "_id",
                    foreignField: "_id",
                    as: "book"
                }
            },
            { $unwind: "$book" },
            {
                $project: {
                    _id: "$book._id",
                    title: "$book.title",
                    author: "$book.author",
                    image: "$book.image",
                    genre: "$book.genre", // 🔥 FIX: Bắt buộc lấy genre để PricingService chạy khuyến mãi theo thể loại
                    price: "$book.price",
                    stock: "$book.stock",
                    totalSold: 1,
                    revenue: 1
                }
            }
        ]);

        // 🔥 FIX TRỌNG TÂM: Đưa mảng kết quả qua PricingService để tính toán realtime (Giải quyết triệt để lỗi 50k -> 11%)
        const finalBooks = PricingService.applyPricing(result);

        res.json(finalBooks);
    } catch (err) {
        console.error("Lỗi getTopSellingBooks:", err);
        res.status(500).json({ message: 'Lỗi khi lấy top sách bán chạy' });
    }
};

exports.getLowStockBooks = async (req, res) => {
    try {
        const books = await Book.find({ stock: { $lte: 5 } })
            .select('title stock image')
            .sort({ stock: 1 })
            .limit(10);

        res.json(books);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getBookManagementAnalytics = async (req, res) => {
    try {
        // Lấy data thô (Bổ sung trường genre)
        const allBooksRaw = await Book.find().select('title stock sold price importPrice genre createdAt');

        // 🔥 FIX TRỌNG TÂM: Bắt buộc map qua PricingService để render đúng 100% data khuyến mãi hiện tại
        const allBooks = PricingService.applyPricing(allBooksRaw.map(b => b.toObject()));

        let totalInventoryValue = 0;
        let potentialProfit = 0;

        allBooks.forEach(book => {
            const currentPrice = book.discountedPrice || book.price || 0;
            const costPrice = book.importPrice || (book.price * 0.6);
            const profitPerUnit = currentPrice - costPrice;

            totalInventoryValue += (book.stock * costPrice);
            potentialProfit += (book.stock * profitPerUnit);
        });

        const inventory = {
            lowStock: allBooks.filter(b => b.stock > 0 && b.stock <= 5).length,
            outOfStock: allBooks.filter(b => b.stock === 0).length,
            deadStock: allBooks.filter(b => b.sold === 0 && (new Date() - b.createdAt) > 30 * 24 * 60 * 60 * 1000).length,
        };

        const promotions = {
            discountedCount: allBooks.filter(b => b.discountedPrice && b.discountedPrice < b.price).length,
            poorPromoPerformance: allBooks.filter(b => b.discountedPrice && b.discountedPrice < b.price && b.sold < 2).length
        };

        res.json({
            summary: {
                totalInventoryValue: Math.round(totalInventoryValue),
                potentialProfit: Math.round(potentialProfit),
                inventory,
                promotions
            }
        });

    } catch (err) {
        console.error("🔥 Lỗi API Analytics:", err);
        res.status(500).json({ message: "Lỗi tính toán báo cáo sách", error: err.message });
    }
};

exports.getBookManagementAnalytics = async (req, res) => {
    try {
        // ✅ FIX: Bổ sung _id vào select để PricingService có thể khớp chương trình khuyến mãi
        const allBooksRaw = await Book.find().select('_id title stock sold price importPrice genre createdAt');
        const allBooks = PricingService.applyPricing(allBooksRaw.map(b => b.toObject()));

        let totalInventoryValue = 0;
        let totalPotentialRevenue = 0;
        let totalSoldQuantity = 0;
        let totalStockQuantity = 0;
        const genreStats = {};

        allBooks.forEach(book => {
            const currentPrice = book.discountedPrice || book.price || 0;
            const costPrice = book.importPrice || (book.price * 0.6);

            totalInventoryValue += (book.stock * costPrice);
            totalPotentialRevenue += (book.stock * currentPrice);
            totalSoldQuantity += (book.sold || 0);
            totalStockQuantity += book.stock;

            if (!genreStats[book.genre]) {
                genreStats[book.genre] = { revenue: 0, profit: 0, sold: 0 };
            }
            const unitProfit = currentPrice - costPrice;
            genreStats[book.genre].revenue += (book.sold * currentPrice);
            genreStats[book.genre].profit += (book.sold * unitProfit);
            genreStats[book.genre].sold += book.sold;
        });

        // 1. Tỷ lệ quay vòng vốn
        const turnoverRate = (totalSoldQuantity + totalStockQuantity) > 0
            ? ((totalSoldQuantity / (totalSoldQuantity + totalStockQuantity)) * 100).toFixed(1)
            : 0;

        // 2. Biên lợi nhuận gộp (%)
        const totalCostOfSold = allBooks.reduce((acc, b) => acc + (b.sold * (b.importPrice || b.price * 0.6)), 0);
        const totalRevenueSoFar = allBooks.reduce((acc, b) => acc + (b.sold * (b.discountedPrice || b.price)), 0);
        const grossMargin = totalRevenueSoFar > 0
            ? (((totalRevenueSoFar - totalCostOfSold) / totalRevenueSoFar) * 100).toFixed(1)
            : 0;

        // 3. TÌM THỂ LOẠI CÓ DOANH THU CAO NHẤT VÀ TÍNH TỈ TRỌNG (%)
        const sortedGenresByRevenue = Object.entries(genreStats).sort((a, b) => b[1].revenue - a[1].revenue);
        let topGenre = null;
        if (sortedGenresByRevenue.length > 0 && totalRevenueSoFar > 0) {
            const top = sortedGenresByRevenue[0];
            topGenre = {
                name: top[0],
                percentage: ((top[1].revenue / totalRevenueSoFar) * 100).toFixed(1)
            };
        } else if (sortedGenresByRevenue.length > 0) {
            topGenre = { name: sortedGenresByRevenue[0][0], percentage: 0 };
        }

        // ✅ FIX: Đếm chính xác số lượng đang giảm giá (nếu giá KM nhỏ hơn giá gốc)
        const discountedCount = allBooks.filter(b => b.discountedPrice && b.discountedPrice < b.price).length;

        res.json({
            summary: {
                totalInventoryValue: Math.round(totalInventoryValue),
                potentialProfit: Math.round(totalPotentialRevenue - totalInventoryValue),
                turnoverRate,
                grossMargin,
                topGenre,
                discountedCount, // ✅ Trả về số lượng KM chính xác
                inventory: {
                    lowStock: allBooks.filter(b => b.stock > 0 && b.stock <= 5).length,
                    outOfStock: allBooks.filter(b => b.stock === 0).length
                }
            }
        });
    } catch (err) {
        console.error("🔥 Lỗi Analytics:", err);
        res.status(500).json({ message: "Lỗi tính toán báo cáo" });
    }
};