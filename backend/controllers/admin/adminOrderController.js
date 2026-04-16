const Order = require('../../models/Order')
const User = require('../../models/User')
const Book = require('../../models/Book')
const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');
const PricingService = require('../../services/pricingService');

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const buildDateRange = (preset, from, to) => {
    if (preset === 'all') return {};

    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);

    if (preset === 'custom' && from && to) {
        // ✅ Tạo mốc thời gian chuẩn UTC để query
        return {
            $gte: new Date(new Date(from).setUTCHours(0, 0, 0, 0) - VN_OFFSET_MS),
            $lte: new Date(new Date(to).setUTCHours(23, 59, 59, 999) - VN_OFFSET_MS)
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
    return { $gte: startDate, $lte: endDate };
};

exports.getOrderStats = async (req, res) => {
    try {
        let { preset = 'last30', from, to } = req.query;

        // Ép preset về custom nếu có ngày từ-đến
        if (from && to) preset = 'custom';

        const dateFilter = buildDateRange(preset, from, to);

        let query = {};
        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        const orders = await Order.find(query);
        const needRefundCount = await Order.countDocuments({ paymentStatus: 'Hoàn tiền' });

        const totalOrders = orders.length;
        const byStatus = orders.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {});

        // ✅ LOGIC VẼ BIỂU ĐỒ CHUẨN XÁC THEO BỘ LỌC TÙY CHỌN
        const dailyDataMap = {};
        let startRange, endRange;

        if (preset === 'custom' && from && to) {
            startRange = new Date(from);
            endRange = new Date(to);
        } else if (Object.keys(dateFilter).length > 0) {
            startRange = new Date(dateFilter.$gte.getTime() + VN_OFFSET_MS);
            endRange = new Date(dateFilter.$lte.getTime() + VN_OFFSET_MS);
        } else {
            // Trường hợp "Tất cả": Lấy từ đơn cũ nhất đến hiện tại
            if (orders.length > 0) {
                const sorted = [...orders].sort((a, b) => a.createdAt - b.createdAt);
                startRange = new Date(sorted[0].createdAt.getTime() + VN_OFFSET_MS);
            } else {
                startRange = new Date();
            }
            endRange = new Date(Date.now() + VN_OFFSET_MS);
        }

        // Chuẩn hóa về 00:00:00 để chạy vòng lặp ngày
        let currD = new Date(startRange);
        currD.setHours(0, 0, 0, 0);
        const lastD = new Date(endRange);
        lastD.setHours(0, 0, 0, 0);

        // Tạo khung ngày tháng
        while (currD <= lastD) {
            const dd = String(currD.getDate()).padStart(2, '0');
            const mm = String(currD.getMonth() + 1).padStart(2, '0');
            const yyyy = currD.getFullYear();

            const key = `${dd}/${mm}/${yyyy}`;
            const displayDate = (preset === 'all' || preset === 'custom') ? `${dd}/${mm}/${yyyy}` : `${dd}/${mm}`;

            dailyDataMap[key] = { date: displayDate, orders: 0 };
            currD.setDate(currD.getDate() + 1);
        }

        // Đổ dữ liệu thật vào
        orders.forEach(o => {
            const vnTime = new Date(o.createdAt.getTime() + VN_OFFSET_MS);
            const key = `${String(vnTime.getUTCDate()).padStart(2, '0')}/${String(vnTime.getUTCMonth() + 1).padStart(2, '0')}/${vnTime.getUTCFullYear()}`;
            if (dailyDataMap[key]) dailyDataMap[key].orders += 1;
        });

        res.json({
            totalOrders,
            needRefundCount,
            byStatus,
            dailyData: Object.values(dailyDataMap),
            rates: {
                deliverySuccessRate: totalOrders ? ((orders.filter(o => o.status === 'completed' || o.status === 'delivered').length / totalOrders) * 100).toFixed(1) : 0,
                cancelRate: totalOrders ? ((orders.filter(o => o.status === 'cancelled').length / totalOrders) * 100).toFixed(1) : 0,
                refundRate: totalOrders ? ((orders.filter(o => o.paymentStatus?.includes('hoàn tiền')).length / totalOrders) * 100).toFixed(1) : 0
            }
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

        // ✅ FIX LOGIC: Lấy preset, from, to từ query
        let { preset, from, to, status } = req.query;

        // ✅ QUAN TRỌNG: Nếu có from và to thì bắt buộc preset phải là 'custom' 
        // để buildDateRange không nhảy vào case default (last30)
        if (from && to && (!preset || preset === 'all')) {
            preset = 'custom';
        }

        let query = {};

        // 1. Lọc theo trạng thái
        if (status && status !== 'all') {
            if (status === 'need_refund') {
                query.paymentStatus = 'Hoàn tiền';
            } else if (status === 'done_refund') {
                query.paymentStatus = 'Đã hoàn tiền';
            } else {
                query.status = status;
            }
        }

        // 2. Lọc theo ngày tháng (Sử dụng preset đã được chuẩn hóa ở trên)
        const dateRange = buildDateRange(preset || 'all', from, to);
        if (Object.keys(dateRange).length > 0) {
            query.createdAt = dateRange;
        }

        // 3. Thực thi Query
        const orders = await Order.find(query)
            .populate('user', 'name email avatar')
            .populate('items.book')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            totalPages: Math.ceil(total / limit),
            totalOrders: total
        });
    } catch (err) {
        console.error('Lỗi getAllOrders:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email avatar').populate('items.book');
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

            if (status === 'completed') {
                await Promise.all(order.items.map(item => Book.findByIdAndUpdate(item.book, { $inc: { sold: item.quantity } })));

                if (order.paymentMethod === 'cod' && order.paymentStatus !== 'Đã thanh toán') {
                    order.paymentStatus = 'Đã thanh toán';

                    const userObj = await User.findById(order.user);
                    if (userObj) {
                        userObj.totalSpent = (userObj.totalSpent || 0) + order.totalPrice;
                        userObj.lastPurchaseDate = new Date();
                        userObj.rankUpdatedAt = new Date();

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
            user.totalSpent = Math.max(0, (user.totalSpent || 0) - order.totalPrice);

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