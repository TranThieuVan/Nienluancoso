const Order = require('../../models/Order');

// Helper: Lấy khoảng thời gian hiển thị (Dùng cho Chart Xu hướng & Summary)
const buildDateRange = (preset, from, to) => {
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);

    if (preset === 'custom' && from && to) {
        return {
            startDate: new Date(`${from}T00:00:00.000+07:00`),
            endDate: new Date(`${to}T23:59:59.999+07:00`)
        };
    }

    startDate.setUTCHours(-7, 0, 0, 0);
    endDate.setUTCHours(16, 59, 59, 999);

    switch (preset) {
        case 'today': break;
        case 'yesterday':
            startDate.setDate(startDate.getDate() - 1);
            endDate.setDate(endDate.getDate() - 1);
            break;
        case 'last7': startDate.setDate(startDate.getDate() - 6); break;
        case 'last30': startDate.setDate(startDate.getDate() - 29); break;
        case 'thisMonth': startDate.setDate(1); break;
        default: startDate.setDate(startDate.getDate() - 29);
    }
    return { startDate, endDate };
};

// Helper: Tính ngày "Kỳ này" vs "Kỳ trước" cho Khối So Sánh
const getComparisonRanges = (compareBy) => {
    const now = new Date();
    const currentStart = new Date(now);
    const currentEnd = new Date(now);
    const previousStart = new Date(now);
    const previousEnd = new Date(now);

    currentStart.setUTCHours(-7, 0, 0, 0);
    currentEnd.setUTCHours(16, 59, 59, 999);
    previousStart.setUTCHours(-7, 0, 0, 0);
    previousEnd.setUTCHours(16, 59, 59, 999);

    if (compareBy === 'week') {
        currentStart.setDate(currentStart.getDate() - 6); // Tuần này (7 ngày qua)
        previousEnd.setDate(currentStart.getDate() - 1);  // Ngày kết thúc tuần trước
        previousStart.setDate(previousEnd.getDate() - 6); // Ngày bắt đầu tuần trước
    } else if (compareBy === 'month') {
        currentStart.setDate(1); // Tháng này
        previousStart.setMonth(previousStart.getMonth() - 1); // Tháng trước
        previousStart.setDate(1);
        previousEnd.setDate(0); // Ngày cuối cùng của tháng trước
    } else if (compareBy === 'year') {
        currentStart.setMonth(0, 1); // Năm nay
        previousStart.setFullYear(previousStart.getFullYear() - 1, 0, 1); // Năm trước
        previousEnd.setFullYear(previousEnd.getFullYear() - 1, 11, 31);
    }
    return { currentStart, currentEnd, previousStart, previousEnd };
};

exports.getRevenueDashboard = async (req, res) => {
    try {
        const { preset = 'last30', from, to, compareBy = 'week' } = req.query;

        // 1. DATA CHÍNH (Summary, Trend, Payment Breakdown)
        const { startDate, endDate } = buildDateRange(preset, from, to);
        const baseMatch = { createdAt: { $gte: startDate, $lte: endDate }, status: 'completed' };

        const mainAgg = await Order.aggregate([
            { $match: baseMatch },
            { $unwind: "$items" },
            {
                $lookup: { from: "books", localField: "items.book", foreignField: "_id", as: "book" }
            },
            { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$_id",
                    createdAt: { $first: "$createdAt" },
                    paymentMethod: { $first: "$paymentMethod" },
                    revenue: { $first: "$totalPrice" },
                    cost: {
                        $sum: {
                            $multiply: [
                                "$items.quantity",
                                { $ifNull: ["$book.importPrice", { $multiply: ["$items.price", 0.6] }] }
                            ]
                        }
                    }
                }
            },
            { $addFields: { profit: { $subtract: ["$revenue", "$cost"] } } },
            {
                $facet: {
                    summary: [
                        { $group: { _id: null, totalCompleted: { $sum: 1 }, revenue: { $sum: "$revenue" }, profit: { $sum: "$profit" } } }
                    ],
                    trend: [
                        {
                            $group: {
                                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+07:00" } },
                                revenue: { $sum: "$revenue" },
                                profit: { $sum: "$profit" }
                            }
                        },
                        { $sort: { _id: 1 } },
                        { $project: { _id: 0, date: "$_id", revenue: 1, profit: 1 } }
                    ],
                    paymentBreakdown: [
                        { $group: { _id: "$paymentMethod", count: { $sum: 1 }, revenue: { $sum: "$revenue" } } }
                    ]
                }
            }
        ]);

        // 2. DATA SO SÁNH TĂNG TRƯỞNG
        const { currentStart, currentEnd, previousStart, previousEnd } = getComparisonRanges(compareBy);

        const compareAgg = await Order.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: previousStart, $lte: currentEnd }
                }
            },
            { $unwind: "$items" },
            { $lookup: { from: "books", localField: "items.book", foreignField: "_id", as: "book" } },
            { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$_id",
                    createdAt: { $first: "$createdAt" },
                    revenue: { $first: "$totalPrice" },
                    cost: {
                        $sum: {
                            $multiply: ["$items.quantity", { $ifNull: ["$book.importPrice", { $multiply: ["$items.price", 0.6] }] }]
                        }
                    }
                }
            },
            { $addFields: { profit: { $subtract: ["$revenue", "$cost"] } } },
            {
                $facet: {
                    current: [
                        { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
                        { $group: { _id: null, revenue: { $sum: "$revenue" }, profit: { $sum: "$profit" } } }
                    ],
                    previous: [
                        { $match: { createdAt: { $gte: previousStart, $lte: previousEnd } } },
                        { $group: { _id: null, revenue: { $sum: "$revenue" }, profit: { $sum: "$profit" } } }
                    ]
                }
            }
        ]);

        /* ─── XỬ LÝ KẾT QUẢ ĐẦU RA ─── */
        const mainResult = mainAgg[0];
        const sumData = mainResult.summary[0] || { totalCompleted: 0, revenue: 0, profit: 0 };

        const summary = {
            revenue: sumData.revenue,
            profit: sumData.profit,
            profitMargin: sumData.revenue > 0 ? (sumData.profit / sumData.revenue) * 100 : 0,
            totalCompleted: sumData.totalCompleted,
            aov: sumData.totalCompleted > 0 ? sumData.revenue / sumData.totalCompleted : 0
        };

        const paymentMap = { cod: 'Tiền mặt (COD)', vnpay: 'Chuyển khoản VNPay', transfer: 'Chuyển khoản thủ công' };
        const paymentBreakdown = mainResult.paymentBreakdown.map(p => ({
            name: paymentMap[p._id] || p._id,
            count: p.count,
            revenue: p.revenue
        }));

        const compResult = compareAgg[0];
        const currentData = compResult.current[0] || { revenue: 0, profit: 0 };
        const previousData = compResult.previous[0] || { revenue: 0, profit: 0 };

        const calcPercentChange = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

        const comparison = {
            revenue: {
                current: currentData.revenue,
                previous: previousData.revenue,
                percentChange: calcPercentChange(currentData.revenue, previousData.revenue)
            },
            profit: {
                current: currentData.profit,
                previous: previousData.profit,
                percentChange: calcPercentChange(currentData.profit, previousData.profit)
            }
        };

        res.json({
            summary,
            trend: mainResult.trend,
            paymentBreakdown,
            comparison
        });

    } catch (error) {
        console.error('Revenue Dashboard Error:', error);
        res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu doanh thu' });
    }
};