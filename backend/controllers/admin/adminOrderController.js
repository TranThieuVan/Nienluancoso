const Order = require('../../models/Order')
const User = require('../../models/User')

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
        case 'week': {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
            start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        case 'last7': {
            const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { $gte: start, $lte: now };
        }
        case 'last30': {
            const start = new Date(now); start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0);
            return { $gte: start, $lte: now };
        }
        case 'year': {
            const start = new Date(now.getFullYear(), 0, 1);
            return { $gte: start, $lte: now };
        }
        default:
            return null; // all time
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

        // 1. LẤY THÔNG KÊ TỔNG QUAN & LOGISTICS (Sử dụng Aggregation)
        const [generalStats] = await Order.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$totalPrice', 0] } },

                    // Counts theo status (Bổ sung failed_delivery, returned)
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    shipping: { $sum: { $cond: [{ $eq: ['$status', 'shipping'] }, 1, 0] } },
                    delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    failed_delivery: { $sum: { $cond: [{ $eq: ['$status', 'failed_delivery'] }, 1, 0] } },
                    returned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },

                    // Logic Refund tách bạch
                    pendingRefund: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Hoàn tiền'] }, 1, 0] } },
                    doneRefund: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Đã hoàn tiền'] }, 1, 0] } },

                    // Logistics: Tính tổng thời gian giao hàng (deliveredAt - createdAt)
                    totalDeliveryTime: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$status', 'delivered'] }, { $ne: ['$deliveredAt', null] }] },
                                { $subtract: ['$deliveredAt', '$createdAt'] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const cur = generalStats || {
            total: 0, revenue: 0, pending: 0, shipping: 0, delivered: 0,
            cancelled: 0, failed_delivery: 0, returned: 0, pendingRefund: 0, doneRefund: 0, totalDeliveryTime: 0
        };

        // 2. TÍNH TOÁN CÁC "RATE METRICS" (Tỷ lệ)
        const aov = cur.delivered > 0 ? Math.round(cur.revenue / cur.delivered) : 0;
        const cancelRate = cur.total > 0 ? ((cur.cancelled / cur.total) * 100).toFixed(1) : 0;
        const deliverySuccessRate = (cur.delivered + cur.failed_delivery + cur.returned) > 0
            ? ((cur.delivered / (cur.delivered + cur.failed_delivery + cur.returned)) * 100).toFixed(1)
            : 0;
        const refundRate = cur.total > 0 ? (((cur.pendingRefund + cur.doneRefund) / cur.total) * 100).toFixed(1) : 0;

        // Logistics: Avg Delivery Time (Đổi từ milliseconds sang Ngày)
        const avgDeliveryDays = cur.delivered > 0
            ? (cur.totalDeliveryTime / cur.delivered / (1000 * 60 * 60 * 24)).toFixed(1)
            : 0;

        // 3. TÌM TREND CHART (Dữ liệu vẽ biểu đồ theo ngày)
        const dailyTrends = await Order.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: { $add: ["$createdAt", 7 * 60 * 60 * 1000] } } }, // UTC+7
                    orders: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$totalPrice', 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. TÌM CUSTOMER INSIGHTS (Khách mới vs Khách quay lại)
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
        const repeatRate = cust.totalUniqueCustomers > 0
            ? ((cust.repeatCustomers / cust.totalUniqueCustomers) * 100).toFixed(1)
            : 0;

        // Trả về JSON xịn sò
        res.json({
            summary: {
                total: cur.total,
                revenue: cur.revenue,
                aov,
            },
            rates: {
                cancelRate: Number(cancelRate),
                deliverySuccessRate: Number(deliverySuccessRate),
                refundRate: Number(refundRate),
                repeatRate: Number(repeatRate)
            },
            logistics: {
                avgDeliveryDays: Number(avgDeliveryDays)
            },
            byStatus: {
                pending: cur.pending,
                shipping: cur.shipping,
                delivered: cur.delivered,
                cancelled: cur.cancelled,
                failed_delivery: cur.failed_delivery,
                returned: cur.returned,
                pendingRefund: cur.pendingRefund
            },
            chartData: dailyTrends.map(d => ({ date: d._id, orders: d.orders, revenue: d.revenue }))
        });

    } catch (err) {
        console.error('Lỗi getOrderStats:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy thống kê đơn hàng' });
    }
};
// Lấy tất cả đơn hàng (admin) - ĐÃ TỐI ƯU PHÂN TRANG & FILTER
exports.getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { status: statusFilter = 'all', preset, from, to } = req.query;

        // Build query
        const statusQuery = buildStatusQuery(statusFilter);
        const dateRange = buildDateRange(preset, from, to);
        const query = {
            ...statusQuery,
            ...(dateRange ? { createdAt: dateRange } : {}),
        };

        const [totalOrders, orders] = await Promise.all([
            Order.countDocuments(query),
            Order.find(query)
                .populate('user', 'name email')
                .populate('items.book', 'title price image')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
        ]);

        res.json({
            orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders,
        });
    } catch (err) {
        console.error('Lỗi lấy đơn hàng:', err);
        res.status(500).json({ message: 'Không thể lấy danh sách đơn hàng' });
    }
}

// Lấy chi tiết đơn hàng theo ID (cho admin)
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.book', 'title image price')
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' })

        res.json(order)
    } catch (err) {
        console.error('Lỗi khi lấy chi tiết đơn hàng:', err)
        res.status(500).json({ message: 'Lỗi server' })
    }
}

const Book = require('../../models/Book'); // Thêm nếu chưa có

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, reason } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });

        // Nếu đơn đã vào các trạng thái đóng (Terminal states), không cho đổi nữa (trừ trường hợp từ delivered sang returned)
        if (['cancelled', 'failed_delivery', 'returned'].includes(order.status) && status !== 'returned') {
            return res.status(400).json({ msg: `Đơn hàng đang ở trạng thái ${order.status}, không thể cập nhật thêm.` });
        }

        const oldStatus = order.status;

        if (oldStatus !== status) {
            // Logic trừ kho khi giao thành công
            const isNewlyDelivered = oldStatus !== 'delivered' && status === 'delivered';

            // Logic cộng lại kho khi: Hủy đơn đã giao HOẶC Khách trả hàng
            const isRefundStock = oldStatus === 'delivered' && ['cancelled', 'returned'].includes(status);

            order.status = status;
            order.statusHistory.push({ status, date: new Date() });

            // Ghi nhận Timestamps & Lý do để làm Data Analytics
            if (status === 'cancelled') {
                order.cancelReason = reason || 'Quản trị viên hủy đơn';
                order.cancelledAt = new Date();
            }
            if (status === 'delivered') order.deliveredAt = new Date();
            if (status === 'returned') order.returnedAt = new Date();

            // Trừ kho & Tăng lượt bán
            if (isNewlyDelivered) {
                for (const item of order.items) {
                    const book = await Book.findById(item.book);
                    if (book) {
                        book.stock = Math.max(0, book.stock - item.quantity);
                        book.sold += item.quantity;
                        await book.save();
                    }
                }
            }

            // Hoàn lại kho & Giảm lượt bán
            if (isRefundStock) {
                for (const item of order.items) {
                    const book = await Book.findById(item.book);
                    if (book) {
                        book.stock += item.quantity;
                        book.sold = Math.max(0, book.sold - item.quantity);
                        await book.save();
                    }
                }
            }

            await order.save();
        }

        res.json({ msg: 'Cập nhật trạng thái thành công', order });
    } catch (err) {
        console.error('Lỗi cập nhật trạng thái:', err);
        res.status(500).json({ msg: 'Lỗi server khi cập nhật trạng thái đơn hàng' });
    }
};

// Xóa đơn hàng (admin)
exports.deleteOrder = async (req, res) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)
        if (!deletedOrder) return res.status(404).json({ message: 'Không tìm thấy đơn hàng để xóa' })

        res.json({ message: 'Xóa đơn hàng thành công' })
    } catch (err) {
        console.error('Lỗi xóa đơn hàng:', err)
        res.status(500).json({ message: 'Không thể xóa đơn hàng' })
    }
}

// ✅ Xóa TẤT CẢ đơn hàng (Dành cho Admin test hệ thống)
exports.deleteAllOrders = async (req, res) => {
    try {
        // Lệnh deleteMany({}) sẽ xóa toàn bộ document trong collection Order
        await Order.deleteMany({});

        res.json({ msg: 'Đã dọn dẹp toàn bộ đơn hàng thành công!' });
    } catch (err) {
        console.error('Lỗi xóa tất cả đơn hàng:', err);
        res.status(500).json({ msg: 'Không thể xóa tất cả đơn hàng' });
    }
};

// ✅ API: Admin duyệt và gửi lệnh Hoàn tiền (Tự động VNPAY hoặc Thủ công)
exports.confirmRefund = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

        if (order.paymentStatus !== 'Hoàn tiền') {
            return res.status(400).json({ message: 'Đơn hàng chưa yêu cầu hoàn tiền' });
        }

        // ✅ 1. THÊM DÒNG NÀY: Hứng "tín hiệu" ép buộc làm tay từ Frontend
        const { forceManual } = req.body;

        // ✅ 2. SỬA DÒNG NÀY: Chỉ gọi API VNPAY nếu KHÔNG có lệnh ép buộc thủ công (!forceManual)
        if (order.paymentMethod === 'vnpay' && !forceManual) {

            // Kiểm tra xem đã lưu 2 thông số mã giao dịch lúc thanh toán chưa
            if (!order.vnpayTransactionNo || !order.vnpayPayDate) {
                return res.status(400).json({ message: 'Thiếu dữ liệu giao dịch gốc của VNPAY để hoàn tiền' });
            }

            process.env.TZ = 'Asia/Ho_Chi_Minh';
            const date = new Date();

            const vnp_TmnCode = process.env.VNP_TMNCODE;
            const secretKey = process.env.VNP_HASHSECRET;
            const vnp_Api = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

            // Cấu trúc dữ liệu theo chuẩn API Refund của VNPAY
            const vnp_RequestId = moment(date).format('HHmmss'); // Mã yêu cầu hoàn ngẫu nhiên
            const vnp_Version = '2.1.0';
            const vnp_Command = 'refund';
            const vnp_TransactionType = '02'; // '02' là hoàn tiền TOÀN PHẦN
            const vnp_TxnRef = order._id.toString(); // Mã đơn hàng của bạn
            const vnp_Amount = order.totalPrice * 100; // Nhân 100 theo chuẩn VNPAY
            const vnp_TransactionNo = order.vnpayTransactionNo; // Lấy mã giao dịch gốc từ DB
            const vnp_TransactionDate = order.vnpayPayDate; // Lấy ngày giao dịch gốc từ DB

            // ✅ 3. SỬA THÀNH EMAIL CỦA BẠN: (Để tránh lỗi MAM system)
            const vnp_CreateBy = 'vanlaolele@gmail.com';

            const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
            const vnp_IpAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            const vnp_OrderInfo = 'Hoan tien don hang ' + vnp_TxnRef;

            // Nối chuỗi để tạo mã băm (Chữ ký điện tử)
            const dataString = vnp_RequestId + "|" + vnp_Version + "|" + vnp_Command + "|" + vnp_TmnCode + "|" + vnp_TransactionType + "|" + vnp_TxnRef + "|" + vnp_Amount + "|" + vnp_TransactionNo + "|" + vnp_TransactionDate + "|" + vnp_CreateBy + "|" + vnp_CreateDate + "|" + vnp_IpAddr + "|" + vnp_OrderInfo;

            // Mã hóa bảo mật SHA512
            const hmac = crypto.createHmac("sha512", secretKey);
            const vnp_SecureHash = hmac.update(new Buffer.from(dataString, 'utf-8')).digest("hex");

            // Đóng gói data gửi đi
            const dataObj = {
                vnp_RequestId, vnp_Version, vnp_Command, vnp_TmnCode,
                vnp_TransactionType, vnp_TxnRef, vnp_Amount, vnp_TransactionNo,
                vnp_TransactionDate, vnp_CreateBy, vnp_CreateDate, vnp_IpAddr,
                vnp_OrderInfo, vnp_SecureHash
            };

            // "Đấm" lệnh sang VNPAY
            const response = await axios.post(vnp_Api, dataObj);

            // Kiểm tra kết quả VNPAY trả về
            if (response.data.vnp_ResponseCode !== '00') {
                console.log("VNPAY Từ chối hoàn tiền:", response.data);
                return res.status(400).json({ message: 'VNPAY từ chối hoàn tiền. ' + response.data.vnp_Message });
            }
        }

        // ✅ KẾT THÚC: Cập nhật Database thành "Đã hoàn tiền"
        // (Khối này sẽ chạy mượt mà ngay khi bạn bấm nút ép buộc trên giao diện)
        order.paymentStatus = 'Đã hoàn tiền';
        await order.save();

        res.json({ message: 'Hoàn tiền thành công!', order });

    } catch (err) {
        console.error('Lỗi API Hoàn tiền:', err);
        res.status(500).json({ message: 'Lỗi server khi kết nối ngân hàng' });
    }
};