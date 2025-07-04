const User = require('../models/User');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// [GET] /api/users/me – Lấy thông tin người dùng
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server' });
    }
};

// [PUT] /api/users/me – Cập nhật tên và avatar
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User không tồn tại' });

        if (req.body.name) user.name = req.body.name;

        if (req.file) {
            // Nếu có avatar cũ (và không phải mặc định) → xoá
            if (user.avatar && user.avatar !== 'uploads/avatars/default-user.png') {
                fs.unlink(user.avatar, (err) => {
                    if (err) console.error('Xoá avatar cũ thất bại:', err.message);
                });
            }

            user.avatar = `uploads/avatars/${req.file.filename}`;
        }

        await user.save();
        res.json({ msg: 'Cập nhật hồ sơ thành công', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Lỗi cập nhật hồ sơ' });
    }
};

// [PUT] /api/users/change-password – Đổi mật khẩu
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'Không tìm thấy người dùng' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Mật khẩu hiện tại không đúng' });

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        await user.save();

        res.json({ success: true, msg: 'Đổi mật khẩu thành công' });
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server', error: err.message });
    }
};

exports.updateEmail = async (req, res) => {
    const userId = req.user.id
    const { email } = req.body

    try {
        const existing = await User.findOne({ email })
        if (existing && existing._id.toString() !== userId)
            return res.status(400).json({ msg: 'Email này đã được sử dụng.' })

        const updatedUser = await User.findByIdAndUpdate(userId, { email }, { new: true })
        res.json({ msg: 'Cập nhật thành công', user: updatedUser })
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server' })
    }
}

