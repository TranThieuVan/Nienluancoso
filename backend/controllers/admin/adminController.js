const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Đăng nhập admin
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.role !== 'admin') {
            return res.status(401).json({ message: 'Tài khoản không hợp lệ hoặc không phải admin' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Sai mật khẩu' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secretkey', {
            expiresIn: '7d'
        });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Lỗi đăng nhập admin:', err);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng nhập' });
    }
};

// Check quyền admin (tuỳ chọn)
exports.checkAdmin = (req, res) => {
    res.json({ isAdmin: true, message: 'Xác thực quyền admin thành công' });
};

// Dashboard tổng quát (tuỳ chọn thêm)
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        // Có thể thêm: tổng đơn hàng, tổng sách, doanh thu...
        res.json({ totalUsers });
    } catch (err) {
        console.error('Lỗi dashboard:', err);
        res.status(500).json({ message: 'Không thể lấy dữ liệu tổng quan' });
    }
};
