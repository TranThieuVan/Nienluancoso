const cron = require('node-cron');
const axios = require('axios');
const moment = require('moment');
const crypto = require('crypto');
const Order = require('../models/Order');

// Chạy lúc 2h sáng mỗi ngày
cron.schedule('0 2 * * *', async () => {
    console.log('🤖 [CRON-BOT] Đang kiểm tra đơn hàng cần hoàn tiền (VNPAY)...');

    try {
        // ✅ BUG 2 FIX: Chỉ lấy đúng paymentStatus = 'Hoàn tiền'
        // (không kéo 'Đã thanh toán' vào — đơn chưa hủy mà có paymentStatus đó sẽ bị xử lý sai)
        const pendingRefundOrders = await Order.find({
            status: 'cancelled',
            paymentMethod: 'vnpay',
            paymentStatus: 'Hoàn tiền',
        });

        if (pendingRefundOrders.length === 0) {
            console.log('🤖 [CRON-BOT] Không có đơn hàng nào cần hoàn tiền lúc này.');
            return;
        }

        console.log(`🤖 [CRON-BOT] Tìm thấy ${pendingRefundOrders.length} đơn. Đang lọc theo 24h...`);

        const now = new Date();
        let processed = 0;

        for (const order of pendingRefundOrders) {
            try {
                // ✅ BUG 1 & 3 FIX: Lấy thời gian hủy từ statusHistory
                // cancelledAt KHÔNG có trong Order schema nên không lưu được —
                // phải đọc từ statusHistory mà orderController.js đã push khi user hủy đơn.
                const cancelledEntry = order.statusHistory
                    ?.slice()          // clone để tránh mutate mảng gốc
                    .reverse()        // lấy entry 'cancelled' mới nhất (phòng edge case)
                    .find(h => h.status === 'cancelled');

                if (!cancelledEntry?.date) {
                    console.log(`⚠️  Đơn ${order._id}: Không tìm thấy thời gian hủy trong statusHistory. Bỏ qua.`);
                    continue;
                }

                const cancelledAt = new Date(cancelledEntry.date);
                const hoursSinceCancelled = (now - cancelledAt) / (1000 * 60 * 60);

                // ✅ BUG 1 FIX: Chưa đủ 24h → bỏ qua, đợi lần chạy tiếp theo
                if (hoursSinceCancelled < 24) {
                    console.log(`⏳ Đơn ${order._id}: Mới hủy ${hoursSinceCancelled.toFixed(1)}h trước. Cần đủ 24h theo luật T+1.`);
                    continue;
                }

                if (!order.vnpayTransactionNo || !order.vnpayPayDate) {
                    console.log(`❌ Đơn ${order._id}: Thiếu vnpayTransactionNo hoặc vnpayPayDate.`);
                    continue;
                }

                console.log(`🔄 Đơn ${order._id}: Đã hủy ${hoursSinceCancelled.toFixed(1)}h → Gửi lệnh hoàn tiền VNPAY...`);

                // ── Cấu hình gọi API VNPAY ──────────────────────────────────────
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
                const vnp_CreateBy = process.env.VNP_CREATE_BY || 'admin@yourdomain.com';
                const vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
                const vnp_IpAddr = '127.0.0.1';
                const vnp_OrderInfo = 'Hoan tien tu dong don hang ' + vnp_TxnRef;

                const dataString =
                    `${vnp_RequestId}|${vnp_Version}|${vnp_Command}|${vnp_TmnCode}|` +
                    `${vnp_TransactionType}|${vnp_TxnRef}|${vnp_Amount}|${vnp_TransactionNo}|` +
                    `${vnp_TransactionDate}|${vnp_CreateBy}|${vnp_CreateDate}|${vnp_IpAddr}|${vnp_OrderInfo}`;

                const hmac = crypto.createHmac('sha512', secretKey);
                const vnp_SecureHash = hmac.update(Buffer.from(dataString, 'utf-8')).digest('hex');

                const dataObj = {
                    vnp_RequestId, vnp_Version, vnp_Command, vnp_TmnCode,
                    vnp_TransactionType, vnp_TxnRef, vnp_Amount, vnp_TransactionNo,
                    vnp_TransactionDate, vnp_CreateBy, vnp_CreateDate, vnp_IpAddr,
                    vnp_OrderInfo, vnp_SecureHash,
                };

                // ── Gửi request sang VNPAY ──────────────────────────────────────
                const response = await axios.post(vnp_Api, dataObj);

                if (response.data.vnp_ResponseCode === '00') {
                    order.paymentStatus = 'Đã hoàn tiền';
                    await order.save();
                    processed++;
                    console.log(`✅ [CRON-BOT] Hoàn tiền THÀNH CÔNG: Đơn ${order._id}`);
                } else {
                    // Log đầy đủ ResponseCode để dễ debug với VNPAY
                    console.log(
                        `❌ [CRON-BOT] VNPAY từ chối đơn ${order._id}.` +
                        ` Code: ${response.data.vnp_ResponseCode} | Lý do: ${response.data.vnp_Message}`
                    );
                }

            } catch (err) {
                console.error(`❌ [CRON-BOT] Lỗi khi xử lý đơn ${order._id}:`, err.message);
            }
        }

        console.log(`🤖 [CRON-BOT] Hoàn tất. Đã hoàn tiền ${processed}/${pendingRefundOrders.length} đơn.`);

    } catch (error) {
        console.error('🤖 [CRON-BOT] Lỗi hệ thống Cron:', error);
    }
});