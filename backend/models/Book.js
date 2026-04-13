// models/Book.js
const mongoose = require('mongoose');

// Danh sách thể loại gán cứng để đảm bảo tính nhất quán dữ liệu
const validGenres = [
    'Comics', 'Kinh tế', 'Chính trị', 'Tình cảm/Lãng mạn',
    'Viễn tưởng', 'Kinh dị', 'Self-help', 'Kinh doanh/Tài chính', 'Bí ẩn/Trinh thám'
];

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        maxlength: 2000 // Giới hạn để tối ưu bộ nhớ và API Embedding
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    importPrice: {
        type: Number,
        default: function () {
            // Tự động tính giá nhập bằng 60% giá bán nếu không nhập
            return this.price ? Math.round(this.price * 0.6) : 0;
        }
    },
    image: String,
    genre: {
        type: String,
        required: true,
        enum: validGenres // Chỉ cho phép các thể loại trong danh sách
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    sold: {
        type: Number,
        default: 0,
        min: 0
    },
    // Trường dành cho AI Recommendation
    embedding: {
        type: [Number],
        default: [],
        select: false // Không lấy field này trong các query thông thường để tăng tốc độ
    },
    embeddingUpdatedAt: Date,
    embeddingVersion: {
        type: Number,
        default: 1
    }
}, { timestamps: true });

// ==========================================
// 🔥 INDEX (TỐI ƯU HÓA TRUY VẤN)
// ==========================================
// Tăng tốc độ lọc theo thể loại, giá, tồn kho và thời gian tạo
bookSchema.index({ genre: 1 });
bookSchema.index({ createdAt: -1 });
bookSchema.index({ price: 1 });
bookSchema.index({ stock: 1 });

// Hỗ trợ tìm kiếm văn bản (Full-text search) cho tiêu đề và tác giả
bookSchema.index({ title: 'text', author: 'text' });

// ==========================================
// 🔥 MIDDLEWARE: CHUẨN HÓA DỮ LIỆU
// ==========================================
bookSchema.pre('save', function (next) {
    if (this.title) this.title = this.title.trim();
    if (this.author) this.author = this.author.trim();
    next();
});

// ==========================================
// 🔥 HELPER: KIỂM TRA THAY ĐỔI NỘI DUNG
// ==========================================
// Hàm này tự động kiểm tra xem các trường ảnh hưởng đến Vector AI có bị sửa không
bookSchema.methods.shouldUpdateEmbedding = function () {
    return (
        this.isModified('title') ||
        this.isModified('author') ||
        this.isModified('genre') ||
        this.isModified('description')
    );
};

module.exports = mongoose.model('Book', bookSchema);