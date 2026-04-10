const Order = require('../../models/Order')
const User = require('../../models/User')
const Book = require('../../models/Book')
const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');

/* ─── Helper: build date range từ preset hoặc from/to ─── */
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
        case 'last3': {
            const start = new Date(now); start.setDate(start.getDate() - 2); start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        case 'last7': {
            const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        case 'last30': {
            const start = new Date(now); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        case 'last365': {
            const start = new Date(now); start.setDate(start.getDate() - 364); start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        default:
            return null; // Toàn thời gian (all time)
    }
};

/* ─── Helper: build status query ─── */
const buildStatusQuery = (statusFilter) => {
    if (!statusFilter || statusFilter === 'all') return {};
    if (statusFilter === 'pending_refund') return { status: 'cancelled', paymentStatus: 'Hoàn tiền' };
    if (statusFilter === 'done_refund') return { status: 'cancelled', paymentStatus: 'Đã hoàn tiền' };
    if (statusFilter === 'cod_cancelled') return { status: 'cancelled', paymentStatus: { $nin: ['Hoàn tiền', 'Đã hoàn tiền'] } };
    return { status: statusFilter };
};

exports.getOrderStats = async (req, res) => {
    try {
        const { preset, from, to } = req.query;
        const dateRange = buildDateRange(preset, from, to);
        const dateQuery = dateRange ? { createdAt: dateRange } : {};

        // 1. LẤY THÔNG KÊ TỔNG QUAN & LOGISTICS (Áp dụng dateQuery)
        const [generalStats] = await Order.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    delivering: { $sum: { $cond: [{ $eq: ['$status', 'delivering'] }, 1, 0] } },
                    delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    failed_delivery: { $sum: { $cond: [{ $eq: ['$status', 'failed_delivery'] }, 1, 0] } },
                    returned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
                    pendingRefund: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Hoàn tiền'] }, 1, 0] } },
                    doneRefund: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Đã hoàn tiền'] }, 1, 0] } },
                    totalDeliveryTime: {
                        $sum: {
                            $cond: [
                                { $and: [{ $in: ['$status', ['delivered', 'completed']] }, { $ne: ['$deliveredAt', null] }] },
                                { $subtract: ['$deliveredAt', '$createdAt'] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const cur = generalStats || {
            total: 0, revenue: 0, pending: 0, delivering: 0, delivered: 0, completed: 0,
            cancelled: 0, failed_delivery: 0, returned: 0, pendingRefund: 0, doneRefund: 0, totalDeliveryTime: 0
        };

        const aov = cur.completed > 0 ? Math.round(cur.revenue / cur.completed) : 0;
        const cancelRate = cur.total > 0 ? ((cur.cancelled / cur.total) * 100).toFixed(1) : 0;
        const deliverySuccessRate = (cur.delivered + cur.completed + cur.failed_delivery + cur.returned) > 0
            ? (((cur.delivered + cur.completed) / (cur.delivered + cur.completed + cur.failed_delivery + cur.returned)) * 100).toFixed(1)
            : 0;
        const refundRate = cur.total > 0 ? (((cur.pendingRefund + cur.doneRefund) / cur.total) * 100).toFixed(1) : 0;
        const avgDeliveryDays = (cur.delivered + cur.completed) > 0
            ? (cur.totalDeliveryTime / (cur.delivered + cur.completed) / (1000 * 60 * 60 * 24)).toFixed(1)
            : 0;

        // 3. TÌM TREND CHART (Áp dụng dateQuery để biểu đồ tự co giãn theo thời gian)
        const dailyTrends = await Order.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: { $add: ["$createdAt", 7 * 60 * 60 * 1000] } } },
                    orders: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$totalPrice', 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. TÌM CUSTOMER INSIGHTS
        const customerStats = await Order.aggregate([
            { $match: { ...dateQuery, user: { $ne: null } } },
            { $group: { _id: "$user", orderCount: { $sum: 1 } } },
            {
                $group: {
                    _id: null,
                    totalUniqueCustomers: { $sum: 1 },
                    repeatCustomers: { $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] } }
                }
            }
        ]);
        const cust = customerStats[0] || { totalUniqueCustomers: 0, repeatCustomers: 0 };
        const repeatRate = cust.totalUniqueCustomers > 0 ? ((cust.repeatCustomers / cust.totalUniqueCustomers) * 100).toFixed(1) : 0;

        res.json({
            summary: { total: cur.total, revenue: cur.revenue, aov },
            rates: { cancelRate: Number(cancelRate), deliverySuccessRate: Number(deliverySuccessRate), refundRate: Number(refundRate), repeatRate: Number(repeatRate) },
            logistics: { avgDeliveryDays: Number(avgDeliveryDays) },
            byStatus: {
                pending: cur.pending, delivering: cur.delivering, delivered: cur.delivered,
                completed: cur.completed, cancelled: cur.cancelled, failed_delivery: cur.failed_delivery,
                returned: cur.returned, pendingRefund: cur.pendingRefund
            },
            chartData: dailyTrends.map(d => ({ date: d._id, orders: d.orders, revenue: d.revenue }))
        });

    } catch (err) {
        console.error('Lỗi getOrderStats:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy thống kê đơn hàng' });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { status: statusFilter = 'all', preset, from, to } = req.query;

        const statusQuery = buildStatusQuery(statusFilter);
        const dateRange = buildDateRange(preset, from, to);
        const query = { ...statusQuery, ...(dateRange ? { createdAt: dateRange } : {}) };

        const [totalOrders, orders] = await Promise.all([
            Order.countDocuments(query),
            Order.find(query)
                .populate('user', 'name email')
                .populate('items.book', 'title price image')
                .sort({ createdAt: -1 }).skip(skip).limit(limit),
        ]);

        res.json({ orders, currentPage: page, totalPages: Math.ceil(totalOrders / limit), totalOrders });
    } catch (err) { res.status(500).json({ message: 'Không thể lấy danh sách đơn hàng' }); }
}

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email').populate('items.book', 'title image price');
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        res.json(order);
    } catch (err) { res.status(500).json({ message: 'Lỗi server' }); }
}

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, reason, shippingProvider, trackingLink, adminNote, callAttempts, paymentStatus } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });

        const oldStatus = order.status;

        if (adminNote !== undefined) order.adminNote = adminNote;
        if (callAttempts !== undefined) order.callAttempts = callAttempts;
        if (paymentStatus && order.paymentMethod === 'transfer') order.paymentStatus = paymentStatus;

        if (oldStatus !== status) {
            const isNeedToReturnStock = (status === 'cancelled') || (status === 'failed_delivery') || (status === 'returned');
            if (isNeedToReturnStock) {
                for (const item of order.items) { await Book.findByIdAndUpdate(item.book, { $inc: { stock: item.quantity } }); }
            }

            if (status === 'completed') {
                for (const item of order.items) { await Book.findByIdAndUpdate(item.book, { $inc: { sold: item.quantity } }); }
            }

            if (status === 'failed_delivery') {
                const userObj = await User.findById(order.user);
                if (userObj) {
                    userObj.failedDeliveryCount += 1;
                    if (userObj.failedDeliveryCount >= 3) userObj.isLocked = true;
                    await userObj.save();
                }
            }

            const isRejectingReturn = (oldStatus === 'return_requested' || oldStatus === 'returning') && (status === 'completed');
            if (isRejectingReturn) {
                order.adminNote = adminNote || "Admin đã từ chối khiếu nại / hoàn trả của khách hàng";
                if (order.paymentStatus === 'Hoàn tiền') order.paymentStatus = 'Đã thanh toán';
            }

            if (shippingProvider) order.shippingProvider = shippingProvider;
            if (trackingLink) order.trackingLink = trackingLink;
            if (reason) order.cancelReason = reason;

            if (status === 'cancelled') order.cancelledAt = new Date();
            if (status === 'delivered') order.deliveredAt = new Date();
            if (status === 'returned') order.returnedAt = new Date();

            order.status = status;
            order.statusHistory.push({ status, date: new Date() });
            await order.save();
        } else {
            await order.save();
        }

        res.json({ msg: 'Cập nhật thành công', order });
    } catch (err) { res.status(500).json({ msg: 'Lỗi server' }); }
};

exports.deleteOrder = async (req, res) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)
        if (!deletedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng để xóa' })
        res.json({ message: 'Xóa đơn hàng thành công' })
    } catch (err) { res.status(500).json({ message: 'Không thể xóa đơn hàng' }) }
}

exports.deleteAllOrders = async (req, res) => {
    try {
        await Order.deleteMany({});
        res.json({ msg: 'Đã dọn dẹp toàn bộ đơn hàng thành công!' });
    } catch (err) { res.status(500).json({ msg: 'Không thể xóa tất cả đơn hàng' }); }
};

exports.confirmRefund = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        if (order.paymentStatus !== 'Hoàn tiền') return res.status(400).json({ message: 'Đơn hàng chưa yêu cầu hoàn tiền' });

        const { forceManual } = req.body;

        if (order.paymentMethod === 'vnpay' && !forceManual) {
            if (!order.vnpayTransactionNo || !order.vnpayPayDate) {
                return res.status(400).json({ message: 'Thiếu dữ liệu giao dịch gốc của VNPAY để hoàn tiền' });
            }

            process.env.TZ = 'Asia/Ho_Chi_Minh';
            const date = new Date();

            const vnp_TmnCode = process.env.VNP_TMNCODE;
            const secretKey = process.env.VNP_HASHSECRET;
            const vnp_Api = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

            const vnp_RequestId = moment(date).format('HHmmss');
            const vnp_Version = '2.1.0';
            const vnp_Command = 'refund';
            const vnp_TransactionType = '02';
            const vnp_TxnRef = order._id.toString();
            const vnp_Amount = order.totalPrice * 100;
            const vnp_TransactionNo = order.vnpayTransactionNo;
            const vnp_TransactionDate = order.vnpayPayDate;

            const vnp_CreateBy = 'vanlaolele@gmail.com';
            const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
            const vnp_IpAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            const vnp_OrderInfo = 'Hoan tien don hang ' + vnp_TxnRef;

            const dataString = vnp_RequestId + "|" + vnp_Version + "|" + vnp_Command + "|" + vnp_TmnCode + "|" + vnp_TransactionType + "|" + vnp_TxnRef + "|" + vnp_Amount + "|" + vnp_TransactionNo + "|" + vnp_TransactionDate + "|" + vnp_CreateBy + "|" + vnp_CreateDate + "|" + vnp_IpAddr + "|" + vnp_OrderInfo;
            const hmac = crypto.createHmac("sha512", secretKey);
            const vnp_SecureHash = hmac.update(new Buffer.from(dataString, 'utf-8')).digest("hex");

            const dataObj = {
                vnp_RequestId, vnp_Version, vnp_Command, vnp_TmnCode,
                vnp_TransactionType, vnp_TxnRef, vnp_Amount, vnp_TransactionNo,
                vnp_TransactionDate, vnp_CreateBy, vnp_CreateDate, vnp_IpAddr,
                vnp_OrderInfo, vnp_SecureHash
            };

            const response = await axios.post(vnp_Api, dataObj);

            if (response.data.vnp_ResponseCode !== '00') {
                return res.status(400).json({ message: 'VNPAY từ chối hoàn tiền. ' + response.data.vnp_Message });
            }
        }

        order.paymentStatus = 'Đã hoàn tiền';
        await order.save();
        res.json({ message: 'Hoàn tiền thành công!', order });

    } catch (err) {
        res.status(500).json({ message: 'Lỗi server khi kết nối ngân hàng' });
    }
};