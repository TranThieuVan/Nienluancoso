const User = require('../../models/User');

// Thay thế hàm getAllUsers hiện tại bằng hàm này:
exports.getAllUsers = async (req, res) => {
    try {
        // --- BẮT ĐẦU TỐI ƯU PHÂN TRANG ---
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Admin thường load 10-20 dòng 1 trang
        const skip = (page - 1) * limit;

        const query = { role: 'user' };

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(query)
            .select('-password')
            .skip(skip)
            .limit(limit);

        res.json({
            users,
            currentPage: page,
            totalPages,
            totalUsers
        });
        // --- KẾT THÚC TỐI ƯU ---
    } catch (err) {
        console.error('Lỗi lấy danh sách user:', err);
        res.status(500).json({ message: 'Không thể lấy danh sách người dùng' });
    }
};
// VỪA SỬA: Khoá / mở khoá user có thêm thời hạn
exports.toggleUserLock = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role === 'admin') {
            return res.status(404).json({ message: 'Người dùng không tồn tại hoặc không hợp lệ' });
        }

        const { action, duration } = req.body;

        if (action === 'unlock') {
            user.isLocked = false;
            user.lockedUntil = null; // Xóa hạn khóa nếu mở
        } else if (action === 'lock') {
            user.isLocked = true;

            // Tính toán thời gian khóa
            if (duration === 'permanent') {
                user.lockedUntil = null; // null ở đây có nghĩa là vĩnh viễn (hoặc bạn có thể set 1 date rất xa)
            } else {
                const days = parseInt(duration, 10);
                if (!isNaN(days)) {
                    const unlockDate = new Date();
                    unlockDate.setDate(unlockDate.getDate() + days);
                    user.lockedUntil = unlockDate;
                }
            }
        } else {
            // Fallback (dự phòng) nếu không truyền action
            user.isLocked = !user.isLocked;
            if (!user.isLocked) user.lockedUntil = null;
        }

        await user.save();

        res.json({ message: `Đã ${user.isLocked ? 'khóa' : 'mở khóa'} người dùng thành công`, isLocked: user.isLocked });
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