const cron = require('node-cron');
const User = require('../models/User');

// ✅ Chạy ngầm mỗi ngày vào lúc 3:00 Sáng
cron.schedule('0 3 * * *', async () => {
    try {
        console.log('[Cron] Đang kiểm tra rớt hạng tài khoản...');

        // Mốc thời gian: 30 ngày trước so với hiện tại
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Tìm các user có rank KHÁC "Khách hàng" VÀ đã quá 30 ngày không mua gì
        const inactiveUsers = await User.find({
            rank: { $ne: 'Khách hàng' },
            lastPurchaseDate: { $lt: thirtyDaysAgo }
        });

        for (let user of inactiveUsers) {
            // Giáng xuống 1 bậc
            switch (user.rank) {
                case 'Kim cương': user.rank = 'Bạch kim'; break;
                case 'Bạch kim': user.rank = 'Vàng'; break;
                case 'Vàng': user.rank = 'Bạc'; break;
                case 'Bạc': user.rank = 'Khách hàng'; break;
            }

            // ✅ QUAN TRỌNG: Cập nhật lại lastPurchaseDate thành ngày hôm nay
            // Để cho họ thêm đúng 30 ngày nữa, nếu vẫn không mua thì mới giáng chức tiếp
            user.lastPurchaseDate = new Date();

            await user.save();
        }

        if (inactiveUsers.length > 0) {
            console.log(`[Cron] Đã hạ cấp ${inactiveUsers.length} tài khoản do không hoạt động trong 1 tháng.`);
        }
    } catch (error) {
        console.error('[Cron] Lỗi khi hạ cấp rank:', error);
    }
});