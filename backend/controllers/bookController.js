const Book = require('../models/Book');
const Order = require('../models/Order')
const Rating = require('../models/Rating');
const Promotion = require('../models/Promotion');
const PricingService = require('../services/pricingService');
const OpenAI = require("openai");

// Khởi tạo OpenAI (Nếu model embedding bị lỗi với OpenRouter, bạn hãy dùng base URL gốc của OpenAI nhé)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

// ✅ HÀM TRỢ GIÚP 1: Dịch sách thành Vector
const generateEmbedding = async (bookData) => {
    try {
        // Gộp chuỗi thông minh để AI hiểu nội dung
        const textToEmbed = `Tên sách: ${bookData.title}. Tác giả: ${bookData.author || 'Chưa rõ'}. Thể loại: ${bookData.genre || 'Chưa rõ'}. Mô tả: ${bookData.description || 'Không có'}`;

        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // Model chuyên tạo vector
            input: textToEmbed,
        });

        return response.data[0].embedding; // Trả về mảng 1536 số
    } catch (error) {
        console.error("⚠️ Lỗi tạo vector embedding:", error);
        return null; // Nếu lỗi thì trả về null, không làm sập chức năng thêm sách
    }
};

// ✅ HÀM TRỢ GIÚP 2: Toán học thuần JS đo độ giống nhau giữa 2 mảng số
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

exports.createBook = async (req, res) => {
    try {
        const cleanBody = {};
        for (let key in req.body) {
            const cleanKey = key.trim();
            const cleanValue = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
            cleanBody[cleanKey] = cleanValue;
        }

        console.log('🟢 Cleaned Body:', cleanBody);
        console.log('🟢 Uploaded File:', req.file);

        const bookData = {
            title: cleanBody.title,
            author: cleanBody.author,
            price: Number(cleanBody.price),
            stock: Number(cleanBody.stock),
            genre: cleanBody.genre,
            description: cleanBody.description,
            image: req.file ? `/uploads/${req.file.filename}` : undefined
        };

        const embedding = await generateEmbedding(bookData);
        if (embedding) {
            bookData.embedding = embedding;
        }

        const newBook = await Book.create(bookData);
        res.status(201).json(newBook);
    } catch (err) {
        console.error('❌ Error creating book:', err);
        res.status(500).json({ msg: 'Lỗi tạo sách', err });
    }
};
exports.getAllBooks = async (req, res) => {
    try {
        const filter = {};
        const now = new Date();

        // 1. Lọc Genre & Search
        if (req.query.genre) filter.genre = req.query.genre;
        if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };

        // 2. Lọc theo Promotion
        if (req.query.promo) {
            const promo = await Promotion.findById(req.query.promo);
            if (promo && promo.isActive && new Date(promo.startDate) <= now && new Date(promo.endDate) >= now) {
                if (promo.targetType === 'genre') {
                    filter.genre = promo.targetValue;
                } else if (promo.targetType === 'book') {
                    try {
                        const configs = JSON.parse(promo.targetValue);
                        filter._id = { $in: configs.map(c => c.bookId) };
                    } catch (e) { }
                }
            } else { filter._id = null; }
        }
        else if (req.query.filter === 'sale') {
            const activePromos = await Promotion.find({
                isActive: true, startDate: { $lte: now }, endDate: { $gte: now }
            });

            if (activePromos.length === 0) {
                filter._id = null;
            } else {
                let isAllShopSale = false;
                const saleGenres = [];
                const saleBookIds = [];

                activePromos.forEach(p => {
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
                    filter.$or = conditions.length > 0 ? conditions : [{ _id: null }];
                }
            }
        }

        // 3. Logic Sắp xếp (Sort)
        let sortQuery = { createdAt: -1 };
        if (req.query.sort === 'price_asc') sortQuery = { price: 1 };
        if (req.query.sort === 'price_desc') sortQuery = { price: -1 };
        if (req.query.sort === 'name_asc') sortQuery = { title: 1 };
        if (req.query.sort === 'name_desc') sortQuery = { title: -1 }; // Bổ sung Z -> A

        // 4. Phân trang
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 21;
        const skip = (page - 1) * limit;

        const totalBooks = await Book.countDocuments(filter);
        const books = await Book.find(filter).sort(sortQuery).skip(skip).limit(limit);

        // Áp dụng Giá Động (Pricing Engine)
        const booksWithPrice = PricingService.applyPricing(books);

        res.json({
            books: booksWithPrice,
            currentPage: page,
            totalPages: Math.ceil(totalBooks / limit),
            totalBooks
        });
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi lấy sách', err });
    }
};

exports.getBookById = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ msg: 'Không tìm thấy sách' });

        const bookWithPrice = PricingService.applyPricing(book);
        res.json(bookWithPrice);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server', err });
    }
};
exports.updateBook = async (req, res) => {
    try {
        const cleanBody = {};

        for (let key in req.body) {
            const cleanKey = key.trim();
            let cleanValue = req.body[key];

            // Ép kiểu nếu là số
            if (cleanKey === 'price' || cleanKey === 'stock') {
                cleanValue = Number(cleanValue);
            } else if (typeof cleanValue === 'string') {
                cleanValue = cleanValue.trim();
            }

            cleanBody[cleanKey] = cleanValue;
        }

        // Nếu có file ảnh mới
        if (req.file) {
            cleanBody.image = `/uploads/${req.file.filename}`;
        }

        console.log('Clean Body for Update:', cleanBody);
        console.log('Uploaded File:', req.file);

        // ✅ THÊM ĐOẠN NÀY: Tạo lại vector vì nội dung sách có thể đã bị sửa
        const existingBook = await Book.findById(req.params.id);
        const mergedData = { ...existingBook.toObject(), ...cleanBody }; // Trộn data cũ và mới để AI đọc

        const embedding = await generateEmbedding(mergedData);
        if (embedding) {
            cleanBody.embedding = embedding;
        }

        const updatedBook = await Book.findByIdAndUpdate(req.params.id, cleanBody, { new: true });

        if (!updatedBook) {
            return res.status(404).json({ msg: 'Không tìm thấy sách để cập nhật' });
        }

        res.json(updatedBook);
    } catch (err) {
        console.error('❌ Lỗi cập nhật sách:', err);
        res.status(500).json({ msg: 'Lỗi server khi cập nhật sách', error: err.message });
    }
};

exports.get


const fs = require("fs");
const path = require("path");
exports.deleteBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ msg: "Không tìm thấy sách để xoá" });
        }

        // Xoá ảnh nếu có
        if (book.image) {
            const imagePath = path.join(__dirname, "..", "public", book.image);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.warn("⚠️ Không thể xoá ảnh:", err.message); // không dừng chương trình
                } else {
                    console.log("🗑 Đã xoá ảnh:", imagePath);
                }
            });
        }
        await book.deleteOne();
        res.json({ msg: "🗑 Đã xoá sách thành công" });
    } catch (err) {
        console.error("❌ Lỗi xoá sách:", err);
        res.status(500).json({ msg: "Lỗi xoá sách", err });
    }
};

// Lấy danh sách tất cả thể loại (không trùng)
exports.getAllGenres = async (req, res) => {
    try {
        const genres = await Book.distinct('genre');
        res.json(genres);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thể loại', error });
    }
};

// Thay thế hàm cũ trong controllers/bookController.js
exports.getTopSellingBooks = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Điều kiện mặc định: Chỉ lấy đơn hàng giao thành công
        const matchStage = { status: "delivered" };

        // Nếu client truyền ngày tháng lên, thêm bộ lọc ngày vào query
        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const result = await Order.aggregate([
            { $match: matchStage },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.book",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }, // Lấy Top 5
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
                    price: "$book.price",
                    stock: "$book.stock",
                    totalSold: 1
                }
            }
        ]);

        res.json(result);
    } catch (err) {
        console.error("Lỗi getTopSellingBooks:", err);
        res.status(500).json({ message: 'Lỗi khi lấy top sách bán chạy' });
    }
};

exports.getLowStockBooks = async (req, res) => {
    try {
        const books = await Book.find({ stock: { $lte: 5 } })
            .select('title stock image')
            .sort({ stock: 1 }) // sách gần hết ở đầu
            .limit(10);

        res.json(books);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// ==========================================
// TẠO BỘ NHỚ ĐỆM (CACHE) BẢO VỆ SERVER
// ==========================================
const recommendationCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // Thời gian sống của Cache: 15 phút (tính bằng mili-giây)

exports.getRecommendations = async (req, res) => {
    try {
        const bookId = req.params.id;

        // Nhận thông số phân trang từ Frontend
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const MAX_CACHE_RESULTS = 30; // Giới hạn lưu tối đa 30 cuốn ngon nhất vào RAM

        let allSortedRecommendations = []; // Biến chứa toàn bộ sách đã sắp xếp

        // -------------------------------------------------------------------
        // 1. KIỂM TRA CACHE (Lấy toàn bộ danh sách từ RAM nếu có)
        // -------------------------------------------------------------------
        if (recommendationCache.has(bookId)) {
            const cachedItem = recommendationCache.get(bookId);
            const isExpired = (Date.now() - cachedItem.timestamp) > CACHE_TTL;

            if (!isExpired) {
                allSortedRecommendations = cachedItem.data; // Bốc từ RAM ra
            } else {
                recommendationCache.delete(bookId); // Quá hạn thì xóa đi
            }
        }

        // -------------------------------------------------------------------
        // 2. NẾU CACHE TRỐNG -> TRUY VẤN DB VÀ TÍNH TOÁN LẠI TỪ ĐẦU
        // -------------------------------------------------------------------
        if (allSortedRecommendations.length === 0) {
            const currentBook = await Book.findById(bookId).select('+embedding');

            if (!currentBook || !currentBook.embedding || currentBook.embedding.length === 0) {
                return res.json({ books: [], hasMore: false });
            }

            // Lấy Candidate Books (Giới hạn 200 cuốn)
            const sameGenreBooks = await Book.find({
                _id: { $ne: currentBook._id },
                genre: currentBook.genre
            }).limit(150).select('+embedding');

            const otherBooks = await Book.find({
                _id: { $ne: currentBook._id },
                genre: { $ne: currentBook.genre }
            }).limit(50).select('+embedding');

            const candidateBooks = [...sameGenreBooks, ...otherBooks];

            // Tính điểm
            const scoredBooks = candidateBooks.map(book => {
                if (!book.embedding || book.embedding.length === 0) return { book, score: 0 };

                let score = cosineSimilarity(currentBook.embedding, book.embedding);

                if (book.author === currentBook.author) score += 0.15;
                if (book.genre === currentBook.genre) score += 0.05;
                if (Math.abs(book.price - currentBook.price) < currentBook.price * 0.3) score += 0.03;
                if (book.stock < 5) score -= 0.05;

                return { book, score };
            });

            // Lọc, Sắp xếp và lưu vào biến tổng
            allSortedRecommendations = scoredBooks
                .filter(item => item.score > 0.4)
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_CACHE_RESULTS) // Chỉ giữ 30 cuốn tốt nhất
                .map(item => {
                    const bookObj = item.book.toObject();
                    delete bookObj.embedding;
                    return bookObj;
                });

            // Lưu toàn bộ 30 cuốn này vào Cache để các trang sau (page 2, 3) lấy dùng luôn
            recommendationCache.set(bookId, {
                data: allSortedRecommendations,
                timestamp: Date.now()
            });
        }

        // -------------------------------------------------------------------
        // 3. THUẬT TOÁN CẮT LÁT (PHÂN TRANG DỰA TRÊN MẢNG ĐÃ TÍNH TÓAN)
        // -------------------------------------------------------------------
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedBooks = allSortedRecommendations.slice(startIndex, endIndex);

        // Kiểm tra xem cuộn trang tiếp thì còn sách không
        const hasMore = endIndex < allSortedRecommendations.length;

        // Trả về Frontend
        res.json({
            books: paginatedBooks,
            hasMore: hasMore
        });

    } catch (err) {
        console.error("❌ Lỗi getRecommendations:", err);
        res.status(500).json({ error: 'Lỗi server khi tìm sách đề xuất' });
    }
};

exports.getBookManagementAnalytics = async (req, res) => {
    try {
        const [allBooks, topByRevenue] = await Promise.all([
            Book.find().select('title stock sold price importPrice discountedPrice genre createdAt'),

            // Tối ưu lại Query Doanh thu
            Order.aggregate([
                { $match: { status: "delivered" } },
                { $unwind: "$items" },
                // Join thẳng với bảng books để lấy giá lúc tính
                { $lookup: { from: 'books', localField: 'items.book', foreignField: '_id', as: 'bookData' } },
                { $unwind: "$bookData" },
                {
                    $group: {
                        _id: "$bookData._id",
                        title: { $first: "$bookData.title" },
                        unitsSold: { $sum: "$items.quantity" },
                        totalRevenue: {
                            $sum: {
                                $multiply: [
                                    { $ifNull: ["$bookData.discountedPrice", "$bookData.price"] },
                                    "$items.quantity"
                                ]
                            }
                        }
                    }
                },
                { $sort: { totalRevenue: -1 } },
                { $limit: 5 }
            ])
        ]);

        let totalInventoryValue = 0;
        let potentialProfit = 0;

        allBooks.forEach(book => {
            const currentPrice = book.discountedPrice || book.price || 0;
            // 🛡️ Bọc chống lỗi NaN: Nếu chưa kịp chạy migrate, lấy tạm 60%
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
            poorPromoPerformance: allBooks.filter(b => b.discountedPrice && b.sold < 2).length
        };

        res.json({
            summary: {
                totalInventoryValue: Math.round(totalInventoryValue),
                potentialProfit: Math.round(potentialProfit),
                inventory,
                promotions
            },
            topRevenueBooks: topByRevenue.map(item => ({
                title: item.title,
                revenue: item.totalRevenue,
                sold: item.unitsSold
            })),
            deadStockList: allBooks.filter(b => b.sold === 0).slice(0, 5)
        });

    } catch (err) {
        console.error("🔥 Lỗi API Analytics:", err);
        res.status(500).json({ message: "Lỗi tính toán báo cáo sách", error: err.message });
    }
};

// ✅ API ĐỒNG BỘ AI: Tự động tạo Vector cho TẤT CẢ sách cũ chưa có

// exports.syncAIVectors = async (req, res) => {
//     try {
//         const booksWithoutAI = await Book.find({
//             $or: [
//                 { embedding: { $exists: false } },
//                 { embedding: { $size: 0 } }
//             ]
//         });

//         if (booksWithoutAI.length === 0) {
//             return res.json({ message: "🎉 Tuyệt vời! Toàn bộ kho sách của bạn đã được tích hợp AI." });
//         }

//         res.write("Đang bat dau dong bo... Vui long doi...\n"); 

//         let successCount = 0;
//         for (let book of booksWithoutAI) {
//             const bookData = {
//                 title: book.title,
//                 author: book.author,
//                 genre: book.genre,
//                 description: book.description
//             };

//             const embedding = await generateEmbedding(bookData);
            
//             if (embedding) {
//                 book.embedding = embedding;
//                 await book.save();
//                 successCount++;
//                 console.log(`✅ Đã nạp AI cho sách: ${book.title}`);
//             }
            
//             await new Promise(resolve => setTimeout(resolve, 1000)); 
//         }

//         res.end(`\nHoan tat! Da cap nhat AI cho ${successCount}/${booksWithoutAI.length} cuon sach.`);
//     } catch (err) {
//         console.error("❌ Lỗi đồng bộ AI:", err);
//         res.end("\nLoi he thong khi dong bo.");
//     }
// };