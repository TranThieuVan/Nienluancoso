const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const bookRoutes = require('./routes/book');
app.use('/api/books', bookRoutes);

// Cho phép truy cập ảnh tĩnh trong thư mục /public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// DB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(process.env.PORT, () => {
            console.log(`Server running on http://localhost:${process.env.PORT}`);
        });
    })
    .catch(err => console.log(err));
