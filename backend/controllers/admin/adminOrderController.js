const Order = require('../../models/Order')
const User = require('../../models/User')

const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');

// Lấy tất cả đơn hàng (admin) - ĐÃ TỐI ƯU PHÂN TRANG & FILTER
exports.getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // 10 đơn hàng mỗi trang
        const skip = (page - 1) * limit;
        const statusFilter = req.query.status || 'all';

        // 1. Build Query điều kiện lọc từ URL
        let query = {};
        if (statusFilter !== 'all') {
            if (statusFilter === 'pending_refund') {
                query = { status: 'cancelled', paymentStatus: 'Hoàn tiền' };
            } else if (statusFilter === 'done_refund') {
                query = { status: 'cancelled', paymentStatus: 'Đã hoàn tiền' };
            } else if (statusFilter === 'cod_cancelled') {
                query = { status: 'cancelled', paymentStatus: { $nin: ['Hoàn tiền', 'Đã hoàn tiền'] } };
            } else {
                query = { status: statusFilter };
            }
        }

        // 2. Đếm tổng số đơn thỏa mãn điều kiện
        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        // 3. Chỉ lấy đơn hàng của trang hiện tại
        const orders = await Order.find(query)
            .populate('user', 'name email')
            .populate('items.book', 'title price image')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            orders,
            currentPage: page,
            totalPages,
            totalOrders
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
        const { status, reason } = req.body; // ✅ Thêm 'reason' để nhận lý do từ Admin
        const order = await Order.findById(req.params.id);

        if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });

        if (order.status === 'cancelled') {
            return res.status(400).json({ msg: 'Đơn hàng đã bị hủy, không thể cập nhật thêm.' });
        }

        const oldStatus = order.status;

        if (oldStatus !== status) {
            const isNewlyDelivered = oldStatus !== 'delivered' && status === 'delivered';
            const isRefundStock = oldStatus === 'delivered' && status === 'cancelled';

            order.status = status;
            order.statusHistory.push({ status, date: new Date() });

            // ✅ LƯU LÝ DO HỦY CỦA ADMIN
            if (status === 'cancelled') {
                order.cancelReason = reason || 'Quản trị viên hủy đơn';
                order.cancelledAt = new Date();
            }

            if (isNewlyDelivered) {
                order.deliveredAt = new Date();
                for (const item of order.items) {
                    const book = await Book.findById(item.book);
                    if (book) {
                        book.stock = Math.max(0, book.stock - item.quantity);
                        book.sold += item.quantity;
                        await book.save();
                    }
                }
            }

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