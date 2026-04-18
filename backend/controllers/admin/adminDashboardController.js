const Order = require('../../models/Order');
const User = require('../../models/User');
const Book = require('../../models/Book');
const Promotion = require('../../models/Promotion');
const Voucher = require('../../models/Voucher');

const getDateFilter = (period, customStart, customEnd) => {
    if (period === 'all') return {};
    const now = new Date();
    const from = new Date();

    if (period === 'today') { from.setHours(0, 0, 0, 0); }
    if (period === '3days') { from.setDate(now.getDate() - 3); }
    if (period === '7days' || period === 'week') { from.setDate(now.getDate() - 7); }
    if (period === '30days' || period === 'month') { from.setDate(now.getDate() - 30); }
    if (period === 'year') { from.setMonth(0, 1); from.setHours(0, 0, 0, 0); }

    // Thêm khoảng thời gian tuỳ chỉnh
    if (period === 'custom' && customStart && customEnd) {
        return {
            createdAt: {
                $gte: new Date(customStart),
                $lte: new Date(new Date(customEnd).setHours(23, 59, 59, 999))
            }
        };
    }

    return { createdAt: { $gte: from } };
};

exports.getDashboardOverview = async (req, res) => {
    try {
        const year = new Date().getFullYear();

        const [
            totalUsers, lockedUsers, totalBooks, outOfStockBooks,
            allOrders, monthlyRevenueData,
            // Thêm truy vấn để tính tỷ lệ khách mua lại
            userOrderStats
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isLocked: true }),
            Book.countDocuments(),
            Book.countDocuments({ stock: 0 }),
            Order.find().select('status paymentStatus createdAt totalPrice'),
            Order.aggregate([
                { $match: { status: 'completed', createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31T23:59:59.999Z`) } } },
                { $group: { _id: { $month: "$createdAt" }, revenue: { $sum: "$totalPrice" } } }
            ]),
            // Logic lấy số đơn mỗi user để tính tỷ lệ mua lại
            Order.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: "$user", count: { $sum: 1 } } }
            ])
        ]);

        // Tính tỷ lệ mua lại (%)
        const totalCustomers = userOrderStats.length;
        const repeatCustomers = userOrderStats.filter(u => u.count >= 2).length;
        const returningRate = totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : 0;

        const orderCounts = { pending: 0, delivering: 0, delivered: 0, completed: 0, cancelled: 0, needRefund: 0, total: allOrders.length };
        allOrders.forEach(o => {
            if (orderCounts[o.status] !== undefined) orderCounts[o.status]++;
            if (o.status === 'cancelled' && o.paymentStatus === 'Hoàn tiền') orderCounts.needRefund++;
        });

        const monthlyRevenue = Array(12).fill(0);
        monthlyRevenueData.forEach(m => { monthlyRevenue[m._id - 1] = m.revenue; });

        res.json({
            kpi: { totalUsers, lockedUsers, totalBooks, outOfStockBooks, orderCounts, monthlyRevenue, returningRate },
            // ... (các dữ liệu khác)
        });

    } catch (err) { res.status(500).json({ message: "Lỗi Server Overview" }); }
};

exports.getTopData = async (req, res) => {
    try {
        const { period = 'all', limit = 10, startDate, endDate } = req.query;
        const lim = Math.min(Math.max(parseInt(limit) || 10, 1), 10);
        const dateMatch = getDateFilter(period, startDate, endDate);
        const baseMatch = { status: 'completed', ...dateMatch };

        const [topBooks, topUsersByOrders, topUsersBySpending, topVouchers] = await Promise.all([

            Order.aggregate([
                { $match: baseMatch },
                { $unwind: '$items' },
                { $group: { _id: '$items.book', totalQty: { $sum: '$items.quantity' } } },
                { $sort: { totalQty: -1 } },
                { $limit: lim },
                { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'info' } },
                { $unwind: '$info' },
                { $project: { totalQty: 1, 'info.title': 1, 'info.author': 1, 'info.image': 1, 'info.price': 1 } }
            ]),

            Order.aggregate([
                { $match: { status: { $nin: ['cancelled', 'failed_delivery', 'returned'] }, ...dateMatch } },
                { $group: { _id: '$user', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: lim },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
                { $unwind: '$u' },
                { $project: { count: 1, 'u.name': 1, 'u.email': 1, 'u.avatar': 1 } }
            ]),

            Order.aggregate([
                { $match: baseMatch },
                { $group: { _id: '$user', spent: { $sum: '$totalPrice' } } },
                { $sort: { spent: -1 } },
                { $limit: lim },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
                { $unwind: '$u' },
                { $project: { spent: 1, 'u.name': 1, 'u.email': 1, 'u.avatar': 1 } }
            ]),

            Order.aggregate([
                {
                    $match: {
                        ...baseMatch,
                        // Fix voucher: Lọc bỏ null và chuỗi rỗng
                        voucherCode: { $nin: [null, ""] }
                    }
                },
                { $group: { _id: '$voucherCode', useCount: { $sum: 1 }, rev: { $sum: '$totalPrice' } } },
                { $sort: { useCount: -1 } },
                { $limit: lim },
                { $lookup: { from: 'vouchers', localField: '_id', foreignField: 'code', as: 'v' } },
                { $unwind: { path: '$v', preserveNullAndEmptyArrays: true } },
                { $project: { useCount: 1, rev: 1, 'v.code': 1, 'v.discountType': 1, 'v.discountValue': 1 } }
            ])
        ]);

        res.json({ topBooks, topUsersByOrders, topUsersBySpending, topVouchers });

    } catch (err) {
        console.error('getTopData error:', err);
        res.status(500).json({ message: 'Lỗi Server Top Data' });
    }
};
exports.getDashboardAnalytics = async (req, res) => {
    try {
        const { tab, period } = req.query;
        const dateMatch = getDateFilter(period);

        let result = {};

        if (tab === 'author' || tab === 'genre') {
            const groupBy = tab === 'author' ? "$bookData.author" : "$bookData.genre";
            const rawData = await Order.aggregate([
                { $match: { status: 'completed', ...dateMatch } },
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
            const validOrderMatch = { status: { $nin: ['cancelled', 'failed_delivery', 'returned'] }, ...dateMatch };
            const userOrders = await Order.aggregate([
                { $match: validOrderMatch },
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

                    if (o.status === 'completed') {
                        rMap[rank].total += o.totalPrice || 0;
                    }
                    rMap[rank].count++;
                }
            });

            const rankAvgOrder = Object.entries(rMap)
                .map(([rank, d]) => ({ rank, avg: d.count > 0 ? Math.round(d.total / d.count) : 0, count: d.count }))
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

    } catch (err) { res.status(500).json({ message: "Lỗi Server Analytics" }); }
};