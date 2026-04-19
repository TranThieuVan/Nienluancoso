// syncSold.js
const mongoose = require('mongoose');
const Book = require('./models/Book');
const Order = require('./models/Order');
require('dotenv').config();

const syncSoldCount = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🔄 Đang bắt đầu đồng bộ số lượng đã bán...');

        // 1. Tính toán tổng số lượng đã bán từ các đơn hàng "completed"
        const salesData = await Order.aggregate([
            { $match: { status: "completed" } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.book",
                    totalQty: { $sum: "$items.quantity" }
                }
            }
        ]);

        // 2. Reset tất cả trường sold về 0 trước khi cập nhật mới
        await Book.updateMany({}, { $set: { sold: 0 } });

        // 3. Cập nhật dữ liệu mới vào từng cuốn sách
        const updatePromises = salesData.map(item =>
            Book.findByIdAndUpdate(item._id, { $set: { sold: item.totalQty } })
        );

        await Promise.all(updatePromises);
        console.log(`✅ Thành công! Đã đồng bộ doanh số cho ${salesData.length} cuốn sách.`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    }
};

syncSoldCount();