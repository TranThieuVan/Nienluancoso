const cron = require('node-cron');
const Order = require('../models/Order');
const Book = require('../models/Book');

cron.schedule('0 * * * *', async () => {
    try {
        const now = new Date();

        // 1. TỰ ĐỘNG HỦY ĐƠN CHỜ XÁC NHẬN (PENDING) QUÁ 24H & HOÀN KHO
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const expiredOrders = await Order.find({
            status: 'pending',
            createdAt: { $lt: oneDayAgo }
        });

        for (const order of expiredOrders) {
            for (const item of order.items) {
                await Book.findByIdAndUpdate(item.book, { $inc: { stock: item.quantity } });
            }
            order.status = 'cancelled';
            order.cancelReason = 'Hệ thống tự động hủy do không thể liên lạc khách hàng (Quá 24h)';
            order.cancelledAt = new Date();
            order.statusHistory.push({ status: 'cancelled', date: new Date() });
            await order.save();
        }

        // 2. TỰ ĐỘNG KHÓA SỔ ĐƠN GIAO THÀNH CÔNG (DELIVERED) SAU 3 NGÀY
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const ordersToComplete = await Order.find({
            status: 'delivered',
            deliveredAt: { $lt: threeDaysAgo }
        });

        for (const order of ordersToComplete) {
            order.status = 'completed';
            order.statusHistory.push({ status: 'completed', date: new Date() });
            for (const item of order.items) {
                await Book.findByIdAndUpdate(item.book, { $inc: { sold: item.quantity } });
            }
            await order.save();
        }

        // ✅ 3. TỰ ĐỘNG ĐÓNG YÊU CẦU TRẢ HÀNG QUÁ 7 NGÀY (Khách không chịu gửi hàng)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const approvedOrders = await Order.find({ status: 'return_approved' });
        let closedReturnCount = 0;

        for (const order of approvedOrders) {
            // Tìm ngày duyệt trả hàng trong lịch sử
            const approvedHistory = order.statusHistory.find(h => h.status === 'return_approved');

            // Nếu ngày duyệt cách đây hơn 7 ngày
            if (approvedHistory && new Date(approvedHistory.date) < sevenDaysAgo) {
                order.status = 'completed'; // Chốt đơn thành công
                order.adminNote = 'Hệ thống tự động đóng khiếu nại do khách quá 7 ngày không tạo đơn gửi trả hàng.';
                order.statusHistory.push({ status: 'completed', date: new Date() });

                // Vì chốt thành công nên phải cộng lượt bán
                for (const item of order.items) {
                    await Book.findByIdAndUpdate(item.book, { $inc: { sold: item.quantity } });
                }
                await order.save();
                closedReturnCount++;
            }
        }

        if (expiredOrders.length > 0 || ordersToComplete.length > 0 || closedReturnCount > 0) {
            console.log(`[Cronjob] Hủy: ${expiredOrders.length} đơn, Hoàn tất: ${ordersToComplete.length} đơn, Đóng khiếu nại quá hạn: ${closedReturnCount} đơn.`);
        }
    } catch (error) {
        console.error('[Cronjob Error]', error);
    }
}); 