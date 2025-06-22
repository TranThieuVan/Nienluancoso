const Book = require('../models/Book');

exports.createBook = async (req, res) => {
    try {
        // Làm sạch req.body: loại bỏ khoảng trắng, tab...
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
            const cleanValue = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
            cleanBody[cleanKey] = cleanValue;
        }

        if (req.file) {
            cleanBody.image = `/uploads/${req.file.filename}`;
        }

        const updated = await Book.findByIdAndUpdate(req.params.id, cleanBody, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi cập nhật sách', err });
    }
};

exports.deleteBook = async (req, res) => {
    try {
        await Book.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Đã xóa sách' });
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi xóa sách', err });
    }
};
