const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Book = require('../models/Book');
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

/* ============================= */
/* TEXT NORMALIZE                */
/* ============================= */
const normalize = (str) => {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
};

/* ============================= */
/* START CONVERSATION            */
/* ============================= */
exports.startConversation = async (req, res) => {
    try {
        const userId = req.user.id;

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            return res.status(404).json({ message: 'Không tìm thấy admin' });
        }

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


/* ============================= */
/* SEND MESSAGE                  */
/* ============================= */
exports.sendMessage = async (req, res) => {
    try {
        const sender = req.user.id;
        const { conversationId, text } = req.body;

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) return res.status(404).json({ message: "Không có admin" });

        const userMessage = await Message.create({
            conversationId,
            sender,
            text
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: text,
            updatedAt: Date.now()
        });

        let aiMessage = null;

        if (sender !== admin._id.toString()) {

            /* ============================= */
            /* 1️⃣ SEARCH BOOK SMART         */
            /* ============================= */

            const normalizedInput = normalize(text);
            const words = normalizedInput.split(" ").filter(w => w.length > 1);

            const books = await Book.find();
            let matchedBook = null;

            for (const book of books) {
                const normalizedTitle = normalize(book.title);

                let matchCount = 0;

                for (const w of words) {
                    if (normalizedTitle.includes(w)) {
                        matchCount++;
                    }
                }

                if (matchCount >= Math.min(2, words.length)) {
                    matchedBook = book;
                    break;
                }
            }

            /* ============================= */
            /* 2️⃣ IF FOUND → TRẢ LỜI DB     */
            /* ============================= */

            if (matchedBook) {

                const hasPrice = normalizedInput.includes("gia") || normalizedInput.includes("bao nhieu");
                const hasStock = normalizedInput.includes("con") || normalizedInput.includes("hang");
                const hasAuthor = normalizedInput.includes("tac gia");
                const hasGenre = normalizedInput.includes("the loai");

                let reply = `Mình có "${matchedBook.title}". `;

                if (hasPrice) {
                    reply += `Giá ${matchedBook.price.toLocaleString()}đ. `;
                }

                if (hasStock) {
                    reply += `Hiện còn ${matchedBook.stock} cuốn trong kho. `;
                }

                if (hasAuthor) {
                    reply += `Tác giả: ${matchedBook.author || "đang cập nhật"}. `;
                }

                if (hasGenre) {
                    reply += `Thể loại: ${matchedBook.genre || "đang cập nhật"}. `;
                }

                if (!hasPrice && !hasStock && !hasAuthor && !hasGenre) {
                    reply += `Giá ${matchedBook.price.toLocaleString()}đ, còn ${matchedBook.stock} cuốn. `;
                    if (matchedBook.author) reply += `Tác giả: ${matchedBook.author}. `;
                    if (matchedBook.genre) reply += `Thể loại: ${matchedBook.genre}. `;
                }

                aiMessage = await Message.create({
                    conversationId,
                    sender: admin._id,
                    text: reply.trim()
                });

                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: reply,
                    updatedAt: Date.now()
                });

            } else {

                /* ============================= */
                /* 3️⃣ NOT FOUND → CALL AI       */
                /* ============================= */

                const history = await Message.find({ conversationId })
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .lean();

                history.reverse();

                const formattedMessages = history.map(msg => ({
                    role: msg.sender.toString() === admin._id.toString()
                        ? "assistant"
                        : "user",
                    content: msg.text
                }));

                try {
                    const response = await openai.chat.completions.create({
                        model: "openai/gpt-4o-mini",
                        messages: [
                            {
                                role: "system",
                                content: `
Bạn là trợ lý AI của nhà sách online.

QUY TẮC:
- Xưng "mình", gọi khách là "bạn".
- Trả lời tối đa 2 câu.
- Nếu khách chỉ chào → chào lại.
- Không bịa thông tin.
- Không dùng từ "Quý khách".

Thông tin cửa hàng:
- Phí ship 40.000đ
- Thanh toán COD hoặc VietQR
- Sách 100% bản quyền
`
                            },
                            ...formattedMessages
                        ],
                        temperature: 0.6,
                    });

                    const aiText = response.choices[0].message.content;

                    aiMessage = await Message.create({
                        conversationId,
                        sender: admin._id,
                        text: aiText
                    });

                    await Conversation.findByIdAndUpdate(conversationId, {
                        lastMessage: aiText,
                        updatedAt: Date.now()
                    });

                } catch (aiError) {
                    console.error("AI ERROR:", aiError);
                }
            }
        }

        res.status(201).json({
            userMessage,
            aiMessage
        });

    } catch (err) {
        console.error("Lỗi gửi tin:", err);
        res.status(500).json({ message: 'Không thể gửi tin nhắn', error: err.message });
    }
};


/* ============================= */
/* CÁC FUNCTION KHÁC GIỮ NGUYÊN */
/* ============================= */

exports.getMessages = async (req, res) => {
    try {
        const conversationId = req.params.conversationId;

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate('sender', 'name role');

        res.status(200).json(messages);

    } catch (err) {
        res.status(500).json({ message: 'Không thể lấy tin nhắn', error: err.message });
    }
};

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

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const userConversations = await Conversation.find({
            participants: userId
        }).select('_id');

        const conversationIds = userConversations.map(c => c._id);

        const count = await Message.countDocuments({
            conversationId: { $in: conversationIds },
            sender: { $ne: userId },
            readBy: { $ne: userId }
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

        await Message.updateMany(
            {
                conversationId,
                sender: { $ne: userId },
                readBy: { $ne: userId }
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