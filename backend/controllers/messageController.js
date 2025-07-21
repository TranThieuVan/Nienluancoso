// controllers/messageController.js
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// ✅ Tạo hoặc lấy conversation giữa user và admin
exports.startConversation = async (req, res) => {
    try {
        const userId = req.user.id;

        // Lấy admin duy nhất
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            return res.status(404).json({ message: 'Không tìm thấy admin nào trong hệ thống' });
        }

        // Tìm hoặc tạo conversation giữa user và admin
        let conversation = await Conversation.findOne({
            participants: { $all: [userId, admin._id] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [userId, admin._id]
            });
        }

        res.status(200).json(conversation);
    } catch (err) {
        res.status(500).json({ message: 'Không thể tạo cuộc trò chuyện', error: err.message });
    }
};

// ✅ Gửi tin nhắn
exports.sendMessage = async (req, res) => {
    try {
        const sender = req.user.id;
        const { conversationId, text } = req.body;

        const message = await Message.create({ conversationId, sender, text });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: text,
            updatedAt: Date.now()
        });

        res.status(201).json(message);
    } catch (err) {
        res.status(500).json({ message: 'Không thể gửi tin nhắn', error: err.message });
    }
};

// ✅ Lấy tin nhắn theo conversation
exports.getMessages = async (req, res) => {
    try {
        const conversationId = req.params.conversationId;

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 }) // Tin nhắn theo thứ tự thời gian
            .populate('sender', 'name role');

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Không thể lấy tin nhắn', error: err.message });
    }
};

// ✅ Admin lấy danh sách conversation với user
exports.getAllConversations = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }

        const adminId = req.user.id;

        const conversations = await Conversation.find()
            .sort({ updatedAt: -1 })
            .populate({
                path: 'participants',
                select: 'name role avatar',
                match: { role: 'user' }
            });

        const result = [];

        for (const conv of conversations) {
            const user = conv.participants.find(p => p?.role === 'user');
            if (!user) continue;

            // ✅ Tính số tin nhắn do user gửi, mà admin chưa đọc (readBy không chứa adminId)
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                sender: user._id,
                readBy: { $ne: adminId }
            });

            result.push({
                ...conv.toObject(),
                participant: user,
                unreadCount
            });
        }

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: 'Không thể lấy danh sách cuộc trò chuyện', error: err.message });
    }
};



// ✅ Lấy số lượng tin nhắn chưa đọc của user

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const userConversations = await Conversation.find({
            participants: userId
        }).select('_id');

        if (!userConversations.length) {
            return res.json({ unreadCount: 0 });
        }

        const conversationIds = userConversations.map(c => c._id);

        // Đếm tin nhắn user chưa đọc (tin nhắn từ người khác và chưa có userId trong readBy)
        const count = await Message.countDocuments({
            conversationId: { $in: conversationIds },
            sender: { $ne: userId },
            readBy: { $ne: userId } // ✨ chưa đọc bởi user
        });

        res.json({ unreadCount: count });
    } catch (err) {
        res.status(500).json({ message: 'Không thể lấy số tin chưa đọc', error: err.message });
    }
};


exports.markMessagesAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        // Cập nhật tất cả message mà user chưa đọc
        await Message.updateMany(
            {
                conversationId,
                sender: { $ne: userId },
                readBy: { $ne: userId } // chỉ cập nhật nếu user chưa nằm trong readBy
            },
            {
                $push: { readBy: userId }
            }
        );

        res.json({ message: 'Đã đánh dấu là đã đọc' });
    } catch (err) {
        res.status(500).json({ message: 'Không thể cập nhật trạng thái đọc', error: err.message });
    }
};