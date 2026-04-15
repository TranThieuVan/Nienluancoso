const Order = require('../../models/Order')
const User = require('../../models/User')
const Book = require('../../models/Book')
const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');
const PricingService = require('../../services/pricingService');
// ⚙️ LÕI XỬ LÝ MÚI GIỜ VIỆT NAM (UTC+7) - ĐÚNG TỚI TỪNG MILI-GIÂY
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

// ⚙️ BỘ LỌC THỜI GIAN
const buildDateRange = (preset, from, to) => {
    if (preset === 'custom' && from && to) {
        return {
            $gte: new Date(`${from}T00:00:00.000+07:00`),
            $lte: new Date(`${to}T23:59:59.999+07:00`)
        };
    }
    switch (preset) {
        case 'today': return { $gte: getVnTimeBoundary(0, true), $lte: getVnTimeBoundary(0, false) };
        case 'yesterday': return { $gte: getVnTimeBoundary(-1, true), $lte: getVnTimeBoundary(-1, false) };
        case 'last7': return { $gte: getVnTimeBoundary(-6, true), $lte: getVnTimeBoundary(0, false) };
        case 'thisMonth': return { $gte: getVnTimeBoundary(0, true, new Date(Date.now() + VN_OFFSET_MS).getUTCMonth()), $lte: getVnTimeBoundary(0, false, new Date(Date.now() + VN_OFFSET_MS).getUTCMonth()) };
        case 'last30':
        default:
            return { $gte: getVnTimeBoundary(-29, true), $lte: getVnTimeBoundary(0, false) };
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
        const { preset = 'last30', from, to } = req.query;
        const dateFilter = buildDateRange(preset, from, to);

        // Lấy toàn bộ đơn hàng trong chu kỳ lọc (Lọc theo createdAt)
        const orders = await Order.find({ createdAt: dateFilter });

        const totalOrders = orders.length;
        const deliveredOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled' || o.status === 'failed_delivery').length;
        const refundedOrders = orders.filter(o => o.paymentStatus === 'Hoàn tiền' || o.paymentStatus === 'Đã hoàn tiền').length;

        // Tính tỷ lệ
        const deliverySuccessRate = totalOrders ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : 0;
        const cancelRate = totalOrders ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : 0;
        const refundRate = totalOrders ? ((refundedOrders / totalOrders) * 100).toFixed(1) : 0;

        // Thống kê phân bổ trạng thái
        const byStatus = orders.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {});

        // Tạo mảng dữ liệu cho biểu đồ (Fill mảng ngày trống để biểu đồ không bị gãy)
        const dailyDataMap = {};
        const startRange = new Date(dateFilter.$gte.getTime() + VN_OFFSET_MS);
        const endRange = new Date(dateFilter.$lte.getTime() + VN_OFFSET_MS);

        let currD = new Date(Date.UTC(startRange.getUTCFullYear(), startRange.getUTCMonth(), startRange.getUTCDate()));
        const endIter = new Date(Date.UTC(endRange.getUTCFullYear(), endRange.getUTCMonth(), endRange.getUTCDate()));

        while (currD <= endIter) {
            const dd = String(currD.getUTCDate()).padStart(2, '0');
            const mm = String(currD.getUTCMonth() + 1).padStart(2, '0');
            dailyDataMap[`${dd}/${mm}`] = { date: `${dd}/${mm}`, orders: 0 };
            currD.setUTCDate(currD.getUTCDate() + 1);
        }

        let avgDeliveryDays = 0;
        let deliveryCount = 0;

        // Map dữ liệu
        orders.forEach(o => {
            const vnTime = new Date(o.createdAt.getTime() + VN_OFFSET_MS);
            const dd = String(vnTime.getUTCDate()).padStart(2, '0');
            const mm = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
            if (dailyDataMap[`${dd}/${mm}`]) {
                dailyDataMap[`${dd}/${mm}`].orders += 1;
            }

            // Tính thời gian giao hàng trung bình
            if (o.status === 'completed' || o.status === 'delivered') {
                if (o.deliveredAt) {
                    const diffTime = Math.abs(new Date(o.deliveredAt) - o.createdAt);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    avgDeliveryDays += diffDays;
                    deliveryCount++;
                }
            }
        });

        if (deliveryCount > 0) {
            avgDeliveryDays = (avgDeliveryDays / deliveryCount).toFixed(1);
        }

        res.json({
            totalOrders,
            rates: { deliverySuccessRate, cancelRate, refundRate },
            logistics: { avgDeliveryDays },
            byStatus,
            dailyData: Object.values(dailyDataMap)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Lỗi server' });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // 1. Khởi tạo object query trống để chứa các điều kiện lọc
        let query = {};

        // 2. Lọc theo trạng thái (status)
        if (req.query.status && req.query.status !== 'all') {
            if (req.query.status === 'pending_refund') {
                query.paymentStatus = 'Hoàn tiền';
            } else if (req.query.status === 'done_refund') {
                query.paymentStatus = 'Đã hoàn tiền';
            } else {
                query.status = req.query.status;
            }
        }

        // 3. Lọc theo ngày tháng (từ và đến)
        if (req.query.from && req.query.to) {
            query.createdAt = {
                $gte: new Date(req.query.from),
                $lte: new Date(req.query.to + 'T23:59:59.999Z') // Lấy tới cuối ngày
            };
        } else if (req.query.preset && req.query.preset !== 'all') {
            // Xử lý nhanh các preset ngày (Ví dụ: last30, last7...)
            const pastDate = new Date();
            const daysToSubtract = req.query.preset.replace('last', '');
            if (!isNaN(daysToSubtract)) {
                pastDate.setDate(pastDate.getDate() - parseInt(daysToSubtract));
                query.createdAt = { $gte: pastDate };
            } else if (req.query.preset === 'today') {
                pastDate.setHours(0, 0, 0, 0);
                query.createdAt = { $gte: pastDate };
            }
        }

        // 4. Áp dụng query vào Mongoose (Của bạn viết rất chuẩn rồi, chỉ cần nhét query vào)
        const orders = await Order.find(query)
            .populate('user', 'name email')
            .populate('items.book')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Đếm tổng số đơn MỚI theo query (Để thanh phân trang chạy đúng)
        const total = await Order.countDocuments(query);

        res.json({ orders, totalPages: Math.ceil(total / limit), totalOrders: total });
    } catch (err) {
        console.error("Lỗi getAdminOrders:", err);
        res.status(500).json({ message: 'Lỗi server' });
    }
};
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email').populate('items.book');
        res.json(order);
    } catch (err) { res.status(500).json({ message: 'Lỗi' }); }
};


exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, reason, shippingProvider, trackingLink, adminNote, callAttempts, paymentStatus } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });

        const oldStatus = order.status;
        const ALLOWED_TRANSITIONS = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['delivering', 'cancelled'],
            delivering: ['delivered', 'failed_delivery', 'cancelled'],
            delivered: ['completed', 'return_requested'],
            return_requested: ['return_approved', 'completed'],
            return_approved: ['returning', 'completed'],
            returning: ['returned', 'completed'],
            completed: [], failed_delivery: [], returned: [], cancelled: []
        };

        if (adminNote !== undefined) order.adminNote = adminNote;
        if (callAttempts !== undefined) order.callAttempts = callAttempts;
        if (paymentStatus && order.paymentMethod === 'transfer') order.paymentStatus = paymentStatus;

        if (oldStatus !== status) {
            if (!ALLOWED_TRANSITIONS[oldStatus]?.includes(status)) {
                return res.status(400).json({ msg: `Hành động không hợp lệ` });
            }

            if (['cancelled', 'failed_delivery', 'returned'].includes(status)) {
                await Promise.all(order.items.map(item => Book.findByIdAndUpdate(item.book, { $inc: { stock: item.quantity } })));
            }

            if (status === 'cancelled' && order.paymentStatus === 'Đã thanh toán') order.paymentStatus = 'Hoàn tiền';

            // TRONG FILE: adminOrderController.js (Hàm updateOrderStatus)
            if (status === 'completed') {
                // 1. Cộng lượt bán cho sách
                await Promise.all(order.items.map(item => Book.findByIdAndUpdate(item.book, { $inc: { sold: item.quantity } })));

                // 2. ✅ FIX LỖI RANK: Cập nhật dòng tiền & Rank cho đơn COD
                if (order.paymentMethod === 'cod' && order.paymentStatus !== 'Đã thanh toán') {
                    order.paymentStatus = 'Đã thanh toán'; // Chốt tiền

                    const userObj = await User.findById(order.user);
                    if (userObj) {
                        // Cộng dồn tiền chi tiêu
                        userObj.totalSpent = (userObj.totalSpent || 0) + order.totalPrice;
                        userObj.lastPurchaseDate = new Date();
                        userObj.rankUpdatedAt = new Date();

                        // Tính lại hạng
                        const calculateRank = (total) => {
                            if (total >= 10000000) return 'Kim cương';
                            if (total >= 5000000) return 'Bạch kim';
                            if (total >= 2000000) return 'Vàng';
                            if (total >= 500000) return 'Bạc';
                            return 'Khách hàng';
                        };
                        userObj.rank = calculateRank(userObj.totalSpent);
                        await userObj.save();
                    }
                }
            }

            if (status === 'failed_delivery') {
                const userObj = await User.findById(order.user);
                if (userObj) {
                    userObj.failedDeliveryCount += 1;
                    if (userObj.failedDeliveryCount >= 3) userObj.isLocked = true;
                    await userObj.save();
                }
            }

            const isRejectingReturn = (oldStatus === 'return_requested' || oldStatus === 'returning') && status === 'completed';
            if (isRejectingReturn) {
                order.adminNote = adminNote || "Từ chối yêu cầu trả hàng";
                if (order.paymentStatus === 'Hoàn tiền') order.paymentStatus = 'Đã thanh toán';
            }

            order.status = status;
            order.statusHistory.push({ status, date: new Date() });
            if (shippingProvider) order.shippingProvider = shippingProvider;
            if (trackingLink) order.trackingLink = trackingLink;
            if (reason) order.cancelReason = reason;

            // BẮN SOCKET THÔNG BÁO
            const io = req.app.get('io');
            if (io) {
                const shortId = order._id.toString().slice(-6).toUpperCase();
                let noti = null;
                if (status === 'failed_delivery') noti = { title: "Giao hàng thất bại ⚠️", message: `Đơn #${shortId} không thành công do bom hàng.` };
                else if (status === 'return_approved') noti = { title: "Duyệt trả hàng ✅", message: `Đơn #${shortId} đã được chấp nhận khiếu nại.` };
                else if (isRejectingReturn) noti = { title: "Từ chối trả hàng ❌", message: `Yêu cầu cho đơn #${shortId} bị từ chối.` };
                else if (status === 'delivering') noti = { title: "Đang giao hàng 🚚", message: `Đơn hàng #${shortId} đang đến bạn.` };

                if (noti) io.emit('new_notification', { ...noti, _id: `${order._id}_${status}`, type: 'order', link: `/orders/${order._id}`, createdAt: new Date() });
            }
        }

        await order.save();
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
        if (!order || order.paymentStatus !== 'Hoàn tiền') return res.status(400).json({ message: 'Không thể hoàn tiền' });

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
        const user = await User.findById(order.user);

        if (user) {
            // 🔥 Trừ lại tiền
            user.totalSpent = Math.max(0, (user.totalSpent || 0) - order.totalPrice);

            // 🔥 Update lại rank
            const calculateRank = (total) => {
                if (total >= 10000000) return 'Kim cương';
                if (total >= 5000000) return 'Bạch kim';
                if (total >= 2000000) return 'Vàng';
                if (total >= 500000) return 'Bạc';
                return 'Khách hàng';
            };

            user.rank = calculateRank(user.totalSpent);
            user.rankUpdatedAt = new Date();

            await user.save();
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('new_notification', {
                _id: `${order._id}_refund`, title: "Hoàn tiền thành công 💰",
                message: `Tiền đơn #${order._id.toString().slice(-6).toUpperCase()} đã được hoàn về tài khoản.`,
                type: 'order', link: `/orders/${order._id}`, createdAt: new Date()
            });
        }
        res.json({ message: 'Hoàn tiền thành công!', order });
    } catch (err) { res.status(500).json({ message: 'Lỗi server' }); }
};


