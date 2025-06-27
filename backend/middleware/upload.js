const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads')); // dùng path join cho chắc chắn
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận ảnh jpg/png/jpeg'), false);
    }
};

const upload = multer({
    storage,
    fileFilter, // bật lại lọc ảnh
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB (bạn ghi nhầm là 20MB trước)
});

module.exports = upload;
