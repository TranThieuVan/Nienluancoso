const Order = require('../../models/Order');

// Helper: Xử lý múi giờ VN (UTC+7)
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const getVnTimeBoundary = (daysOffset = 0, isStart = true, monthOffset = null) => {
    const now = new Date(Date.now() + VN_OFFSET_MS);
    if (monthOffset !== null) {
        now.setUTCDate(1);
        now.setUTCMonth(monthOffset);
        if (!isStart) { now.setUTCMonth(now.getUTCMonth() + 1); now.setUTCDate(0); }
    } else {
        now.setUTCDate(now.getUTCDate() + daysOffset);
    }
    if (isStart) now.setUTCHours(0, 0, 0, 0);
    else now.setUTCHours(23, 59, 59, 999);
    return new Date(now.getTime() - VN_OFFSET_MS);
};

const buildDateRange = (preset, from, to) => {
    if (preset === 'custom' && from && to) {
        return { start: new Date(`${from}T00:00:00.000+07:00`), end: new Date(`${to}T23:59:59.999+07:00`) };
    }
    switch (preset) {
        case 'today': return { start: getVnTimeBoundary(0, true), end: getVnTimeBoundary(0, false) };
        case 'yesterday': return { start: getVnTimeBoundary(-1, true), end: getVnTimeBoundary(-1, false) };
        case 'last7': return { start: getVnTimeBoundary(-6, true), end: getVnTimeBoundary(0, false) };
        case 'thisMonth': return { start: getVnTimeBoundary(0, true, new Date(Date.now() + VN_OFFSET_MS).getUTCMonth()), end: getVnTimeBoundary(0, false, new Date(Date.now() + VN_OFFSET_MS).getUTCMonth()) };
        case 'last30': default: return { start: getVnTimeBoundary(-29, true), end: getVnTimeBoundary(0, false) };
    }
};

// Khối tính toán dùng chung (Chỉ giữ Revenue và Profit)
const financialFields = {
    revenue: { $ifNull: ["$totalPrice", 0] },
    cost: {
        $reduce: {
            input: { $ifNull: ["$items", []] },
            initialValue: 0,
            in: { $add: ["$$value", { $multiply: [{ $ifNull: ["$$this.quantity", 0] }, { $multiply: [{ $ifNull: ["$$this.price", 0] }, 0.6] }] }] }
        }
    }
};

exports.getRevenueDashboard = async (req, res) => {
    try {
        const { preset = 'last30', from, to, groupBy = 'day_of_week', compareBy = 'week' } = req.query;
        const range = buildDateRange(preset, from, to);
        const nowVN = new Date(Date.now() + VN_OFFSET_MS);

        /* --- 1. CẤU HÌNH COMPARISON --- */
        let cCurStart, cCurEnd, cPrevStart, cPrevEnd, cGroupExpr, cMax, cLabels;
        const curY = nowVN.getUTCFullYear(); const curM = nowVN.getUTCMonth(); const curD = nowVN.getUTCDate();

        if (compareBy === 'week') {
            cCurStart = new Date(Date.UTC(curY, curM, curD - 6, 0, 0, 0) - VN_OFFSET_MS);
            cCurEnd = new Date(Date.UTC(curY, curM, curD, 23, 59, 59, 999) - VN_OFFSET_MS);
            cPrevStart = new Date(Date.UTC(curY, curM, curD - 13, 0, 0, 0) - VN_OFFSET_MS);
            cPrevEnd = new Date(Date.UTC(curY, curM, curD - 7, 23, 59, 59, 999) - VN_OFFSET_MS);
            cGroupExpr = { $isoDayOfWeek: { date: "$updatedAt", timezone: "+07:00" } };
            cMax = 7; cLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
        } else if (compareBy === 'month') {
            cCurStart = new Date(Date.UTC(curY, curM, 1, 0, 0, 0) - VN_OFFSET_MS);
            cCurEnd = new Date(Date.UTC(curY, curM + 1, 0, 23, 59, 59, 999) - VN_OFFSET_MS);
            cPrevStart = new Date(Date.UTC(curY, curM - 1, 1, 0, 0, 0) - VN_OFFSET_MS);
            cPrevEnd = new Date(Date.UTC(curY, curM, 0, 23, 59, 59, 999) - VN_OFFSET_MS);
            cGroupExpr = { $dayOfMonth: { date: "$updatedAt", timezone: "+07:00" } };
            cMax = 31; cLabels = Array.from({ length: 31 }, (_, i) => `Ngày ${i + 1}`);
        } else { // year
            cCurStart = new Date(Date.UTC(curY, 0, 1, 0, 0, 0) - VN_OFFSET_MS);
            cCurEnd = new Date(Date.UTC(curY, 11, 31, 23, 59, 59, 999) - VN_OFFSET_MS);
            cPrevStart = new Date(Date.UTC(curY - 1, 0, 1, 0, 0, 0) - VN_OFFSET_MS);
            cPrevEnd = new Date(Date.UTC(curY - 1, 11, 31, 23, 59, 59, 999) - VN_OFFSET_MS);
            cGroupExpr = { $month: { date: "$updatedAt", timezone: "+07:00" } };
            cMax = 12; cLabels = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
        }

        /* --- 2. CẤU HÌNH PERFORMANCE --- */
        const perfGroupExpr = groupBy === 'month_of_year'
            ? { $month: { date: "$updatedAt", timezone: "+07:00" } }
            : { $isoDayOfWeek: { date: "$updatedAt", timezone: "+07:00" } };

        /* --- 3. EXECUTE AGGREGATION --- */
        const [mainData, compData] = await Promise.all([
            Order.aggregate([
                { $match: { status: 'completed', updatedAt: { $gte: range.start, $lte: range.end } } },
                { $addFields: financialFields },
                { $addFields: { profit: { $subtract: ["$revenue", "$cost"] } } },
                {
                    $facet: {
                        summary: [{ $group: { _id: null, revenue: { $sum: "$revenue" }, profit: { $sum: "$profit" } } }],
                        trend: [
                            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt", timezone: "+07:00" } }, revenue: { $sum: "$revenue" }, profit: { $sum: "$profit" } } },
                            { $sort: { "_id": 1 } }
                        ],
                        performance: [{ $group: { _id: perfGroupExpr, revenue: { $sum: "$revenue" }, profit: { $sum: "$profit" } } }]
                    }
                }
            ]),
            Order.aggregate([
                {
                    $facet: {
                        current: [
                            { $match: { status: 'completed', updatedAt: { $gte: cCurStart, $lte: cCurEnd } } },
                            { $addFields: financialFields },
                            { $addFields: { profit: { $subtract: ["$revenue", "$cost"] } } },
                            { $group: { _id: cGroupExpr, profit: { $sum: "$profit" } } }
                        ],
                        previous: [
                            { $match: { status: 'completed', updatedAt: { $gte: cPrevStart, $lte: cPrevEnd } } },
                            { $addFields: financialFields },
                            { $addFields: { profit: { $subtract: ["$revenue", "$cost"] } } },
                            { $group: { _id: cGroupExpr, profit: { $sum: "$profit" } } }
                        ]
                    }
                }
            ])
        ]);

        const data = mainData[0];

        /* --- 4. FORMAT RESPONSE --- */
        // A. Summary
        const sum = data.summary[0] || { revenue: 0, profit: 0 };
        const summary = {
            revenue: sum.revenue,
            profit: sum.profit,
            profitMargin: sum.revenue > 0 ? Math.round((sum.profit / sum.revenue) * 100) : 0
        };

        // B. Trend (Fill mảng ngày trống)
        const trend = [];
        let currD = new Date(range.start.getTime() + VN_OFFSET_MS);
        const endD = new Date(range.end.getTime() + VN_OFFSET_MS);
        const trendMap = data.trend.reduce((acc, cur) => { acc[cur._id] = cur; return acc; }, {});

        while (currD <= endD) {
            const dateStr = currD.toISOString().split('T')[0];
            const d = trendMap[dateStr] || { revenue: 0, profit: 0 };
            trend.push({ date: dateStr, revenue: d.revenue, profit: d.profit });
            currD.setUTCDate(currD.getUTCDate() + 1);
        }

        // C. Performance
        const perfMap = data.performance.reduce((acc, cur) => { acc[cur._id] = cur; return acc; }, {});
        let performance = [];
        if (groupBy === 'month_of_year') {
            const mLabels = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
            performance = mLabels.map((lbl, i) => ({ label: lbl, revenue: perfMap[i + 1]?.revenue || 0, profit: perfMap[i + 1]?.profit || 0 }));
        } else {
            const dLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
            performance = dLabels.map((lbl, i) => ({ label: lbl, revenue: perfMap[i + 1]?.revenue || 0, profit: perfMap[i + 1]?.profit || 0 }));
        }

        // D. Comparison
        const curComp = Array(cMax).fill(0);
        const prevComp = Array(cMax).fill(0);
        compData[0].current.forEach(i => { if (i._id <= cMax) curComp[i._id - 1] = i.profit; });
        compData[0].previous.forEach(i => { if (i._id <= cMax) prevComp[i._id - 1] = i.profit; });

        res.json({
            summary,
            trend,
            performance,
            comparison: { labels: cLabels, current: curComp, previous: prevComp }
        });

    } catch (err) {
        console.error(err); res.status(500).json({ msg: 'Lỗi server' });
    }
};