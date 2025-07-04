const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

exports.register = async (req, res) => {
    try {
        const { name, email, password, role, gender, phone, address } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ msg: 'Email đã tồn tại' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const avatar = req.file
            ? `uploads/avatars/${req.file.filename}`
            : 'uploads/avatars/default-user.png';

        // Nếu req.file tồn tại nhưng size = 0 hoặc không hợp lệ thì không dùng
        if (req.file && req.file.size === 0) {
            fs.unlinkSync(req.file.path); // xoá file rác nếu cần
            avatar = 'uploads/avatars/default-user.png';
        }
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'user',
            gender,
            phone,
            address,
            avatar
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

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ msg: 'Mật khẩu sai' });

        const token = jwt.sign({ id: user._id, role: user.role, avatar: user.avatar }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, role: user.role, avatar: user.avatar } });
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server' });
    }
};
