const Order = require('../../models/Order');

exports.getMonthlyRevenue = async (req, res) => {
    try {
        const year = parseInt(req.query.year);
        if (!year) return res.status(400).json({ message: 'Thiếu năm' });

        const orders = await Order.find({
            status: 'delivered',
            deliveredAt: {
                $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                $lte: new Date(`${year}-12-31T23:59:59.999Z`)
            }
        });

        const monthlyRevenue = Array(12).fill(0);
        let totalRevenue = 0;
        let totalOrders = 0;

        orders.forEach(order => {
            if (order.deliveredAt) {
                const month = new Date(order.deliveredAt).getMonth(); // 0-11
                monthlyRevenue[month] += order.totalPrice;
                totalRevenue += order.totalPrice;
                totalOrders += 1;
            }
        });

        // Tìm tháng có doanh thu cao nhất
        const max = Math.max(...monthlyRevenue);
        const topMonth = max > 0 ? monthlyRevenue.findIndex(val => val === max) + 1 : null;

        res.json({
            monthlyRevenue,
            totalRevenue,
            totalOrders,
            topMonth
        });
    } catch (err) {
        console.error('❌ Lỗi doanh thu:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy doanh thu' });
    }
};

exports.getWeeklyRevenue = async (req, res) => {
    try {
        const month = parseInt(req.query.month); // 1 - 12
        const year = parseInt(req.query.year);   // 4 chữ số

        if (!month || !year) {
            return res.status(400).json({ message: 'Thiếu tháng hoặc năm' });
        }

        // Tính ngày đầu và cuối tháng
        const startDate = new Date(year, month - 1, 1); // JS: tháng bắt đầu từ 0
        const endDate = new Date(year, month, 0, 23, 59, 59, 999); // cuối tháng

        // Lọc đơn đã giao trong tháng
        const orders = await Order.find({
            status: 'delivered',
            deliveredAt: { $gte: startDate, $lte: endDate }
        });

        const weeklyRevenue = [0, 0, 0, 0, 0]; // Tuần 1–5

        orders.forEach(order => {
            if (order.deliveredAt) {
                const day = new Date(order.deliveredAt).getDate();

                let weekIndex;
                if (day <= 7) weekIndex = 0;
                else if (day <= 14) weekIndex = 1;
                else if (day <= 21) weekIndex = 2;
                else if (day <= 28) weekIndex = 3;
                else weekIndex = 4;

                weeklyRevenue[weekIndex] += order.totalPrice;
            }
        });

        res.json({ weeklyRevenue });
    } catch (err) {
        console.error('❌ Lỗi doanh thu theo tuần:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy doanh thu theo tuần' });
    }
};