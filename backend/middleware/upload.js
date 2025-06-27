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


const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 2MB (bạn ghi nhầm là 20MB trước)
});

module.exports = upload;
