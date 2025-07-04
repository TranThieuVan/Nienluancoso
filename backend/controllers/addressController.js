const Address = require('../models/Address');

// Thêm địa chỉ mới
exports.createAddress = async (req, res) => {
    try {
        const address = new Address({ ...req.body, user: req.user.id });
        await address.save();
        res.status(201).json(address);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi tạo địa chỉ', error: err.message });
    }
};

// Lấy tất cả địa chỉ của user hiện tại
exports.getMyAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user.id });
        res.json(addresses);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi lấy danh sách địa chỉ' });
    }
};

// Cập nhật địa chỉ
exports.updateAddress = async (req, res) => {
    try {
        const address = await Address.findOneAndUpdate(
            { id: req.params.id, user: req.user.id },
            req.body,
            { new: true }
        );
        if (!address) return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        res.json(address);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật địa chỉ' });
    }
};

// Xoá địa chỉ
exports.deleteAddress = async (req, res) => {
    try {
        const result = await Address.findOneAndDelete({ id: req.params.id, user: req.user.id });
        if (!result) return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        res.json({ message: 'Đã xoá địa chỉ' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi xoá địa chỉ' });
    }
};
