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

        // 3. Fallback description thông minh (Bổ sung NXB)
        let description = normalize(bookData.description);
        if (!description || description.length < 30) {
            description = `sách thể loại ${bookData.genre || 'chưa rõ'} của ${bookData.author || 'chưa rõ'}, xuất bản bởi ${bookData.publisher || 'chưa rõ'}`;
        }

        // 4. Gộp text + Boost trọng số cho Title, Genre & Publisher
        let textToEmbed = `
            tên sách: ${normalize(bookData.title)}
            tên sách: ${normalize(bookData.title)} 
            thể loại: ${normalize(bookData.genre)}
            thể loại: ${normalize(bookData.genre)}
            nhà xuất bản: ${normalize(bookData.publisher)}
            tác giả: ${normalize(bookData.author)}
            mô tả: ${description}
        `;

        textToEmbed = textToEmbed.slice(0, 1500);


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
            publisher: clean(req.body.publisher), // ✅ Nhận dữ liệu NXB từ request
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
        if (req.query.publisher) filter.publisher = req.query.publisher; // ✅ Hỗ trợ lọc theo NXB
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

            // 👉 FIX: Thêm publisher vào mảng check AI
            if (['title', 'author', 'genre', 'publisher', 'description'].includes(key) && normalizeStr(book[key]) !== normalizeStr(val)) {
                needUpdateAI = true;
            }
            book[key] = val;
        });

        if (req.file) {
            book.image = `/uploads/${req.file.filename}`;
        }

        if (needUpdateAI) {
            console.log(`🔄 Nội dung đổi, đang tạo lại Vector cho: ${book.title}`);
            const aiResult = await generateEmbedding({
                title: book.title,
                author: book.author,
                genre: book.genre,
                publisher: book.publisher, // ✅ Cập nhật Embedding với NXB mới
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

// Dọn dẹp cache tự động
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

        // 1. Kiểm tra Cache
        if (recommendationCache.has(bookId)) {
            const cached = recommendationCache.get(bookId);
            if (Date.now() - cached.timestamp <= CACHE_TTL) {
                allSorted = cached.data;
            } else {
                recommendationCache.delete(bookId);
            }
        }

        // 2. Xử lý tính toán nếu không có Cache
        if (allSorted.length === 0) {
            const currentBook = await Book.findById(bookId).select('+embedding');

            if (!currentBook || !currentBook.embedding?.length) {
                return res.json({ books: [], hasMore: false });
            }

            // ⚡ Candidate Pre-filtering (Lọc ứng viên sơ bộ)
            const [sameGenreBooks, otherBooks] = await Promise.all([
                // LUỒNG 1: Cùng thể loại
                Book.find({
                    _id: { $ne: currentBook._id },
                    genre: currentBook.genre,
                    stock: { $gt: 0 } // Loại sách hết hàng
                })
                    .sort({ sold: -1, createdAt: -1 })
                    .limit(100)
                    // ĐÃ XÓA 'rating', CHỈ GIỮ LẠI CÁC TRƯỜNG SỐ LIỆU TỔNG HỢP CẦN THIẾT
                    .select('+embedding author publisher price stock averageRating reviewCount')
                    .lean(),

                // LUỒNG 2: Khác thể loại
                Book.find({
                    _id: { $ne: currentBook._id },
                    genre: { $ne: currentBook.genre },
                    stock: { $gt: 0 }
                })
                    .sort({ sold: -1, createdAt: -1 })
                    .limit(50)
                    .select('+embedding author publisher price stock averageRating reviewCount')
                    .lean()
            ]);

            // 🧹 Deduplicate
            const map = new Map();
            [...sameGenreBooks, ...otherBooks].forEach(b => {
                map.set(b._id.toString(), b);
            });
            const candidates = Array.from(map.values());

            // 🧠 Dynamic threshold (Linh hoạt theo số lượng ứng viên thực tế)
            const threshold = candidates.length < 50 ? 0.2 : 0.25;

            // ⚡ HỆ THỐNG GỢI Ý LAI (WEIGHTED HYBRID SCORING)
            const scoredBooks = candidates.map(book => {
                if (!book.embedding?.length) return { book, finalScore: 0 };

                // --- 1. TÍNH ĐIỂM AI (COSINE SIMILARITY) ---
                // Giá trị trả về đã nằm trong khoảng ~[0, 1]
                const aiScore = cosineSimilarity(currentBook.embedding, book.embedding);

                // --- 2. TÍNH ĐIỂM KINH DOANH (BUSINESS RULES) ---
                // Chuẩn hóa Business Score về thang điểm [0, 1]
                let bizScoreRaw = 0;
                if (book.author === currentBook.author) bizScoreRaw += 0.5; // Cùng tác giả (Ưu tiên mạnh)
                if (book.publisher === currentBook.publisher) bizScoreRaw += 0.3; // Cùng NXB
                if (book.genre === currentBook.genre) bizScoreRaw += 0.2; // Cùng thể loại
                if (Math.abs(book.price - currentBook.price) < currentBook.price * 0.3) bizScoreRaw += 0.2; // Giá tương đồng

                // Penalty: Nếu tồn kho =0, đánh tụt điểm kinh doanh
                if (book.stock < 3) bizScoreRaw -= 0.5;

                // Đảm bảo BizScore luôn nằm trong mốc 0 - 1
                const businessScore = Math.max(0, Math.min(1, bizScoreRaw));

                // --- 3. TÍNH ĐIỂM CỘNG ĐỒNG (RATING) ---

                // --- 4. TỔNG HỢP & GIẢI QUYẾT BÀI TOÁN KHỞI ĐỘNG LẠNH (COLD START) ---
                const reviewCount = book.reviewCount || 0;
                const currentRating = book.averageRating || 0;
                const ratingScore = currentRating / 5;
                let finalScore = 0;

                // Nếu sách CHƯA có lượt đánh giá nào (Sách Mới) -> Dồn trọng số sang AI
                if (reviewCount < 5) {
                    const W_AI_NEW = 0.7;
                    const W_BIZ_NEW = 0.3;
                    finalScore = (aiScore * W_AI_NEW) + (businessScore * W_BIZ_NEW);
                }
                // Nếu sách ĐÃ có đánh giá -> Dùng tỷ lệ chuẩn (0.5 - 0.3 - 0.2)
                else {
                    const W_AI = 0.5;
                    const W_BIZ = 0.3;
                    const W_RATE = 0.2;
                    finalScore = (aiScore * W_AI) + (businessScore * W_BIZ) + (ratingScore * W_RATE);
                }

                // Gắn thêm các điểm số nhỏ vào object để sau này dễ debug/log
                return {
                    book,
                    score: finalScore, // Chữ 'score' này dùng để .sort() bên dưới
                    _debug: { aiScore, businessScore, ratingScore }
                };
            });

            // 🎯 Filter + sort
            allSorted = scoredBooks
                .filter(item => item.score > threshold)
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_CACHE)
                .map(item => {
                    const obj = item.book.toObject();
                    delete obj.embedding; // Xóa vector nặng trước khi nén vào cache
                    // console.log(`[Debug Score] ${obj.title}: AI(${item._debug.aiScore.toFixed(2)}) - Biz(${item._debug.businessScore.toFixed(2)}) - Rate(${item._debug.ratingScore.toFixed(2)}) => Total: ${item.score.toFixed(3)}`);
                    return obj;
                });

            // 🔄 Fallback (Trường hợp khẩn cấp nếu bị lọc rỗng)
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

            // 💾 Lưu Cache
            recommendationCache.set(bookId, {
                data: allSorted,
                timestamp: Date.now()
            });
        }

        // 📄 Phân trang (Pagination)
        const start = (page - 1) * limit;
        const end = page * limit;
        const paginated = allSorted.slice(start, end);

        // 💰 Áp dụng giá trị hiển thị (Khuyến mãi, Giá thực tế)
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

// ✅ API để lấy danh sách NXB (nếu cần dùng cho bộ lọc Frontend sau này)
exports.getAllPublishers = async (req, res) => {
    const publishers = [
        'NXB Trẻ', 'NXB Kim Đồng', 'NXB Giáo Dục Việt Nam',
        'NXB Tổng Hợp TPHCM', 'NXB Thế Giới'
    ];
    res.json(publishers);
};

exports.getTopSellingBooks = async (req, res) => {
    try {
        const topBooks = await Book.find()
            .sort({ sold: -1 })
            .limit(5)
            .lean();

        const finalBooks = PricingService.applyPricing(topBooks);
        res.json(finalBooks);
    } catch (err) {
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

// Đã gộp và xóa bản sao bị lỗi, giữ lại bản Analytics chính xác nhất có xử lý Khuyến mãi
exports.getBookManagementAnalytics = async (req, res) => {
    try {
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

        const turnoverRate = (totalSoldQuantity + totalStockQuantity) > 0
            ? ((totalSoldQuantity / (totalSoldQuantity + totalStockQuantity)) * 100).toFixed(1)
            : 0;

        const totalCostOfSold = allBooks.reduce((acc, b) => acc + (b.sold * (b.importPrice || b.price * 0.6)), 0);
        const totalRevenueSoFar = allBooks.reduce((acc, b) => acc + (b.sold * (b.discountedPrice || b.price)), 0);
        const grossMargin = totalRevenueSoFar > 0
            ? (((totalRevenueSoFar - totalCostOfSold) / totalRevenueSoFar) * 100).toFixed(1)
            : 0;

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

        const discountedCount = allBooks.filter(b => b.discountedPrice && b.discountedPrice < b.price).length;

        // Bổ sung thêm object properties bị thiếu từ bản cũ vào để Frontend không bị lỗi undefined
        const inventory = {
            lowStock: allBooks.filter(b => b.stock > 0 && b.stock <= 5).length,
            outOfStock: allBooks.filter(b => b.stock === 0).length,
            deadStock: allBooks.filter(b => b.sold === 0 && (new Date() - b.createdAt) > 30 * 24 * 60 * 60 * 1000).length,
        };

        const promotions = {
            discountedCount,
            poorPromoPerformance: allBooks.filter(b => b.discountedPrice && b.discountedPrice < b.price && b.sold < 2).length
        };

        res.json({
            summary: {
                totalInventoryValue: Math.round(totalInventoryValue),
                potentialProfit: Math.round(totalPotentialRevenue - totalInventoryValue),
                turnoverRate,
                grossMargin,
                topGenre,
                discountedCount,
                inventory,
                promotions
            }
        });
    } catch (err) {
        console.error("🔥 Lỗi Analytics:", err);
        res.status(500).json({ message: "Lỗi tính toán báo cáo" });
    }
};