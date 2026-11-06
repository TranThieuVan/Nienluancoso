const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config(); // Đảm bảo đã load biến môi trường

// 1. Cấu hình kết nối với tài khoản Cloudinary của bạn
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Tạo storage liên kết giữa Multer và Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ecommerce_avatars_books', // Tên thư mục sẽ tạo trên Cloudinary
        format: async (req, file) => 'webp', // Ép đổi đuôi tất cả ảnh sang WebP siêu nhẹ
        // Cloudinary sẽ tự động tạo chuỗi random cho tên file để không bị trùng lặp
    },
});

// 3. Khởi tạo middleware upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // Vẫn giữ giới hạn 20MB của bạn
});

module.exports = upload;