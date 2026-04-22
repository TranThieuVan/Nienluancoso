require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Đảm bảo đường dẫn tới model User là chính xác

const runUpdate = async () => {
    try {
        console.log('⏳ Đang kết nối tới MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Kết nối thành công!\n');

        const targetEmail = "vanlaole@gmail.com";
        const lowestRank = "Khách hàng"; // Hạng thấp nhất theo logic hệ thống

        console.log(`🔍 Đang tìm và cập nhật người dùng: ${targetEmail}...`);

        // Cập nhật hạng về "Khách hàng" và reset tổng chi tiêu về 0
        const updatedUser = await User.findOneAndUpdate(
            { email: targetEmail },
            {
                $set: {
                    rank: lowestRank,
                    totalSpent: 0,
                    rankUpdatedAt: new Date()
                }
            },
            { new: true } // Trả về dữ liệu sau khi đã cập nhật
        );

        if (!updatedUser) {
            console.log(`⚠️ Không tìm thấy người dùng nào có email "${targetEmail}".`);
        } else {
            console.log(`✅ Cập nhật thành công!`);
            console.log(`👤 Người dùng: ${updatedUser.name}`);
            console.log(`📉 Hạng hiện tại: ${updatedUser.rank}`);
            console.log(`💰 Tổng chi tiêu: ${updatedUser.totalSpent}₫`);
        }

    } catch (error) {
        console.error('❌ Lỗi trong quá trình cập nhật:', error);
    } finally {
        mongoose.connection.close();
        console.log('\n🔌 Đã ngắt kết nối database.');
        process.exit(0);
    }
};

runUpdate();