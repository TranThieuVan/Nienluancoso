const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

exports.register = async (req, res) => {
    try {
        const { name, email, password, role, gender, phone, address } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ msg: 'Email đã tồn tại' });

        const hashedPassword = await bcrypt.hash(password, 10);

        let avatar = req.file
            ? `uploads/avatars/${req.file.filename}`
            : 'uploads/avatars/default-user.png';

        if (req.file && req.file.size === 0) {
            fs.unlinkSync(req.file.path);
            avatar = 'uploads/avatars/default-user.png';
        }

        const newUser = new User({
            name, email, password: hashedPassword,
            role: role || 'user', gender, phone, address, avatar
        });

        await newUser.save();
        res.status(201).json({ msg: 'Đăng ký thành công', user: newUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Đăng ký thất bại', err });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Tài khoản không tồn tại' });

        // ── LOGIC KIỂM TRA KHÓA TÀI KHOẢN CẬP NHẬT ──
        if (user.isLocked) {
            const now = new Date();

            // Nếu có hạn khóa và thời gian hiện tại đã vượt qua hạn khóa
            if (user.lockedUntil && now >= new Date(user.lockedUntil)) {
                // Tự động mở khóa
                user.isLocked = false;
                user.lockedUntil = null;
                await user.save();
            } else {
                // Vẫn đang trong thời gian bị khóa
                let lockMsg = 'Tài khoản của bạn đã bị khóa vĩnh viễn. Vui lòng liên hệ Admin.';
                if (user.lockedUntil) {
                    const unlockDate = new Date(user.lockedUntil).toLocaleString('vi-VN', {
                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
                    });
                    lockMsg = `Tài khoản của bạn đã bị khóa đến ${unlockDate}. Vui lòng thử lại sau.`;
                }
                return res.status(403).json({ msg: lockMsg });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ msg: 'Mật khẩu sai' });

        const token = jwt.sign(
            { id: user._id, role: user.role, avatar: user.avatar },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.json({ token, user: { id: user._id, name: user.name, role: user.role, avatar: user.avatar } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Lỗi server' });
    }
};