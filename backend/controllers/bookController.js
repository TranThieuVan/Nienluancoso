const Book = require('../models/Book');

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

        const newBook = await Book.create(bookData);
        res.status(201).json(newBook);
    } catch (err) {
        console.error('❌ Error creating book:', err);
        res.status(500).json({ msg: 'Lỗi tạo sách', err });
    }
};

exports.getAllBooks = async (req, res) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 });
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

        console.log('🛠 Clean Body for Update:', cleanBody);
        console.log('📷 Uploaded File:', req.file);

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

