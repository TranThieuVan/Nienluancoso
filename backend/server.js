const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const PricingService = require('./services/pricingService');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const messageRoutes = require('./routes/messages');
const vnpayRoutes = require('./routes/vnpay');
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5174",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set('io', io);

// ✅ FIX: Thêm xử lý join/leave room — đây là phần bị thiếu khiến real-time không hoạt động
io.on('connection', (socket) => {

    // Client emit 'join' kèm conversationId -> đưa socket vào room đó
    socket.on('join', (conversationId) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} đã join room: ${conversationId}`);
    });

    // Client emit 'leave' khi chuyển sang conversation khác (dùng cho Admin)
    socket.on('leave', (conversationId) => {
        socket.leave(conversationId);
        console.log(`Socket ${socket.id} đã leave room: ${conversationId}`);
    });

    socket.on('disconnect', () => {
    });
});

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/stats', require('./routes/stats'));
app.use('/api/admin', require('./routes/admin/admin'));
app.use('/api/admin/users', require('./routes/admin/adminUsers'));
app.use('/api/admin/orders', require('./routes/admin/adminOrders'));
app.use('/api/admin/vouchers', require('./routes/admin/adminVouchers'));
app.use('/api/admin/revenue', require('./routes/admin/revenue'));
app.use('/api/admin/comments', require('./routes/admin/comments'));
app.use('/api/messages', messageRoutes);
app.use('/api/admin/promotions', require('./routes/admin/adminPromotions'));
app.use('/api/notifications', require('./routes/notification'));

require('./services/refundCron');
require('./services/rankCron');
require('./services/orderCron');

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        PricingService.refreshCache();
        server.listen(process.env.PORT, () => {
            console.log(`Server running at http://localhost:${process.env.PORT}`);
        });
    })
    .catch(err => console.error('MongoDB connection error:', err));