require('dotenv').config();
const mongoose = require('mongoose');

// Import model User (Kiểm tra lại đường dẫn nếu cần)
const User = require('./models/User');

const resetRank = async () => {
    try {
        console.log('⏳ Đang kết nối tới MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Kết nối thành công!\n');

        const targetEmail = "vanlaole@gmail.com";
        console.log(`🔍 Đang tìm người dùng: ${targetEmail}...`);

        // Reset dữ liệu hạng và chi tiêu về mặc định
        const updatedUser = await User.findOneAndUpdate(
            { email: targetEmail },
            {
                $set: {
                    rank: "Khách hàng", // Hoặc "Đồng", "Member"... tùy theo mốc thấp nhất của bạn
                    totalSpent: 0
                },
                $unset: {
                    rankUpdatedAt: "" // Xóa luôn mốc thời gian lên hạng cũ (nếu có)
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            console.log(`❌ Không tìm thấy người dùng "${targetEmail}".`);
        } else {
            console.log(`\n🎉 HOÀN TẤT: Đã xóa hạng của "${updatedUser.name}".`);
            console.log(`📉 Hạng hiện tại: ${updatedUser.rank}`);
            console.log(`💰 Tổng chi tiêu: ${updatedUser.totalSpent}₫`);
        }

    } catch (error) {
        console.error('❌ Lỗi kỹ thuật:', error);
    } finally {
        mongoose.connection.close();
        console.log('🔌 Đã ngắt kết nối database.');
        process.exit(0);
    }
};

resetRank();