const Order = require('../../models/Order');

/* ─── Helper: build date range (Hỗ trợ Quick Filters) ─── */
const buildDateRange = (preset, from, to) => {
    const now = new Date();
    if (from && to) return { start: new Date(from + 'T00:00:00.000'), end: new Date(to + 'T23:59:59.999') };
    if (preset === 'today') {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    if (preset === 'yesterday') {
        const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    if (preset === 'last7') {
        const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
        return { start, end: now };
    }
    if (preset === 'thisMonth') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: now };
    }
    if (preset === 'last365' || preset === 'year') {
        const start = new Date(now); start.setDate(start.getDate() - 364); start.setHours(0, 0, 0, 0);
        return { start, end: now };
    }
    // Default: last30
    const start = new Date(now); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
    return { start, end: now };
};

const getRevenueAndProfit = async (startDate, endDate) => {
    return await Order.aggregate([
        { $match: { status: 'completed', deliveredAt: { $gte: startDate, $lte: endDate } } },
        { $unwind: '$items' },
        { $lookup: { from: 'books', localField: 'items.book', foreignField: '_id', as: 'bookInfo' } },
        { $unwind: { path: '$bookInfo', preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: '$_id',
                deliveredAt: { $first: '$deliveredAt' },
                totalPrice: { $first: '$totalPrice' },
                items: {
                    $push: {
                        bookId: '$bookInfo._id',
                        title: '$bookInfo.title',
                        quantity: '$items.quantity',
                        price: '$bookInfo.price',
                        importPrice: '$bookInfo.importPrice'
                    }
                }
            }
        }
    ]);
};

/* ─── 1. API MASTER CHÍNH: Cung cấp toàn bộ Data cho Dashboard ─── */
exports.getWeeklyRevenue = async (req, res) => {
    try {
        const { preset, from, to } = req.query;
        const { start, end } = buildDateRange(preset, from, to);

        const rows = await getRevenueAndProfit(start, end);

        let totalRevenue = 0, totalProfit = 0, totalOrders = rows.length;
        const dailyMap = {};
        const segmentMap = [0, 0, 0, 0, 0];
        const segmentProfit = [0, 0, 0, 0, 0];
        const bookMap = {};

        rows.forEach(order => {
            const orderRev = order.totalPrice || 0;
            let orderCost = 0;

            order.items.forEach(item => {
                const qty = item.quantity;
                const cost = item.importPrice || (item.price * 0.6);
                orderCost += (cost * qty);

                // Gom nhóm Top Sản phẩm (Breakdown)
                if (!bookMap[item.bookId]) bookMap[item.bookId] = { title: item.title, units: 0, revenue: 0 };
                bookMap[item.bookId].units += qty;
                bookMap[item.bookId].revenue += (item.price * qty); // Ước tính đóng góp
            });

            const orderProfit = Math.max(0, orderRev - orderCost);
            totalRevenue += orderRev;
            totalProfit += orderProfit;

            if (order.deliveredAt) {
                const d = new Date(order.deliveredAt);
                // Daily Logic (YYYY-MM-DD)
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                if (!dailyMap[dateStr]) dailyMap[dateStr] = { date: dateStr, revenue: 0, profit: 0, orders: 0 };
                dailyMap[dateStr].revenue += orderRev;
                dailyMap[dateStr].profit += orderProfit;
                dailyMap[dateStr].orders += 1;

                // Giai đoạn 1-5 Logic (Thay cho fake Weekly)
                const day = d.getDate();
                let seg = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : day <= 28 ? 3 : 4;
                segmentMap[seg] += orderRev;
                segmentProfit[seg] += orderProfit;
            }
        });

        const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
        const topBooks = Object.values(bookMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        res.json({
            summary: { totalRevenue, totalProfit, totalOrders, aov },
            dailyData,
            segments: { revenue: segmentMap, profit: segmentProfit },
            topBooks
        });
    } catch (err) { res.status(500).json({ message: 'Lỗi server' }); }
};

/* ─── 2. API COMPARISON: So sánh tự động (MoM / YoY) ─── */
exports.getRevenueComparison = async (req, res) => {
    try {
        const { preset, from, to } = req.query;
        const { start: curStart, end: curEnd } = buildDateRange(preset, from, to);

        // Tính kỳ trước tương đương (VD: 7 ngày trước)
        const duration = curEnd.getTime() - curStart.getTime();
        const prevStart = new Date(curStart.getTime() - duration - 1);
        const prevEnd = new Date(curStart.getTime() - 1);

        // Tính cùng kỳ năm ngoái
        const prevYStart = new Date(curStart); prevYStart.setFullYear(prevYStart.getFullYear() - 1);
        const prevYEnd = new Date(curEnd); prevYEnd.setFullYear(prevYEnd.getFullYear() - 1);

        const curYearStart = new Date(curStart.getFullYear(), 0, 1);
        const curYearEnd = new Date(curStart.getFullYear(), 11, 31, 23, 59, 59, 999);
        const prevYearStart = new Date(curStart.getFullYear() - 1, 0, 1);
        const prevYearEnd = new Date(curStart.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

        const [curRows, prevRows, prevYRows, curYearRows, prevYearRows] = await Promise.all([
            getRevenueAndProfit(curStart, curEnd),
            getRevenueAndProfit(prevStart, prevEnd),
            getRevenueAndProfit(prevYStart, prevYEnd),
            getRevenueAndProfit(curYearStart, curYearEnd),
            getRevenueAndProfit(prevYearStart, prevYearEnd),
        ]);

        const sum = (rows) => rows.reduce(
            (acc, o) => {
                const rev = o.totalPrice || 0;
                const cost = o.items.reduce((s, i) => s + ((i.importPrice || i.price * 0.6) * i.quantity), 0);
                return { revenue: acc.revenue + rev, profit: acc.profit + Math.max(0, rev - cost) };
            }, { revenue: 0, profit: 0 }
        );

        const pct = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
        const curData = sum(curRows), prevData = sum(prevRows), prevYData = sum(prevYRows);

        const buildMonthly = (rows) => {
            const arr = Array(12).fill(0);
            rows.forEach(o => { if (o.deliveredAt) arr[new Date(o.deliveredAt).getMonth()] += o.totalPrice || 0; });
            return arr;
        };

        res.json({
            current: curData,
            mom: { revenuePct: pct(curData.revenue, prevData.revenue), profitPct: pct(curData.profit, prevData.profit) },
            yoy: { revenuePct: pct(curData.revenue, prevYData.revenue), profitPct: pct(curData.profit, prevYData.profit) },
            trend: { curYear: buildMonthly(curYearRows), prevYear: buildMonthly(prevYearRows) }
        });
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

