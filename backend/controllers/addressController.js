const Address = require('../models/Address');

// 1. Lấy danh sách địa chỉ của người dùng
exports.getMyAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
        res.json(addresses);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server khi lấy địa chỉ' });
    }
};

// 2. Thêm địa chỉ mới
exports.createAddress = async (req, res) => {
    try {
        const { fullName, phone, street, ward, district, city } = req.body;

        // Kiểm tra xem người dùng đã có địa chỉ nào chưa
        const addressCount = await Address.countDocuments({ user: req.user.id });

        const newAddress = new Address({
            user: req.user.id,
            fullName,
            phone,
            street,
            ward,
            district,
            city,
            isDefault: addressCount === 0 // Nếu là địa chỉ đầu tiên thì đặt mặc định
        });

        const savedAddress = await newAddress.save();
        res.status(201).json(savedAddress);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server khi thêm địa chỉ' });
    }
};

// 4. Cập nhật địa chỉ
exports.updateAddress = async (req, res) => {
    try {
        const { fullName, phone, street, ward, district, city, isDefault } = req.body;

        let address = await Address.findById(req.params.id);

        if (!address || address.user.toString() !== req.user.id) {
            return res.status(404).json({ msg: 'Không tìm thấy địa chỉ hoặc bạn không có quyền' });
        }

        // Cập nhật các trường dữ liệu
        address.fullName = fullName || address.fullName;
        address.phone = phone || address.phone;
        address.street = street || address.street;
        address.ward = ward || address.ward;
        address.district = district || address.district;
        address.city = city || address.city;
        if (typeof isDefault !== 'undefined') address.isDefault = isDefault;

        const updatedAddress = await address.save();
        res.json(updatedAddress);
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi server khi cập nhật địa chỉ' });
    }
};

// 3. Xóa địa chỉ (Tùy chọn thêm để web chuyên nghiệp hơn)
exports.deleteAddress = async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);
        if (!address || address.user.toString() !== req.user.id) {
            return res.status(404).json({ msg: 'Không tìm thấy địa chỉ' });
        }
        await address.deleteOne();
        res.json({ msg: 'Đã xóa địa chỉ thành công' });
    } catch (err) {
        res.status(500).json({ msg: 'Lỗi khi xóa địa chỉ' });
    }
};