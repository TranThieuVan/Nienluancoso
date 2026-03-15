const cron = require('node-cron');
const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');
const Order = require('../models/Order');


cron.schedule('0 2 * * *', async () => {
    console.log('🤖 [CRON-BOT] Đang kiểm tra đơn hàng cần hoàn tiền (VNPAY)...');

    try {
        // 1. TÌM ĐƠN HÀNG HỢP LỆ (Dựa chuẩn 100% theo Model của bạn)
        const pendingRefundOrders = await Order.find({
            status: 'cancelled',                // Đơn đã bị hủy
            paymentMethod: 'vnpay',             // Trả bằng VNPAY
            paymentStatus: { $in: ['Hoàn tiền', 'Đã thanh toán'] }    // Trạng thái lúc thanh toán thành công
        });

        if (pendingRefundOrders.length === 0) {
            console.log('🤖 [CRON-BOT] Không có đơn hàng nào cần hoàn tiền lúc này.');
            return;
        }

        console.log(`🤖 [CRON-BOT] TÌM THẤY ${pendingRefundOrders.length} ĐƠN HÀNG! Bắt đầu xử lý...`);

        for (const order of pendingRefundOrders) {
            try {
                if (!order.vnpayTransactionNo || !order.vnpayPayDate) {
                    console.log(`❌ Đơn ${order._id}: Thiếu vnpayTransactionNo hoặc vnpayPayDate.`);
                    continue;
                }

                // 2. CẤU HÌNH GỌI API VNPAY
                process.env.TZ = 'Asia/Ho_Chi_Minh';
                const date = new Date();
                const vnp_TmnCode = process.env.VNP_TMNCODE;
                const secretKey = process.env.VNP_HASHSECRET;
                const vnp_Api = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

                const vnp_RequestId = moment(date).format('HHmmss');
                const vnp_Version = '2.1.0';
                const vnp_Command = 'refund';
                const vnp_TransactionType = '02'; // 02: Hoàn toàn phần
                const vnp_TxnRef = order._id.toString();
                const vnp_Amount = order.totalPrice * 100;
                const vnp_TransactionNo = order.vnpayTransactionNo;
                const vnp_TransactionDate = order.vnpayPayDate;
                const vnp_CreateBy = 'admin@yourdomain.com'; // Bạn có thể để email của bạn
                const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
                const vnp_IpAddr = '127.0.0.1';
                const vnp_OrderInfo = 'Hoan tien tu dong don hang ' + vnp_TxnRef;

                const dataString = `${vnp_RequestId}|${vnp_Version}|${vnp_Command}|${vnp_TmnCode}|${vnp_TransactionType}|${vnp_TxnRef}|${vnp_Amount}|${vnp_TransactionNo}|${vnp_TransactionDate}|${vnp_CreateBy}|${vnp_CreateDate}|${vnp_IpAddr}|${vnp_OrderInfo}`;

                const hmac = crypto.createHmac("sha512", secretKey);
                const vnp_SecureHash = hmac.update(Buffer.from(dataString, 'utf-8')).digest("hex");

                const dataObj = {
                    vnp_RequestId, vnp_Version, vnp_Command, vnp_TmnCode,
                    vnp_TransactionType, vnp_TxnRef, vnp_Amount, vnp_TransactionNo,
                    vnp_TransactionDate, vnp_CreateBy, vnp_CreateDate, vnp_IpAddr,
                    vnp_OrderInfo, vnp_SecureHash
                };

                // 3. GỬI REQUEST CHO VNPAY
                const response = await axios.post(vnp_Api, dataObj);

                // 4. KIỂM TRA KẾT QUẢ VÀ CẬP NHẬT DATABASE
                if (response.data.vnp_ResponseCode === '00') {
                    order.paymentStatus = 'Đã hoàn tiền'; // Đổi trạng thái trong DB của bạn
                    await order.save();
                    console.log(`✅ [CRON-BOT] Đã hoàn tiền THÀNH CÔNG cho đơn: ${order._id}`);
                } else {
                    console.log(`❌ [CRON-BOT] VNPAY từ chối đơn ${order._id}. Lỗi: ${response.data.vnp_Message}`);
                }

            } catch (err) {
                console.error(`❌ [CRON-BOT] Lỗi code khi xử lý đơn ${order._id}:`, err.message);
            }
        }

    } catch (error) {
        console.error('🤖 [CRON-BOT] Lỗi hệ thống Cron:', error);
    }
});