const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Book = require('../models/Book');
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1", // Giữ nguyên cấu hình OpenRouter của bạn
});

/* ============================= */
/* 🛠 ĐỊNH NGHĨA TOOL CHO AI     */
/* ============================= */
const tools = [
    {
        type: "function",
        function: {
            name: "search_books",
            description: "Tìm kiếm sách trong cơ sở dữ liệu của nhà sách dựa trên từ khóa. Trả về thông tin sách bao gồm tên, tác giả, giá và số lượng tồn kho.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Từ khóa tìm kiếm (có thể là tên sách, tên tác giả, hoặc thể loại). Ví dụ: 'Mắt biếc', 'Nguyễn Nhật Ánh', 'kinh dị'."
                    }
                },
                required: ["query"]
            }
        }
    }
];

/* ============================= */
/* TEXT NORMALIZE                */
/* ============================= */
// Giữ lại hàm normalize chuẩn của bạn để xóa dấu tiếng Việt và ký tự đặc biệt
const normalize = (str) => {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
};

/* ============================= */
/* 🛠 HÀM TÌM KIẾM SÁCH NÂNG CẤP */
/* ============================= */
const executeSearchBooks = async (query) => {
    try {
        // 1. Làm sạch từ khóa (vd: "Abs Bat  #1" -> "abs bat 1")
        const cleanQuery = normalize(query);

        // 2. Tách thành mảng các từ khóa (vd: ["abs", "bat", "1"])
        const keywords = cleanQuery.split(/\s+/).filter(k => k.length > 0);

        if (keywords.length === 0) {
            return JSON.stringify({ message: "Từ khóa tìm kiếm trống." });
        }

        // 3. Tạo điều kiện tìm kiếm: Phải chứa TẤT CẢ các từ khóa
        const titleConditions = keywords.map(kw => ({ title: { $regex: kw, $options: 'i' } }));
        const authorConditions = keywords.map(kw => ({ author: { $regex: kw, $options: 'i' } }));

        // 4. Tìm trong MongoDB: Chứa tất cả từ khóa trong Tên HOẶC Tác giả
        const books = await Book.find({
            $or: [
                { $and: titleConditions },
                { $and: authorConditions }
            ]
        }).limit(5).lean();

        if (books.length === 0) {
            return JSON.stringify({ message: `Không tìm thấy cuốn sách nào khớp với từ khóa '${query}'.` });
        }

        return JSON.stringify(books.map(b => ({
            title: b.title,
            author: b.author,
            price: b.price,
            stock: b.stock,
            genre: b.genre
        })));
    } catch (error) {
        console.error("Lỗi khi tìm sách trong DB:", error);
        return JSON.stringify({ message: "Lỗi hệ thống khi tìm sách." });
    }
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
/* SEND MESSAGE (TÍCH HỢP AI)    */
/* ============================= */
exports.sendMessage = async (req, res) => {
    try {
        const sender = req.user.id;
        const { conversationId, text } = req.body;

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) return res.status(404).json({ message: "Không có admin" });

        // 1. Lưu tin nhắn của user
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

        // Nếu người gửi không phải admin -> Gọi AI phản hồi
        if (sender !== admin._id.toString()) {

            // Lấy lịch sử chat (6 tin gần nhất để có ngữ cảnh)
            const history = await Message.find({ conversationId })
                .sort({ createdAt: -1 })
                .limit(6)
                .lean();

            history.reverse();

            const messages = history.map(msg => ({
                role: msg.sender.toString() === admin._id.toString() ? "assistant" : "user",
                content: msg.text
            }));

            // Thêm System Prompt
            messages.unshift({
                role: "system",
                content: `Bạn là trợ lý AI bán hàng siêu nhiệt tình của nhà sách online.
Quy tắc:
- Luôn xưng "mình", gọi khách là "bạn". Trả lời ngắn gọn, thân thiện.
- Khi liệt kê nhiều cuốn sách, BẮT BUỘC PHẢI XUỐNG DÒNG và dùng gạch đầu dòng (-) hoặc đánh số (1., 2.) cho từng cuốn.
- Dùng **chữ in đậm** cho tên sách để khách dễ nhìn.
- Nếu khách hỏi về sách, giá, tác giả, thể loại -> HÃY SỬ DỤNG CÔNG CỤ (TOOL) 'search_books' để kiểm tra kho.
- Nếu kho hết hàng (stock = 0), hãy báo khéo léo và xin lỗi.
- Thông tin cửa hàng: Phí ship 40.000đ, thanh toán COD hoặc VietQR, sách 100% bản quyền.
- TUYỆT ĐỐI KHÔNG BỊA RA TÊN SÁCH HOẶC GIÁ TIỀN nếu không có trong cơ sở dữ liệu.`
            });

            try {
                // 2. Lần gọi AI thứ nhất: Hỏi xem AI có cần dùng Tool tìm sách không
                const response = await openai.chat.completions.create({
                    model: "openai/gpt-4o-mini", // Model này hỗ trợ Tool Calling tốt
                    messages: messages,
                    tools: tools,
                    tool_choice: "auto",
                    temperature: 0.6,
                });

                let aiResponseMsg = response.choices[0].message;

                // 3. Nếu AI quyết định gọi hàm (Tool Calling)
                if (aiResponseMsg.tool_calls && aiResponseMsg.tool_calls.length > 0) {

                    // Đưa yêu cầu gọi tool vào lịch sử tin nhắn
                    messages.push(aiResponseMsg);

                    // Xử lý từng yêu cầu gọi hàm của AI
                    for (const toolCall of aiResponseMsg.tool_calls) {
                        if (toolCall.function.name === "search_books") {
                            const args = JSON.parse(toolCall.function.arguments);
                            const dbResult = await executeSearchBooks(args.query);

                            // Phản hồi kết quả từ Database lại cho AI
                            messages.push({
                                tool_call_id: toolCall.id,
                                role: "tool",
                                name: "search_books",
                                content: dbResult,
                            });
                        }
                    }

                    // Lần gọi AI thứ hai: AI đọc kết quả DB và sinh ra câu trả lời
                    const secondResponse = await openai.chat.completions.create({
                        model: "openai/gpt-4o-mini",
                        messages: messages,
                        temperature: 0.6,
                    });

                    aiResponseMsg = secondResponse.choices[0].message;
                }

                // 4. Lưu câu trả lời cuối cùng của AI vào DB
                const aiText = aiResponseMsg.content;

                if (aiText) {
                    aiMessage = await Message.create({
                        conversationId,
                        sender: admin._id,
                        text: aiText
                    });

                    await Conversation.findByIdAndUpdate(conversationId, {
                        lastMessage: aiText,
                        updatedAt: Date.now()
                    });
                }

            } catch (aiError) {
                console.error("Lỗi khi xử lý AI:", aiError);
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
/* CÁC FUNCTION GET/UPDATE KHÁC  */
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