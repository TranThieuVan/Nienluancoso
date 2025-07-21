const User = require('../../models/User');

// Lấy danh sách user thường
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password');
        res.json(users);
    } catch (err) {
        console.error('Lỗi lấy danh sách user:', err);
        res.status(500).json({ message: 'Không thể lấy danh sách người dùng' });
    }
};

// Khoá / mở khoá user
exports.toggleUserLock = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role === 'admin') {
            return res.status(404).json({ message: 'Người dùng không tồn tại hoặc không hợp lệ' });
        }

        user.isLocked = !user.isLocked;
        await user.save();

        res.json({ message: `Đã ${user.isLocked ? 'khóa' : 'mở khóa'} người dùng thành công` });
    } catch (err) {
        console.error('Lỗi khóa/mở user:', err);
        res.status(500).json({ message: 'Không thể thay đổi trạng thái người dùng' });
    }
};

// Nâng / hạ vai trò
exports.updateRole = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        user.role = role;
        await user.save();

        res.json({ message: 'Cập nhật vai trò thành công', role: user.role });
    } catch (err) {
        console.error('Lỗi cập nhật role:', err);
        res.status(500).json({ message: 'Không thể cập nhật vai trò người dùng' });
    }
};
