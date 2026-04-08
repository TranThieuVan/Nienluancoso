const Order = require('../../models/Order');
const User = require('../../models/User');
const Book = require('../../models/Book');
const Promotion = require('../../models/Promotion');
const Voucher = require('../../models/Voucher');

// ─── HÀM HỖ TRỢ LỌC THỜI GIAN ───
const getDateFilter = (period) => {
    if (period === 'all') return {};
    const now = new Date();
    const from = new Date();
    if (period === 'week') { from.setDate(now.getDate() - 7); }
    if (period === 'month') { from.setMonth(now.getMonth(), 1); from.setHours(0, 0, 0, 0); }
    if (period === 'year') { from.setMonth(0, 1); from.setHours(0, 0, 0, 0); }
    return { createdAt: { $gte: from } };
};

// ─── API 1: LẤY DỮ LIỆU TỔNG QUAN (OVERVIEW) ───
exports.getDashboardOverview = async (req, res) => {
    try {
        const year = new Date().getFullYear();

        const [
            totalUsers, lockedUsers, totalBooks, outOfStockBooks,
            allOrders, monthlyRevenueData,
            recentOrders, lowStock, rankStats, // ✅ Đã xóa topBooks khỏi đây
            promotions, vouchers
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isLocked: true }),
            Book.countDocuments(),
            Book.countDocuments({ stock: 0 }),
            Order.find().select('status paymentStatus createdAt'),
            Order.aggregate([
                { $match: { status: 'delivered', createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31T23:59:59.999Z`) } } },
                { $group: { _id: { $month: "$createdAt" }, revenue: { $sum: "$totalPrice" } } }
            ]),
            // ✅ Đã xóa Book.find().sort({ sold: -1 })...
            Order.find().sort({ createdAt: -1 }).limit(6).populate('user', 'name').select('totalPrice paymentStatus status createdAt shippingAddress'),
            Book.find({ stock: { $lte: 5 } }).sort({ stock: 1 }).limit(6).select('title author stock image'),
            User.aggregate([{ $group: { _id: "$rank", count: { $sum: 1 } } }]),
            Promotion.find({ isActive: true }),
            Voucher.find({ isActive: true })
        ]);

        // Đếm Order
        const orderCounts = { pending: 0, shipping: 0, delivered: 0, cancelled: 0, needRefund: 0, total: allOrders.length };
        allOrders.forEach(o => {
            if (orderCounts[o.status] !== undefined) orderCounts[o.status]++;
            if (o.status === 'cancelled' && o.paymentStatus === 'Hoàn tiền') orderCounts.needRefund++;
        });

        // Doanh thu tháng
        const monthlyRevenue = Array(12).fill(0);
        monthlyRevenueData.forEach(m => { monthlyRevenue[m._id - 1] = m.revenue; });

        // Rank Dist
        const rankDist = { 'Khách hàng': 0, 'Bạc': 0, 'Vàng': 0, 'Bạch kim': 0, 'Kim cương': 0 };
        rankStats.forEach(r => { if (rankDist[r._id || 'Khách hàng'] !== undefined) rankDist[r._id || 'Khách hàng'] = r.count; });

        res.json({
            kpi: {
                totalUsers, lockedUsers, totalBooks, outOfStockBooks,
                orderCounts, monthlyRevenue, rankDist
            },
            recentOrders, lowStock, promotions, vouchers // ✅ Cập nhật object trả về
        });

    } catch (err) {
        console.error("Lỗi Overview:", err);
        res.status(500).json({ message: "Lỗi Server Overview" });
    }
};

// ─── API 2: LẤY DỮ LIỆU PHÂN TÍCH CHUYÊN SÂU (ANALYTICS) ───
exports.getDashboardAnalytics = async (req, res) => {
    try {
        const { tab, period } = req.query;
        const dateMatch = getDateFilter(period);
        const validOrderMatch = { status: { $in: ['pending', 'shipping', 'delivered'] }, ...dateMatch };

        let result = {};

        if (tab === 'author' || tab === 'genre') {
            const groupBy = tab === 'author' ? "$bookData.author" : "$bookData.genre";
            const rawData = await Order.aggregate([
                { $match: validOrderMatch },
                { $unwind: "$items" },
                { $lookup: { from: 'books', localField: 'items.book', foreignField: '_id', as: 'bookData' } },
                { $unwind: "$bookData" },
                {
                    $group: {
                        _id: groupBy,
                        units: { $sum: "$items.quantity" },
                        revenue: { $sum: { $multiply: ["$bookData.price", "$items.quantity"] } }
                    }
                },
                { $sort: { units: -1 } },
                { $limit: 8 }
            ]);
            result = rawData.map(d => ({ name: d._id || 'Không rõ', units: d.units, revenue: d.revenue }));
        }
        else if (tab === 'retention') {
            const userOrders = await Order.aggregate([
                { $match: dateMatch },
                { $group: { _id: "$user", count: { $sum: 1 } } }
            ]);
            const total = userOrders.length;
            let oneTime = 0, repeat = 0, loyal = 0, totalOrders = 0;
            userOrders.forEach(u => {
                totalOrders += u.count;
                if (u.count === 1) oneTime++;
                if (u.count >= 2) repeat++;
                if (u.count >= 4) loyal++;
            });
            result = {
                total, oneTime, repeat, loyal,
                avgOrders: total > 0 ? (totalOrders / total).toFixed(1) : 0,
                dist: [oneTime, Math.max(0, repeat - loyal), loyal]
            };
        }
        else if (tab === 'behavior') {
            const orders = await Order.find(dateMatch).select('createdAt paymentMethod totalPrice status user').populate('user', 'rank');
            const dowStats = Array(7).fill(0);
            const pMap = { cod: 0, vnpay: 0, transfer: 0 };
            const rMap = {};

            orders.forEach(o => {
                if (o.status !== 'cancelled') {
                    dowStats[new Date(o.createdAt).getDay()]++;
                    if (pMap[o.paymentMethod] !== undefined) pMap[o.paymentMethod]++;

                    const rank = o.user?.rank || 'Khách hàng';
                    if (!rMap[rank]) rMap[rank] = { total: 0, count: 0 };
                    rMap[rank].total += o.totalPrice || 0;
                    rMap[rank].count++;
                }
            });

            const rankAvgOrder = Object.entries(rMap)
                .map(([rank, d]) => ({ rank, avg: Math.round(d.total / d.count), count: d.count }))
                .sort((a, b) => b.avg - a.avg);

            result = {
                dowStats,
                paymentStats: [
                    { name: 'Tiền mặt (COD)', value: pMap.cod, color: '#10b981' },
                    { name: 'VNPAY', value: pMap.vnpay, color: '#4f46e5' },
                    { name: 'Chuyển khoản', value: pMap.transfer, color: '#f59e0b' }
                ],
                rankAvgOrder
            };
        }
        else if (tab === 'trend') {
            result = { labels: ['Kỳ này'], current: [0], previous: [0] };
        }
        else if (tab === 'voucher') {
            const v = await Voucher.find({ isActive: true });
            result = v.filter(x => x.usageLimit > 0).map(x => ({
                code: x.code, used: x.usedCount || 0, limit: x.usageLimit,
                pct: Math.round(((x.usedCount || 0) / x.usageLimit) * 100)
            })).sort((a, b) => b.pct - a.pct).slice(0, 6);
        }

        res.json(result);

    } catch (err) {
        console.error("Lỗi Analytics:", err);
        res.status(500).json({ message: "Lỗi Server Analytics" });
    }
};