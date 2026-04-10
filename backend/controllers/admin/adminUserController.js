const User = require('../../models/User');
const Order = require('../../models/Order');

/* ─── Helper: build date range ─── */
const buildDateRange = (preset, from, to) => {
    const now = new Date();
    if (from && to) {
        return {
            $gte: new Date(from + 'T00:00:00.000'),
            $lte: new Date(to + 'T23:59:59.999'),
        };
    }
    switch (preset) {
        case 'today': {
            const start = new Date(now); start.setHours(0, 0, 0, 0);
            const end = new Date(now); end.setHours(23, 59, 59, 999);
            return { $gte: start, $lte: end };
        }
        case 'yesterday': {
            const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
            const end = new Date(now); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
            return { $gte: start, $lte: end };
        }
        case 'week': {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
            start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        case 'last7': {
            const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { $gte: start, $lte: now };
        }
        case 'last30': {
            const start = new Date(now); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        case 'year': {
            const start = new Date(now.getFullYear(), 0, 1);
            return { $gte: start, $lte: now };
        }
        default:
            return null;
    }
};

/* ─── GET /admin/users ─── */
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { rank, preset, from, to } = req.query;

        // Base query: chỉ lấy users (không lấy admin)
        const query = { role: 'user' };

        // Lọc theo rank
        if (rank && rank !== 'all') {
            query.rank = rank;
        }

        // Lọc theo ngày đăng ký (createdAt)
        const dateRange = buildDateRange(preset, from, to);
        if (dateRange) {
            query.createdAt = dateRange;
        }

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            users,
            currentPage: page,
            totalPages,
            totalUsers,
        });
    } catch (err) {
        console.error('Lỗi lấy danh sách user:', err);
        res.status(500).json({ message: 'Không thể lấy danh sách người dùng' });
    }
};

/* ─── GET /admin/users/:id/detail ─── */
// Trả về thông tin chi tiết user + thống kê đơn hàng
exports.getUserDetail = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user || user.role === 'admin') {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        // Thống kê đơn hàng của user này
        const [orderStats] = await Order.aggregate([
            { $match: { user: user._id } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    failed_delivery: { $sum: { $cond: [{ $eq: ['$status', 'failed_delivery'] }, 1, 0] } },
                    returned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    delivering: { $sum: { $cond: [{ $eq: ['$status', 'delivering'] }, 1, 0] } },
                    totalSpent: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0] }
                    },
                }
            }
        ]);

        const stats = orderStats || {
            totalOrders: 0, completed: 0, delivered: 0, cancelled: 0,
            failed_delivery: 0, returned: 0, pending: 0, delivering: 0, totalSpent: 0
        };

        // Tỉ lệ giao hàng thành công
        // Mẫu số: tất cả đơn đã có kết quả cuối (trừ pending/delivering đang xử lý)
        const resolvedOrders = stats.completed + stats.delivered + stats.cancelled + stats.failed_delivery + stats.returned;
        const successOrders = stats.completed + stats.delivered;
        const deliverySuccessRate = resolvedOrders > 0
            ? parseFloat(((successOrders / resolvedOrders) * 100).toFixed(1))
            : 0;

        // 5 đơn hàng gần nhất
        const recentOrders = await Order.find({ user: user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('status totalPrice createdAt paymentMethod paymentStatus');

        res.json({
            user,
            orderStats: {
                ...stats,
                deliverySuccessRate,
            },
            recentOrders,
        });
    } catch (err) {
        console.error('Lỗi getUserDetail:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy chi tiết người dùng' });
    }
};

/* ─── PUT /admin/users/:id/toggle-lock ─── */
exports.toggleUserLock = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role === 'admin') {
            return res.status(404).json({ message: 'Người dùng không tồn tại hoặc không hợp lệ' });
        }
        const { action, duration } = req.body;
        if (action === 'unlock') {
            user.isLocked = false;
            user.lockedUntil = null;
        } else if (action === 'lock') {
            user.isLocked = true;
            if (duration === 'permanent') {
                user.lockedUntil = null;
            } else {
                const days = parseInt(duration, 10);
                if (!isNaN(days)) {
                    const unlockDate = new Date();
                    unlockDate.setDate(unlockDate.getDate() + days);
                    user.lockedUntil = unlockDate;
                }
            }
        } else {
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

/* ─── PUT /admin/users/:id/role ─── */
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
