const Order = require('../../models/Order');

/* ─── Helper: lấy doanh thu & lợi nhuận trong khoảng thời gian ─── */
const getRevenueAndProfit = async (startDate, endDate) => {
    const rows = await Order.aggregate([
        {
            $match: {
                // ✅ ĐÃ SỬA: Lọc chuẩn bằng "completed" thay vì "delivered"
                status: 'completed',
                deliveredAt: { $gte: startDate, $lte: endDate }
            }
        },
        { $unwind: '$items' },
        {
            $lookup: {
                from: 'books',
                localField: 'items.book',
                foreignField: '_id',
                as: 'bookInfo'
            }
        },
        {
            $unwind: {
                path: '$bookInfo',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: '$_id',
                deliveredAt: { $first: '$deliveredAt' },
                totalPrice: { $first: '$totalPrice' },
                totalCost: {
                    $sum: {
                        $multiply: [
                            {
                                $ifNull: [
                                    '$bookInfo.importPrice',
                                    { $multiply: ['$bookInfo.price', 0.6] }
                                ]
                            },
                            '$items.quantity'
                        ]
                    }
                }
            }
        }
    ]);
    return rows;
};

/* ─── 1. Doanh thu theo tuần (có lợi nhuận) ─── */
exports.getWeeklyRevenue = async (req, res) => {
    try {
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);

        if (!month || !year) return res.status(400).json({ message: 'Thiếu tháng hoặc năm' });

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const rows = await getRevenueAndProfit(startDate, endDate);

        const weeklyRevenue = [0, 0, 0, 0, 0];
        const weeklyProfit = [0, 0, 0, 0, 0];

        rows.forEach(order => {
            if (!order.deliveredAt) return;
            const day = new Date(order.deliveredAt).getDate();
            let wi;
            if (day <= 7) wi = 0;
            else if (day <= 14) wi = 1;
            else if (day <= 21) wi = 2;
            else if (day <= 28) wi = 3;
            else wi = 4;
            weeklyRevenue[wi] += order.totalPrice || 0;
            weeklyProfit[wi] += Math.max(0, (order.totalPrice || 0) - (order.totalCost || 0));
        });

        res.json({ weeklyRevenue, weeklyProfit });
    } catch (err) { res.status(500).json({ message: 'Lỗi server' }); }
};

/* ─── 2. Doanh thu tháng (có lợi nhuận) ─── */
exports.getMonthlyRevenue = async (req, res) => {
    try {
        const year = parseInt(req.query.year);
        if (!year) return res.status(400).json({ message: 'Thiếu năm' });

        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

        const rows = await getRevenueAndProfit(startDate, endDate);

        const monthlyRevenue = Array(12).fill(0);
        const monthlyProfit = Array(12).fill(0);
        let totalRevenue = 0, totalOrders = 0;

        rows.forEach(order => {
            if (!order.deliveredAt) return;
            const m = new Date(order.deliveredAt).getMonth();
            monthlyRevenue[m] += order.totalPrice || 0;
            monthlyProfit[m] += Math.max(0, (order.totalPrice || 0) - (order.totalCost || 0));
            totalRevenue += order.totalPrice || 0;
            totalOrders += 1;
        });

        const max = Math.max(...monthlyRevenue);
        const topMonth = max > 0 ? monthlyRevenue.findIndex(v => v === max) + 1 : null;

        res.json({ monthlyRevenue, monthlyProfit, totalRevenue, totalOrders, topMonth });
    } catch (err) { res.status(500).json({ message: 'Lỗi server' }); }
};

/* ─── 3. So sánh % tháng trước & năm trước ─── */
exports.getRevenueComparison = async (req, res) => {
    try {
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);

        if (!month || !year) return res.status(400).json({ message: 'Thiếu tháng hoặc năm' });

        const curStart = new Date(year, month - 1, 1);
        const curEnd = new Date(year, month, 0, 23, 59, 59, 999);

        const prevMonth = month === 1 ? 12 : month - 1;
        const prevMonthYear = month === 1 ? year - 1 : year;
        const prevMStart = new Date(prevMonthYear, prevMonth - 1, 1);
        const prevMEnd = new Date(prevMonthYear, prevMonth, 0, 23, 59, 59, 999);

        const prevYStart = new Date(year - 1, month - 1, 1);
        const prevYEnd = new Date(year - 1, month, 0, 23, 59, 59, 999);

        const curYearStart = new Date(year, 0, 1);
        const curYearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
        const prevYearStart = new Date(year - 1, 0, 1);
        const prevYearEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);

        const [curRows, prevMRows, prevYRows, curYearRows, prevYearRows] = await Promise.all([
            getRevenueAndProfit(curStart, curEnd),
            getRevenueAndProfit(prevMStart, prevMEnd),
            getRevenueAndProfit(prevYStart, prevYEnd),
            getRevenueAndProfit(curYearStart, curYearEnd),
            getRevenueAndProfit(prevYearStart, prevYearEnd),
        ]);

        const sum = (rows) => rows.reduce(
            (acc, o) => ({
                revenue: acc.revenue + (o.totalPrice || 0),
                profit: acc.profit + Math.max(0, (o.totalPrice || 0) - (o.totalCost || 0))
            }),
            { revenue: 0, profit: 0 }
        );

        const pct = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

        const cur = sum(curRows);
        const prevM = sum(prevMRows);
        const prevY = sum(prevYRows);

        const buildMonthly = (rows) => {
            const arr = Array(12).fill(0);
            rows.forEach(o => {
                if (o.deliveredAt) arr[new Date(o.deliveredAt).getMonth()] += o.totalPrice || 0;
            });
            return arr;
        };

        res.json({
            current: cur,
            mom: { revenuePct: pct(cur.revenue, prevM.revenue), profitPct: pct(cur.profit, prevM.profit), prevRevenue: prevM.revenue, prevProfit: prevM.profit },
            yoy: { revenuePct: pct(cur.revenue, prevY.revenue), profitPct: pct(cur.profit, prevY.profit), prevRevenue: prevY.revenue, prevProfit: prevY.profit },
            trend: { curYear: buildMonthly(curYearRows), prevYear: buildMonthly(prevYearRows) }
        });
    } catch (err) { res.status(500).json({ message: 'Lỗi server' }); }
};