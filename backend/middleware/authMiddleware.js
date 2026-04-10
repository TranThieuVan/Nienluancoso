const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: 'Không có token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (err) {
        return res.status(403).json({ msg: 'Token không hợp lệ' });
    }
};

// 🔒 CHỈ DÀNH CHO ADMIN TỐI CAO (Doanh thu, Nhân sự, Phân quyền)
exports.verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Chỉ Quản trị viên (Admin) mới được phép thực hiện hành động này.' });
    }
    next();
};

// 👨‍💻 DÀNH CHO NHÂN VIÊN VÀ ADMIN (Đơn hàng, Sách, CSKH)
exports.verifyStaff = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'employee') {
        return res.status(403).json({ msg: 'Quyền truy cập bị từ chối. Chỉ dành cho nhân sự nội bộ.' });
    }
    next();
};