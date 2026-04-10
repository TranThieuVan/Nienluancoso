const Order = require('../models/Order');
const Book = require('../models/Book');

exports.ghtkWebhook = async (req, res) => {
    try {
        // 1. Lấy dữ liệu GHTK bắn sang
        const { partner_id, label_id, status_id, reason, weight, fee } = req.body;

        // partner_id: Thường là Mã đơn hàng (Order ID) của bro truyền cho GHTK lúc lên đơn
        // status_id: Mã trạng thái của GHTK (5 = Đã giao, 9 = Không giao được, 21 = Đã hoàn trả)

        // 2. Tìm đơn hàng trong hệ thống BookNest
        // Tìm theo _id (nếu partner_id là _id) HOẶC tìm theo trackingLink chứa label_id
        const order = await Order.findOne({
            $or: [
                { _id: partner_id },
                { trackingLink: { $regex: label_id, $options: 'i' } }
            ]
        });

        if (!order) {
            console.log(`[Webhook] Không tìm thấy đơn hàng: ${label_id}`);
            return res.status(404).json({ success: false, msg: 'Order not found' });
        }

        // 3. Bỏ qua nếu đơn đã ở trạng thái cuối cùng (tránh GHTK bắn trùng)
        if (['completed', 'returned', 'cancelled'].includes(order.status)) {
            return res.status(200).json({ success: true, msg: 'Order already finalized' });
        }

        // 4. "Dịch" Trạng thái từ GHTK sang Hệ thống của Bro
        let newStatus = order.status;
        let isUpdated = false;

        switch (Number(status_id)) {
            case 5: // GHTK: Đã giao hàng thành công
                newStatus = 'delivered';
                order.deliveredAt = new Date();
                isUpdated = true;
                break;
            case 9: // GHTK: Giao hàng thất bại / Khách không nhận
                newStatus = 'failed_delivery';
                order.cancelReason = reason || 'Khách không nhận hàng';
                // Hoàn lại kho ngay lập tức
                for (const item of order.items) {
                    await Book.findByIdAndUpdate(item.book, { $inc: { stock: item.quantity } });
                }
                isUpdated = true;
                break;
            case 21: // GHTK: Đã hoàn trả về kho shop
                newStatus = 'returned';
                order.returnedAt = new Date();
                order.paymentStatus = 'Hoàn tiền'; // Note lại để Admin nhớ check trả tiền

                // ✅ CHỈ HOÀN KHO NẾU TRƯỚC ĐÓ CHƯA BỊ FAILED_DELIVERY 
                // (Tránh trường hợp GHTK bắn status 9 rồi vài ngày sau bắn tiếp 21 làm cộng kho 2 lần)
                if (order.status !== 'failed_delivery') {
                    for (const item of order.items) {
                        await Book.findByIdAndUpdate(item.book, { $inc: { stock: item.quantity } });
                    }
                }
                isUpdated = true;
                break;
            // Bro có thể thêm các case khác nếu muốn tracking chi tiết hơn (VD: 4 = Đang giao hàng)
            default:
                console.log(`[Webhook] Bỏ qua status_id: ${status_id}`);
        }

        // 5. Cập nhật Database
        if (isUpdated && order.status !== newStatus) {
            order.status = newStatus;
            order.statusHistory.push({ status: newStatus, date: new Date() });

            // Cập nhật phí ship thực tế GHTK báo về (nếu cần)
            if (fee) order.shippingFee = fee;

            await order.save();
            console.log(`[Webhook] Đã cập nhật đơn ${order._id} -> ${newStatus}`);
        }

        // 6. Phản hồi lại cho GHTK biết là mình đã nhận được tin, nếu không nó sẽ bắn đi bắn lại
        return res.status(200).json({ success: true, msg: 'Webhook received and processed' });

    } catch (error) {
        console.error('[Webhook Error]:', error);
        return res.status(500).json({ success: false, msg: 'Internal Server Error' });
    }
};