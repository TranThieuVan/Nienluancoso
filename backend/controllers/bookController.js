const Book = require('../models/Book');
const Order = require('../models/Order')
const Rating = require('../models/Rating');

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
        if (req.query.genre) {
            filter.genre = req.query.genre;
        }
        if (req.query.search) {
            filter.title = { $regex: req.query.search, $options: 'i' };
        }

        const books = await Book.find(filter).sort({ createdAt: -1 });
        res.json(books);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi lấy sách', err });
    }
};
exports.getBookById = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ msg: 'Không tìm thấy sách' });
        res.json(book);
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

exports.getTopSellingBooks = async (req, res) => {
    try {
        const result = await Order.aggregate([
            {
                $match: {
                    status: "delivered"
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.book",
                    totalSold: { $sum: "$items.quantity" }
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
                    price: "$book.price",
                    genre: "$book.genre",
                    image: "$book.image",
                    stock: "$book.stock",
                    description: "$book.description",
                    totalSold: 1
                }
            }
        ]);

        res.json(result);
    } catch (err) {
        console.error(err);
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

// ✅ API CHÍNH: LẤY SÁCH ĐỀ XUẤT (CÓ PHÂN TRANG NHƯ SHOPEE)
exports.getRecommendations = async (req, res) => {
    try {
        // 1. Lấy thông số phân trang từ Frontend (Mặc định: Trang 1, mỗi lần 5 cuốn)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;

        const currentBook = await Book.findById(req.params.id).select('+embedding');

        if (!currentBook || !currentBook.embedding || currentBook.embedding.length === 0) {
            return res.json({ books: [], hasMore: false });
        }

        const allBooks = await Book.find({ _id: { $ne: currentBook._id } }).select('+embedding');

        const scoredBooks = allBooks.map(book => {
            if (!book.embedding || book.embedding.length === 0) return { book, score: 0 };
            const score = cosineSimilarity(currentBook.embedding, book.embedding);
            return { book, score };
        });

        // 2. Chỉ lấy sách > 40% độ giống nhau và xếp từ cao xuống thấp
        const relevantBooks = scoredBooks
            .filter(item => item.score > 0.4)
            .sort((a, b) => b.score - a.score);

        // 3. THUẬT TOÁN CẮT LÁT (Shopee Style)
        const startIndex = (page - 1) * limit; // Vd: page 1 -> index 0, page 2 -> index 5
        const endIndex = page * limit;         // Vd: page 1 -> index 5, page 2 -> index 10

        const paginatedBooks = relevantBooks.slice(startIndex, endIndex).map(item => {
            const bookObj = item.book.toObject();
            delete bookObj.embedding;
            return bookObj;
        });

        // Kiểm tra xem còn sách để load tiếp cho lần sau không?
        const hasMore = endIndex < relevantBooks.length;

        // Trả về cả mảng sách VÀ trạng thái hasMore
        res.json({
            books: paginatedBooks,
            hasMore: hasMore
        });

    } catch (err) {
        console.error("❌ Lỗi getRecommendations:", err);
        res.status(500).json({ error: 'Lỗi server khi tìm sách đề xuất' });
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