const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Book = require('../models/Book')
const User = require('../models/User');
const PricingService = require('../services/pricingService');
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        // ✅ Nhận đúng các biến discountAmount và voucherCode từ Frontend gửi lên
        const { items, shippingAddress, paymentMethod, discountAmount, voucherCode } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ msg: 'Không có sản phẩm nào' });

        const bookIds = items.map(i => i.book);
        const rawBooks = await Book.find({ _id: { $in: bookIds } }).lean();
        const pricedBooks = PricingService.applyPricing(rawBooks);

        let calculatedTotalAmount = 0;
        const processedItems = [];

        for (const item of items) {
            const book = pricedBooks.find(b => String(b._id) === String(item.book));
            if (!book) return res.status(400).json({ msg: `Sách không tồn tại.` });
            if (book.stock < item.quantity) return res.status(400).json({ msg: `Sách "${book.title}" chỉ còn ${book.stock} cuốn.` });

            const currentPrice = book.discountedPrice || book.price;
            calculatedTotalAmount += (currentPrice * item.quantity);

            processedItems.push({
                book: item.book,
                quantity: item.quantity,
                price: currentPrice // ✅ LƯU CỨNG GIÁ VÀO DATABASE ĐỂ KHÔNG BAO GIỜ BỊ ĐỔI NỮA
            });
        }

        calculatedTotalAmount += 40000; // Phí ship
        if (discountAmount) {
            calculatedTotalAmount -= discountAmount; // Trừ tiền voucher thực sự
        }

        for (const item of items) {
            await Book.findByIdAndUpdate(item.book, { $inc: { stock: -item.quantity } });
        }

        const order = new Order({
            user: userId,
            items: processedItems,
            shippingAddress,
            shippingFee: 40000,
            totalPrice: calculatedTotalAmount,
            discountAmount: discountAmount || 0, // ✅ LƯU VOUCHER VÀO ĐƠN
            voucherCode: voucherCode || null,
            paymentMethod: paymentMethod || 'cod',
            paymentStatus: 'Chờ thanh toán',
            status: 'pending',
            statusHistory: [{ status: 'pending', date: new Date() }]
        });
        await order.save();

        res.status(201).json({ msg: 'Đặt hàng thành công', order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Lỗi server khi tạo đơn hàng' });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const { startDate, endDate } = req.query; // Nhận tham số ngày từ frontend

        const skip = (page - 1) * limit;

        // Xây dựng query lọc theo user và thời gian
        let query = { user: userId };
        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Lấy đến cuối ngày của endDate
            query.createdAt = { $gte: new Date(startDate), $lte: end };
        }

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit) || 1;

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('items.book')
            .skip(skip)
            .limit(limit);

        res.json({ orders, currentPage: page, totalPages, totalOrders });
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi khi lấy danh sách đơn hàng' });
    }
};
// Lấy chi tiết đơn hàng
exports.getOrderById = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const order = await Order.findById(req.params.id).populate('items.book');

        if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });

        if (String(order.user) !== String(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Không có quyền truy cập' });
        }

        // ❌ KHÔNG dùng PricingService ở đây để giữ nguyên giá lịch sử

        res.json(order);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi khi lấy chi tiết đơn hàng' });
    }
};
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user._id || req.user.id;

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        if (String(order.user) !== String(userId)) return res.status(403).json({ message: 'Không quyền' });
        if (order.status !== 'pending') return res.status(400).json({ message: 'Chỉ hủy được khi đang chờ xử lý' });

        order.status = 'cancelled';
        order.cancelReason = reason;
        if (order.paymentStatus === 'Đã thanh toán') order.paymentStatus = 'Hoàn tiền';
        order.statusHistory.push({ status: 'cancelled', date: new Date() });

        // KHÔNG CỘNG LẠI KHO VÌ PENDING CHƯA TRỪ KHO (Đã cập nhật logic mới: Pending đã trừ kho, cronjob hoặc admin sẽ cộng lại)
        await order.save();
        res.json({ message: 'Hủy đơn thành công', order });
    } catch (error) { res.status(500).json({ message: 'Lỗi server' }); }
};

exports.updateOrderToPaid = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { vnpayTransactionNo, vnpayPayDate } = req.body;

        // 🔥 Lấy order trước (để check trạng thái)
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
        }

        // ❗ Tránh cộng tiền 2 lần
        if (order.paymentStatus === 'Đã thanh toán') {
            return res.status(400).json({ message: "Đơn hàng đã được thanh toán trước đó" });
        }

        // ✅ Update trạng thái thanh toán
        order.paymentStatus = 'Đã thanh toán';
        order.vnpayTransactionNo = vnpayTransactionNo;
        order.vnpayPayDate = vnpayPayDate;

        await order.save();

        // 🔥 UPDATE USER (QUAN TRỌNG NHẤT)
        const user = await User.findById(order.user);

        if (user) {
            // 👉 Cộng tiền
            user.totalSpent = (user.totalSpent || 0) + order.totalPrice;

            // 👉 Update thời gian
            user.lastPurchaseDate = new Date();
            user.rankUpdatedAt = new Date();

            // 👉 Hàm tính rank
            const calculateRank = (total) => {
                if (total >= 10000000) return 'Kim cương';
                if (total >= 5000000) return 'Bạch kim';
                if (total >= 2000000) return 'Vàng';
                if (total >= 500000) return 'Bạc';
                return 'Khách hàng';
            };

            // 👉 Set rank mới
            user.rank = calculateRank(user.totalSpent);

            await user.save();
        }

        res.json({
            message: "Cập nhật thanh toán thành công & đã cập nhật hạng user",
            order
        });

    } catch (error) {
        console.error("Lỗi cập nhật thanh toán:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// ✅ API: USER YÊU CẦU TRẢ HÀNG & NHẬP LUÔN BANK
exports.requestReturn = async (req, res) => {
    try {
        const { id } = req.params;
        const { returnReasonType, returnReasonDetail, returnMedia, returnBankQR, returnBankDetails } = req.body;

        const order = await Order.findById(id);

        if (String(order.user) !== String(req.user._id || req.user.id)) return res.status(403).json({ msg: 'Không quyền' });
        if (order.status !== 'delivered') return res.status(400).json({ msg: 'Chỉ khiếu nại được khi đã nhận hàng' });

        // Cập nhật trạng thái
        order.status = 'return_requested';
        order.statusHistory.push({ status: 'return_requested', date: new Date() });

        // Lưu toàn bộ dữ liệu từ Form
        order.returnReasonType = returnReasonType;
        order.returnReasonDetail = returnReasonDetail;
        if (returnMedia) order.returnMedia = returnMedia;
        if (returnBankQR) order.returnBankQR = returnBankQR;
        if (returnBankDetails) order.returnBankDetails = returnBankDetails;

        await order.save();
        res.json({ msg: 'Đã gửi yêu cầu trả hàng và thông tin hoàn tiền. Vui lòng chờ Shop duyệt!', order });
    } catch (err) { res.status(500).json({ msg: 'Lỗi server' }); }
}

// ✅ API: USER XÁC NHẬN ĐÃ GỬI HÀNG ĐI (Lưu kèm thông tin vận đơn)
exports.submitReturnTracking = async (req, res) => {
    try {
        const { id } = req.params;
        const { returnShippingProvider, returnTrackingCode, returnReceipt } = req.body;

        const order = await Order.findById(id);

        if (String(order.user) !== String(req.user._id || req.user.id)) {
            return res.status(403).json({ msg: 'Không quyền truy cập' });
        }
        if (order.status !== 'return_approved') {
            return res.status(400).json({ msg: 'Đơn hàng chưa được Admin duyệt trả hàng' });
        }

        // Cập nhật trạng thái
        order.status = 'returning';
        order.statusHistory.push({ status: 'returning', date: new Date() });

        // ✅ LƯU THÔNG TIN VẬN ĐƠN KHÁCH NHẬP VÀO DATABASE
        if (returnShippingProvider) order.returnShippingProvider = returnShippingProvider;
        if (returnTrackingCode) order.returnTrackingCode = returnTrackingCode;
        if (returnReceipt) order.returnReceipt = returnReceipt;

        await order.save();
        res.json({ msg: 'Đã xác nhận gửi trả hàng và lưu thông tin vận đơn', order });
    } catch (err) {
        console.error("Lỗi submit tracking:", err);
        res.status(500).json({ msg: 'Lỗi server' });
    }
}

exports.getVirtualNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        // Tìm các đơn hàng có trạng thái "đặc biệt" cần báo cho user
        const orders = await Order.find({
            user: userId,
            status: { $in: ['failed_delivery', 'return_approved', 'completed'] }
        }).sort({ updatedAt: -1 }).limit(10);

        const notifications = [];

        orders.forEach(order => {
            const shortId = order._id.toString().slice(-6).toUpperCase();

            // 1. Thông báo Bom hàng
            if (order.status === 'failed_delivery') {
                notifications.push({
                    _id: `${order._id}_failed`, // ID giả để React nhận diện
                    title: "Giao hàng thất bại ⚠️",
                    message: `Đơn hàng #${shortId} không thể giao tới bạn. Vui lòng kiểm tra lại.`,
                    type: 'order',
                    link: `/orders/${order._id}`,
                    createdAt: order.updatedAt
                });
            }

            // 2. Thông báo Hoàn tiền
            if (order.paymentStatus === 'Đã hoàn tiền') {
                notifications.push({
                    _id: `${order._id}_refunded`,
                    title: "Hoàn tiền thành công 💰",
                    message: `Tiền của đơn hàng #${shortId} đã được hoàn về tài khoản.`,
                    type: 'order',
                    link: `/orders/${order._id}`,
                    createdAt: order.updatedAt
                });
            }

            // 3. Thông báo Duyệt trả hàng
            if (order.status === 'return_approved') {
                notifications.push({
                    _id: `${order._id}_approved`,
                    title: "Duyệt trả hàng ✅",
                    message: `Yêu cầu trả hàng #${shortId} đã được chấp nhận. Vui lòng gửi lại hàng.`,
                    type: 'order',
                    link: `/orders/${order._id}`,
                    createdAt: order.updatedAt
                });
            }

            // 4. Thông báo Từ chối (Rejection)
            const isRejected = order.status === 'completed' && order.adminNote?.toLowerCase().includes('từ chối');
            if (isRejected) {
                notifications.push({
                    _id: `${order._id}_rejected`,
                    title: "Khiếu nại bị từ chối ❌",
                    message: `Yêu cầu cho đơn #${shortId} không được chấp nhận. Lý do: ${order.adminNote}`,
                    type: 'order',
                    link: `/orders/${order._id}`,
                    createdAt: order.updatedAt
                });
            }
        });

        res.json(notifications);
    } catch (err) {
        res.status(500).json({ msg: "Lỗi trích xuất thông báo" });
    }
};