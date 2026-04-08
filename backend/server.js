const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const PricingService = require('./services/pricingService'); // Sửa lại đường dẫn cho đúng với thư mục của bạn
const cors = require('cors');
const path = require('path');
const compression = require('compression');
// 1. Import thêm http và socket.io
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const messageRoutes = require('./routes/messages');
const vnpayRoutes = require('./routes/vnpay');
const app = express();

// 2. Khởi tạo HTTP Server và gắn Socket.io vào
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5174", // Thay URL này bằng port chạy Frontend React của bạn nếu khác
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});


// 3. Đưa biến `io` vào app để lát nữa các file Controller có thể lôi ra xài
app.set('io', io);

// 4. Lắng nghe kết nối từ Client
io.on('connection', (socket) => {
    console.log('🟢 Một user vừa kết nối với Socket ID:', socket.id);

    socket.on('disconnect', () => {
        console.log('🔴 User đã ngắt kết nối:', socket.id);
    });
});

app.use(cors());
app.use(compression());
app.use(express.json());

// Serve ảnh
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Các route người dùng ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/addresses', require('./routes/address'));
app.use('/api/favorites', require('./routes/favorite'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/order'));
app.use('/api/books', require('./routes/book'));
app.use('/api/rating', require('./routes/rating'));
app.use('/api/comments', require('./routes/comment'));
app.use('/api/vnpay', vnpayRoutes);
app.use('/api/vouchers', require('./routes/voucher'));
app.use('/api/promotions', require('./routes/admin/adminPromotions'));

// --- Các route admin ---
app.use('/api/admin', require('./routes/admin/admin'));
app.use('/api/admin/users', require('./routes/admin/adminUsers'));
app.use('/api/admin/orders', require('./routes/admin/adminOrders'));
app.use('/api/admin/vouchers', require('./routes/admin/adminVouchers'));
app.use('/api/admin/revenue', require('./routes/admin/revenue'));
app.use('/api/admin/comments', require('./routes/admin/comments'));
app.use('/api/messages', messageRoutes);
app.use('/api/admin/promotions', require('./routes/admin/adminPromotions'));
app.use('/api/notifications', require('./routes/notification'));
// ✅ GỌI BOT CHẠY NGẦM Ở ĐÂY 
require('./services/refundCron');
require('./services/rankCron');

// Kết nối MongoDB và chạy server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');

        PricingService.refreshCache();
        server.listen(process.env.PORT, () => {
            console.log(`Server running at http://localhost:${process.env.PORT}`);
        });
    })
    .catch(err => console.error('MongoDB connection error:', err));