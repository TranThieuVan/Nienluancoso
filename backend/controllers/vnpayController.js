const crypto = require('crypto');
const qs = require('qs');
const moment = require('moment');

// Hàm hỗ trợ sắp xếp các tham số theo thứ tự alphabet (BẮT BUỘC ĐỐI VỚI VNPAY)
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// API: Tạo đường link thanh toán VNPAY
exports.createPaymentUrl = async (req, res) => {
    try {
        let amount = req.body.amount;
        let bankCode = req.body.bankCode || '';
        let orderId = req.body.orderId;

        // Chặn ngay lập tức nếu Frontend gửi thiếu mã đơn hàng
        if (!orderId) {
            return res.status(400).json({ message: "Thiếu mã đơn hàng (orderId)" });
        }

        let date = new Date();
        // Ép cứng múi giờ Việt Nam (UTC+7) để VNPAY không báo lỗi thời gian
        let createDate = moment(date).utcOffset('+0700').format('YYYYMMDDHHmmss');
        let expireDate = moment(date).utcOffset('+0700').add(15, 'minutes').format('YYYYMMDDHHmmss');

        let ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
        let tmnCode = process.env.VNP_TMNCODE;
        let secretKey = process.env.VNP_HASHSECRET;
        let vnpUrl = process.env.VNP_URL;
        let returnUrl = process.env.VNP_RETURNURL;

        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = req.body.language || 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang: ' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        vnp_Params['vnp_ExpireDate'] = expireDate; // Báo cho VNPAY biết đơn này sống 15 phút

        if (bankCode !== null && bankCode !== '') {
            vnp_Params['vnp_BankCode'] = bankCode;
        }

        vnp_Params = sortObject(vnp_Params);

        let signData = qs.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");

        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

        res.status(200).json({ paymentUrl: vnpUrl });

    } catch (error) {
        console.error("Lỗi tạo link VNPAY:", error);
        res.status(500).json({ message: "Lỗi server khi tạo link thanh toán." });
    }
};