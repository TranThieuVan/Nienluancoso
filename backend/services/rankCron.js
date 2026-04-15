const cron = require('node-cron');
const User = require('../models/User'); // Nhớ check lại đường dẫn model

// ✅ Chạy ngầm mỗi ngày vào lúc 3:00 Sáng
cron.schedule('0 3 * * *', async () => {
    try {
        console.log('[Cron] Đang kiểm tra rớt hạng tài khoản...');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // ✅ SỬA LỖI 1: Quét theo rankUpdatedAt, KHÔNG quét theo lastPurchaseDate
        const inactiveUsers = await User.find({
            rank: { $ne: 'Khách hàng' },
            rankUpdatedAt: { $lt: thirtyDaysAgo }
        });

        for (let user of inactiveUsers) {
            // Giáng xuống 1 bậc
            switch (user.rank) {
                case 'Kim cương': user.rank = 'Bạch kim'; break;
                case 'Bạch kim': user.rank = 'Vàng'; break;
                case 'Vàng': user.rank = 'Bạc'; break;
                case 'Bạc': user.rank = 'Khách hàng'; break;
            }

            // ✅ SỬA LỖI 2: Chỉ reset mốc thời gian rank, giữ nguyên lịch sử mua hàng thật
            user.rankUpdatedAt = new Date();

            await user.save();
        }

        if (inactiveUsers.length > 0) {
            console.log(`[Cron] Đã hạ cấp ${inactiveUsers.length} tài khoản do không hoạt động trong 1 tháng.`);
        }
    } catch (error) {
        console.error('[Cron] Lỗi khi hạ cấp rank:', error);
    }
});