const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Book = require('../models/Book');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────── */
const AI_MODEL = 'openai/gpt-4o-mini';
const AI_TIMEOUT_MS = 15_000;   // 15 giây timeout cho mỗi lần gọi AI
const HISTORY_LIMIT = 6;       // Số tin nhắn lịch sử gửi vào context
const SEARCH_LIMIT = 5;        // Số sách tối đa trả về mỗi lần tìm
const FALLBACK_MSG = 'Xin lỗi bạn, mình đang gặp sự cố nhỏ. Bạn vui lòng thử lại nhé! 😊';

/* ─────────────────────────────────────────────────────────────────
   TOOL DEFINITIONS
───────────────────────────────────────────────────────────────── */
const tools = [
    {
        type: 'function',
        function: {
            name: 'search_books',
            description:
                'Tìm kiếm sách trong cơ sở dữ liệu. Trả về tên, tác giả, thể loại, giá gốc, giá khuyến mãi và tồn kho. ' +
                '🔴 QUAN TRỌNG: Nếu khách hỏi "có sách nào đang giảm giá/sale/khuyến mãi không?", BẮT BUỘC phải truyền chữ "sale" vào biến query.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description:
                            'Từ khóa tìm kiếm (tên sách, tác giả). Hoặc truyền đúng chữ "sale" nếu muốn lấy danh sách sách đang giảm giá.',
                    },
                },
                required: ['query'],
            },
        },
    },
];

/* ─────────────────────────────────────────────────────────────────
   TOOL EXECUTOR: search_books
───────────────────────────────────────────────────────────────── */
const executeSearchBooks = async (query) => {
    try {
        if (!query?.trim()) {
            return JSON.stringify({ message: 'Từ khóa tìm kiếm trống.' });
        }

        const original = query.trim();
        const noAccents = removeAccents(original);

        // ✨ LOGIC MỚI: Bắt từ khóa sale để lọc riêng sách giảm giá
        const isSaleQuery = ['sale', 'giam gia', 'khuyen mai', 'uu dai'].some(kw => noAccents.toLowerCase().includes(kw));

        let filter = {};

        if (isSaleQuery) {
            // Lọc ra những cuốn sách đang có giá khuyến mãi
            filter = {
                discountedPrice: { $ne: null, $gt: 0 }
            };
        } else {
            // Tìm kiếm bình thường theo tên/tác giả/thể loại
            filter = {
                $or: [
                    { title: { $regex: original, $options: 'i' } },
                    { author: { $regex: original, $options: 'i' } },
                    { genre: { $regex: original, $options: 'i' } },
                    { title: { $regex: noAccents, $options: 'i' } },
                    { author: { $regex: noAccents, $options: 'i' } },
                    { genre: { $regex: noAccents, $options: 'i' } },
                ],
            };
        }

        const books = await Book.find(filter)
            .limit(SEARCH_LIMIT)
            .lean();

        if (books.length === 0) {
            return JSON.stringify({
                message: isSaleQuery
                    ? `Hiện tại cửa hàng đang không có chương trình giảm giá nào.`
                    : `Không tìm thấy cuốn sách nào khớp với từ khóa "${query}".`,
            });
        }

        return JSON.stringify(
            books.map((b) => ({
                title: b.title,
                author: b.author,
                genre: b.genre,
                price: b.price,
                discountedPrice: b.discountedPrice ?? null,
                stock: b.stock,
                description: b.description?.slice(0, 150) ?? '',
            }))
        );
    } catch (error) {
        console.error('Lỗi khi tìm sách trong DB:', error);
        return JSON.stringify({ message: 'Lỗi hệ thống khi tìm sách.' });
    }
};
/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */

/**
 * Bỏ dấu tiếng Việt để tạo chuỗi tìm kiếm không dấu.
 * Chỉ dùng để tạo pattern phụ — KHÔNG thay thế bản gốc có dấu.
 */
const removeAccents = (str) =>
    str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim();

/**
 * Gọi AI với timeout — tránh treo request vô thời hạn.
 */
const callAI = (payload) =>
    Promise.race([
        openai.chat.completions.create(payload),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timed out')), AI_TIMEOUT_MS)
        ),
    ]);



/* ─────────────────────────────────────────────────────────────────
   SYSTEM PROMPT
───────────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `Bạn là trợ lý AI bán hàng nhiệt tình, am hiểu sách của nhà sách online.

QUY TẮC GIAO TIẾP:
- Luôn xưng "mình", gọi khách là "bạn". Trả lời ngắn gọn, thân thiện, có cảm xúc.
- Khi liệt kê sách: XUỐNG DÒNG và dùng gạch đầu dòng (-) hoặc đánh số (1., 2.).
- Dùng **tên sách in đậm** để khách dễ nhìn.

TÌM KIẾM & TƯ VẤN SẢN PHẨM:
- Nếu khách hỏi về sách, giá, tác giả, thể loại → BẮT BUỘC dùng tool search_books để tra kho.
- Sau khi có kết quả tool, phân tích và trả lời tự nhiên — đừng dump thô JSON ra.
- TUYỆT ĐỐI KHÔNG bịa tên sách, giá tiền, tác giả nếu không có trong kết quả tool.

XỬ LÝ GIÁ:
- Nếu sách có discountedPrice (khác null): đó là GIÁ SAU GIẢM — hãy thông báo đang có khuyến mãi và ưu tiên hiển thị giá này, kèm giá gốc bị gạch chân nếu muốn.
- Nếu discountedPrice = null: dùng price bình thường.

XỬ LÝ TỒN KHO:
- stock = 0: báo hết hàng, xin lỗi khéo léo và đề xuất tìm sách tương tự.
- stock > 0: có thể xác nhận còn hàng.

THÔNG TIN CỬA HÀNG:
- Phí ship: 40.000₫ toàn quốc.
- Thanh toán: COD hoặc VietQR/chuyển khoản.
- Cam kết: sách thật 100%, đóng gói cẩn thận.`;

/* ─────────────────────────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────────────────────────── */

exports.startConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) return res.status(404).json({ message: 'Không tìm thấy admin' });

        let conversation = await Conversation.findOne({
            participants: { $all: [userId, admin._id] },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [userId, admin._id],
            });
        }

        res.status(200).json(conversation);
    } catch (err) {
        res.status(500).json({ message: 'Không thể tạo cuộc trò chuyện', error: err.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const sender = req.user.id;
        const { conversationId, text } = req.body;

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) return res.status(404).json({ message: 'Không có admin' });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: 'Hội thoại không tồn tại' });

        // Lưu tin nhắn của user
        const userMessage = await Message.create({ conversationId, sender, text });
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: text,
            updatedAt: Date.now(),
        });

        let aiMessage = null;

        // Chỉ gọi AI khi: người gửi là user (không phải admin) VÀ bot đang bật
        if (sender !== admin._id.toString() && conversation.isBotActive) {
            // FIX: tăng lên 20 tin để AI giữ được ngữ cảnh dài hơn
            const history = await Message.find({ conversationId })
                .sort({ createdAt: -1 })
                .limit(HISTORY_LIMIT)
                .lean();

            history.reverse();

            const messages = [
                { role: 'system', content: SYSTEM_PROMPT },
                ...history.map((msg) => ({
                    role: msg.sender.toString() === admin._id.toString() ? 'assistant' : 'user',
                    content: msg.text,
                })),
            ];

            try {
                // --- Lần gọi AI thứ nhất ---
                const firstResponse = await callAI({
                    model: AI_MODEL,
                    messages,
                    tools,
                    tool_choice: 'auto',
                    temperature: 0.6,
                });

                let aiResponseMsg = firstResponse.choices[0].message;

                // Nếu AI muốn gọi tool → thực thi rồi gọi AI lần 2
                if (aiResponseMsg.tool_calls?.length > 0) {
                    messages.push(aiResponseMsg);

                    for (const toolCall of aiResponseMsg.tool_calls) {
                        if (toolCall.function.name === 'search_books') {
                            const args = JSON.parse(toolCall.function.arguments);
                            const dbResult = await executeSearchBooks(args.query);
                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                name: 'search_books',
                                content: dbResult,
                            });
                        }
                    }

                    // --- Lần gọi AI thứ hai (Sau khi có kết quả từ DB) ---
                    const stream = await openai.chat.completions.create({
                        model: AI_MODEL,
                        messages,
                        temperature: 0.6,
                        stream: true, // ✨ BẬT STREAMING
                    });

                    const io = req.app.get('io');
                    let aiText = "";

                    // Báo cho Frontend biết AI bắt đầu trả lời
                    if (io) io.emit('ai_start_typing', { conversationId });

                    // Hứng từng chữ một và bắn xuống Frontend
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || "";
                        if (content) {
                            aiText += content;
                            if (io) io.emit('ai_typing_chunk', { conversationId, content });
                        }
                    }

                    // Kết thúc gõ
                    if (io) io.emit('ai_finish_typing', { conversationId });

                    aiResponseMsg = { content: aiText }; // Gắn lại để code phía sau lưu vào DB
                }

                // FIX: fallback message thay vì im lặng khi content rỗng
                const aiText = aiResponseMsg.content?.trim() || FALLBACK_MSG;

                aiMessage = await Message.create({
                    conversationId,
                    sender: admin._id,
                    text: aiText,
                });

                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: aiText,
                    updatedAt: Date.now(),
                });

            } catch (aiError) {
                // FIX: ghi log chi tiết + vẫn gửi fallback về client thay vì im lặng
                console.error('Lỗi khi xử lý AI:', aiError.message);

                aiMessage = await Message.create({
                    conversationId,
                    sender: admin._id,
                    text: FALLBACK_MSG,
                });

                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: FALLBACK_MSG,
                    updatedAt: Date.now(),
                });
            }
        }

        res.status(201).json({ userMessage, aiMessage });

    } catch (err) {
        console.error('Lỗi gửi tin:', err);
        res.status(500).json({ message: 'Không thể gửi tin nhắn', error: err.message });
    }
};

exports.toggleBot = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { isBotActive } = req.body;

        const conversation = await Conversation.findByIdAndUpdate(
            conversationId,
            { isBotActive },
            { new: true }
        );

        res.status(200).json(conversation);
    } catch (err) {
        res.status(500).json({ message: 'Không thể cập nhật trạng thái bot', error: err.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
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
                match: { role: 'user' },
            });

        const result = [];
        for (const conv of conversations) {
            const user = conv.participants.find((p) => p?.role === 'user');
            if (!user) continue;

            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                sender: user._id,
                readBy: { $ne: adminId },
            });

            result.push({ ...conv.toObject(), participant: user, unreadCount });
        }

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: 'Không thể lấy danh sách cuộc trò chuyện', error: err.message });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const userConversations = await Conversation.find({ participants: userId }).select('_id');
        const conversationIds = userConversations.map((c) => c._id);

        const count = await Message.countDocuments({
            conversationId: { $in: conversationIds },
            sender: { $ne: userId },
            readBy: { $ne: userId },
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
                readBy: { $ne: userId },
            },
            { $push: { readBy: userId } }
        );

        res.json({ message: 'Đã đánh dấu là đã đọc' });
    } catch (err) {
        res.status(500).json({ message: 'Không thể cập nhật trạng thái đọc', error: err.message });
    }
};