const cron = require('node-cron');
const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');
const Order = require('../models/Order'); // Điều chỉnh lại đường dẫn nếu cần

// Cài đặt giờ chạy: '0 2 * * *' nghĩa là chạy vào đúng 2h00 sáng mỗi ngày
// Nếu bạn muốn test ngay bây giờ (chạy mỗi 1 phút), hãy đổi thành: '* * * * *'
cron.schedule('0 2 * * *', async () => {
    console.log('🤖 [CRON-BOT] Đang kiểm tra các đơn hàng cần hoàn tiền tự động...');

    try {
        // Tính toán thời điểm "24 giờ trước"
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Tìm các đơn: Đã hủy, Đang chờ hoàn tiền, Thanh toán qua VNPAY, và Hủy cách đây hơn 24h
        const pendingRefundOrders = await Order.find({
            status: 'cancelled',
            paymentStatus: 'Hoàn tiền',
            paymentMethod: 'vnpay',
            cancelledAt: { $lte: twentyFourHoursAgo } // Thời gian hủy <= 24h trước
        });

        if (pendingRefundOrders.length === 0) {
            console.log('🤖 [CRON-BOT] Không có đơn hàng nào cần hoàn tiền lúc này.');
            return;
        }

        console.log(`🤖 [CRON-BOT] Tìm thấy ${pendingRefundOrders.length} đơn hàng. Bắt đầu hoàn tiền...`);

        for (const order of pendingRefundOrders) {
            try {
                if (!order.vnpayTransactionNo || !order.vnpayPayDate) {
                    console.log(`❌ Đơn ${order._id}: Thiếu dữ liệu VNPAY.`);
                    continue; // Bỏ qua đơn này, chạy tiếp đơn sau
                }

                process.env.TZ = 'Asia/Ho_Chi_Minh';
                const date = new Date();
                const vnp_TmnCode = process.env.VNP_TMNCODE;
                const secretKey = process.env.VNP_HASHSECRET;
                const vnp_Api = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

                const vnp_RequestId = moment(date).format('HHmmss');
                const vnp_Version = '2.1.0';
                const vnp_Command = 'refund';
                const vnp_TransactionType = '02'; // Hoàn toàn phần
                const vnp_TxnRef = order._id.toString();
                const vnp_Amount = order.totalPrice * 100;
                const vnp_TransactionNo = order.vnpayTransactionNo;
                const vnp_TransactionDate = order.vnpayPayDate;
                const vnp_CreateBy = 'vanlaolele@gmail.com'; // Email Merchant của bạn
                const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
                const vnp_IpAddr = '127.0.0.1'; // Chạy ngầm nên để IP localhost
                const vnp_OrderInfo = 'Hoan tien tu dong don hang ' + vnp_TxnRef;

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

                if (response.data.vnp_ResponseCode === '00') {
                    // Thành công: Cập nhật CSDL
                    order.paymentStatus = 'Đã hoàn tiền';
                    await order.save();
                    console.log(`✅ [CRON-BOT] Đã hoàn tiền thành công cho đơn ${order._id}`);
                } else {
                    console.log(`❌ [CRON-BOT] VNPAY từ chối đơn ${order._id}:`, response.data.vnp_Message);
                }

            } catch (err) {
                console.error(`❌ [CRON-BOT] Lỗi xử lý đơn ${order._id}:`, err.message);
            }
        }

        console.log('🤖 [CRON-BOT] Hoàn tất phiên kiểm tra!');
    } catch (error) {
        console.error('🤖 [CRON-BOT] Lỗi hệ thống Cron:', error);
    }
});