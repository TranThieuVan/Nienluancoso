const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const messageRoutes = require('./routes/messages');
dotenv.config();
const app = express();

app.use(cors());
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

// --- Các route admin ---
app.use('/api/admin', require('./routes/admin/admin'));
app.use('/api/admin/users', require('./routes/admin/adminUsers'));
app.use('/api/admin/orders', require('./routes/admin/adminOrders'));
app.use('/api/admin/revenue', require('./routes/admin/revenue'));
app.use('/api/admin/comments', require('./routes/admin/comments')); // 👈 thêm dòng này
app.use('/api/messages', messageRoutes);

// Kết nối MongoDB và chạy server
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(process.env.PORT, () => {
            console.log(`Server running at http://localhost:${process.env.PORT}`);
        });
    })
    .catch(err => console.error('MongoDB connection error:', err));
