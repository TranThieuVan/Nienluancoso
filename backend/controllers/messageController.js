const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Book = require('../models/Book');
const Promotion = require('../models/Promotion');
const Voucher = require('../models/Voucher'); // ✅ THÊM MODEL VOUCHER CHO AI ĐỌC
const OpenAI = require('openai');

// ✅ KHỞI TẠO ĐỘNG ĐỂ CHẮC CHẮN LUÔN ĐỌC ĐƯỢC API KEY TỪ .ENV
const getOpenAI = () => {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
    });
};

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────── */
const AI_MODEL = 'openai/gpt-4o-mini';
const AI_TIMEOUT_MS = 15_000;
const HISTORY_LIMIT = 6;
const SEARCH_LIMIT = 5;
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
                'Tìm kiếm sách theo tên, tác giả, thể loại. ' +
                'Nếu khách hỏi sách đang giảm giá/sale/khuyến mãi → truyền "sale" vào query.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Từ khóa tìm kiếm (tên sách, tác giả, thể loại). Hoặc "sale" để lọc sách đang giảm giá.',
                    },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_books_by_price',
            description:
                'Lấy sách rẻ nhất HOẶC đắt nhất. ' +
                'DÙNG KHI khách hỏi "sách rẻ nhất", "sách đắt nhất", "giá cao nhất", "giá thấp nhất". ' +
                '⚠️ PHÂN BIỆT sort: "asc" = rẻ nhất, "desc" = đắt nhất. ' +
                '⚠️ PHÂN BIỆT price_type: "original" = theo giá gốc, "discounted" = theo giá KM (chỉ sách đang giảm giá).',
            parameters: {
                type: 'object',
                properties: {
                    price_type: {
                        type: 'string',
                        enum: ['original', 'discounted'],
                        description:
                            '"original": theo giá bán gốc. ' +
                            '"discounted": theo giá sau khi đã giảm (chỉ sách đang có KM).',
                    },
                    sort: {
                        type: 'string',
                        enum: ['asc', 'desc'],
                        description: '"asc" = rẻ nhất (giá thấp nhất). "desc" = đắt nhất (giá cao nhất).',
                    },
                    limit: {
                        type: 'number',
                        description: 'Số sách trả về. Mặc định 1 — chỉ trả 1 cuốn trừ khi khách yêu cầu nhiều hơn.',
                    },
                },
                required: ['price_type', 'sort'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_promotions',
            description:
                'Lấy danh sách chương trình khuyến mãi VÀ MÃ VOUCHER đang hoạt động (isActive=true). ' +
                'DÙNG KHI khách hỏi về chương trình KM, mã giảm giá, voucher, ưu đãi, sự kiện.',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
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

        const isSaleQuery = ['sale', 'giam gia', 'khuyen mai', 'uu dai'].some(kw =>
            noAccents.toLowerCase().includes(kw)
        );

        let filter = {};

        if (isSaleQuery) {
            filter = { discountedPrice: { $ne: null, $gt: 0 } };
        } else {
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

        const books = await Book.find(filter).limit(SEARCH_LIMIT).lean();

        if (books.length === 0) {
            return JSON.stringify({
                message: isSaleQuery
                    ? 'Hiện tại cửa hàng không có chương trình giảm giá nào.'
                    : `Không tìm thấy sách nào khớp với từ khóa "${query}".`,
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
        console.error('Lỗi search_books:', error);
        return JSON.stringify({ message: 'Lỗi hệ thống khi tìm sách.' });
    }
};

/* ─────────────────────────────────────────────────────────────────
   TOOL EXECUTOR: get_books_by_price 
───────────────────────────────────────────────────────────────── */
const executeGetBooksByPrice = async (price_type, sort = 'asc', limit = 1) => {
    try {
        const sortOrder = sort === 'desc' ? -1 : 1;
        let books;

        if (price_type === 'discounted') {
            books = await Book.find({ discountedPrice: { $ne: null, $gt: 0 } })
                .sort({ discountedPrice: sortOrder })
                .limit(limit)
                .lean();

            if (books.length === 0) {
                return JSON.stringify({ message: 'Hiện không có sách nào đang được khuyến mãi.' });
            }
        } else {
            books = await Book.find({ stock: { $gt: 0 } })
                .sort({ price: sortOrder })
                .limit(limit)
                .lean();

            if (books.length === 0) {
                return JSON.stringify({ message: 'Không tìm thấy sách nào.' });
            }
        }

        return JSON.stringify(
            books.map((b) => ({
                title: b.title,
                author: b.author,
                genre: b.genre,
                price: b.price,
                discountedPrice: b.discountedPrice ?? null,
                stock: b.stock,
            }))
        );
    } catch (error) {
        console.error('Lỗi get_books_by_price:', error);
        return JSON.stringify({ message: 'Lỗi hệ thống.' });
    }
};

/* ─────────────────────────────────────────────────────────────────
   TOOL EXECUTOR: get_promotions ✅ CẬP NHẬT ĐỌC CẢ VOUCHER
───────────────────────────────────────────────────────────────── */
const executeGetPromotions = async () => {
    try {
        const now = new Date();
        const promotions = await Promotion.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
        }).lean();

        const vouchers = await Voucher.find({ isActive: true }).lean();

        if (promotions.length === 0 && vouchers.length === 0) {
            return JSON.stringify({ message: 'Hiện không có chương trình khuyến mãi hay voucher nào đang hoạt động.' });
        }

        return JSON.stringify({
            message: "Danh sách khuyến mãi và Voucher hiện tại",
            promotions: promotions.map((p) => ({
                name: p.name,
                description: p.description,
                discountType: p.discountType,
                discountValue: p.discountValue,
                targetType: p.targetType,
                endDate: p.endDate,
            })),
            vouchers: vouchers.map((v) => ({
                code: v.code, // ĐÂY LÀ MÃ VOUCHER KHÁCH CẦN NHẬP
                discountType: v.discountType,
                discountValue: v.discountValue,
                remaining_usage: v.usageLimit - (v.usedCount || 0)
            }))
        });
    } catch (error) {
        console.error('Lỗi get_promotions:', error);
        return JSON.stringify({ message: 'Lỗi hệ thống khi lấy khuyến mãi.' });
    }
};

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const removeAccents = (str) =>
    str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim();

const callAI = (payload) =>
    Promise.race([
        getOpenAI().chat.completions.create(payload), // ✅ Dùng hàm khởi tạo động
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI request timed out')), AI_TIMEOUT_MS)
        ),
    ]);

/* ─────────────────────────────────────────────────────────────────
   SYSTEM PROMPT
───────────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `Bạn là trợ lý AI bán hàng của nhà sách online BookNest.

QUY TẮC GIAO TIẾP:
- Xưng "mình", gọi khách là "bạn". Thân thiện, tự nhiên.
- Trả lời NGẮN GỌN — tối đa 3-5 dòng. Không giải thích lan man, không thêm lời dẫn thừa.
- Liệt kê sách hoặc voucher: mỗi cuốn/mã 1 dòng, dùng (-). Tên sách in **đậm**.
- KHÔNG bịa tên sách, giá, tác giả, MÃ VOUCHER nếu không có trong kết quả tool.

PHÂN BIỆT GIÁ — RẤT QUAN TRỌNG:
- "sách rẻ nhất" / "giá thấp nhất" → get_books_by_price(price_type="original", sort="asc", limit=1)
- "sách đắt nhất" / "giá cao nhất" → get_books_by_price(price_type="original", sort="desc", limit=1)
- "sách KM rẻ nhất" / "sale rẻ nhất" → get_books_by_price(price_type="discounted", sort="asc", limit=1)
- Mặc định chỉ trả về 1 cuốn duy nhất, trừ khi khách yêu cầu "top 3", "vài cuốn"...
- Khi hiển thị sách có KM: ghi rõ "Giá gốc: X₫ → Giá KM: Y₫".

TÌM KIẾM SẢN PHẨM & ƯU ĐÃI:
- Khách hỏi về sách, giá, tác giả, thể loại → BẮT BUỘC dùng search_books.
- Khách hỏi chương trình khuyến mãi, VOUCHER, MÃ GIẢM GIÁ → dùng get_promotions.
- Nếu có mã voucher, hãy cung cấp mã Code và nhắc khách nhập ở trang Thanh Toán.

XỬ LÝ TỒN KHO:
- stock = 0 → báo hết hàng, gợi ý sách tương tự.
- stock > 0 → xác nhận còn hàng.

THÔNG TIN CỬA HÀNG:
- Phí ship: 40.000₫ toàn quốc. Thanh toán: COD hoặc VietQR.
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
        const io = req.app.get('io'); // Lấy IO để phát sự kiện Socket

        // ✅ Lấy thông tin người gửi để biết là User hay Admin
        const currentUser = await User.findById(sender);
        if (!currentUser) return res.status(404).json({ message: 'Người dùng không tồn tại' });
        const isSenderAdmin = currentUser.role === 'admin';

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) return res.status(404).json({ message: 'Không có admin' });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ message: 'Hội thoại không tồn tại' });

        // ✅ LOGIC XỬ LÝ NÚT GỌI NHÂN VIÊN (Dành riêng cho user)
        const isRequestingHuman = text === '[REQUEST_HUMAN]';
        const actualText = isRequestingHuman ? 'Mình muốn được nhân viên tư vấn trực tiếp.' : text;

        const userMessage = await Message.create({ conversationId, sender, text: actualText });
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: actualText,
            updatedAt: Date.now(),
        });

        // ✅ PHÂN LOẠI EMIT THEO ROLE ĐỂ NAVBAR ADMIN KHÔNG BỊ BÁO SAI
        if (isSenderAdmin) {
            // Admin nhắn -> Gửi cho User
            if (io) io.emit('new_message_user', { conversationId, sender, text: actualText, senderRole: 'admin' });
        } else {
            // User nhắn -> Báo cho Admin (ĐỂ TĂNG SỐ THÔNG BÁO)
            if (io) io.emit('new_message_admin', { conversationId, senderRole: 'user' });
        }

        // ✅ NẾU USER GỌI NHÂN VIÊN -> TẮT BOT & TRẢ LỜI TỰ ĐỘNG
        if (isRequestingHuman && !isSenderAdmin) {
            await Conversation.findByIdAndUpdate(conversationId, { isBotActive: false });
            if (io) io.emit('bot_status_changed', { conversationId, isBotActive: false });

            const sysMsg = await Message.create({
                conversationId,
                sender: admin._id,
                text: 'Hệ thống đã ghi nhận yêu cầu. Bạn vui lòng chờ một lát, nhân viên hỗ trợ sẽ phản hồi bạn ngay nhé! 👨‍💻'
            });

            if (io) io.emit('new_message_user', sysMsg);
            if (io) io.emit('new_message_admin', { conversationId, senderRole: 'bot' }); // Báo rõ là bot để Navbar bỏ qua

            return res.status(201).json({ userMessage, aiMessage: sysMsg });
        }

        let aiMessage = null;

        // ✅ QUAN TRỌNG: CHỈ CHO PHÉP AI TRẢ LỜI NẾU NGƯỜI GỬI KHÔNG PHẢI ADMIN & BOT ĐANG BẬT
        if (!isSenderAdmin && conversation.isBotActive) {
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
                const firstResponse = await callAI({
                    model: AI_MODEL,
                    messages,
                    tools,
                    tool_choice: 'auto',
                    temperature: 0.5,
                });

                let aiResponseMsg = firstResponse.choices[0].message;

                if (aiResponseMsg.tool_calls?.length > 0) {
                    messages.push(aiResponseMsg);

                    for (const toolCall of aiResponseMsg.tool_calls) {
                        let dbResult;

                        if (toolCall.function.name === 'search_books') {
                            const args = JSON.parse(toolCall.function.arguments);
                            dbResult = await executeSearchBooks(args.query);
                        } else if (toolCall.function.name === 'get_books_by_price') {
                            const args = JSON.parse(toolCall.function.arguments);
                            dbResult = await executeGetBooksByPrice(args.price_type, args.sort, args.limit);
                        } else if (toolCall.function.name === 'get_promotions') {
                            dbResult = await executeGetPromotions();
                        }

                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            name: toolCall.function.name,
                            content: dbResult,
                        });
                    }

                    const stream = await getOpenAI().chat.completions.create({
                        model: AI_MODEL,
                        messages,
                        temperature: 0.5,
                        stream: true,
                    });

                    let aiText = '';

                    if (io) io.emit('ai_start_typing', { conversationId });

                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            aiText += content;
                            if (io) io.emit('ai_typing_chunk', { conversationId, content });
                        }
                    }

                    if (io) io.emit('ai_finish_typing', { conversationId });

                    aiResponseMsg = { content: aiText };
                }

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

                // Socket gửi tới User và Admin (phân role bot để Navbar Admin lờ đi)
                if (io) io.emit('new_message_admin', { conversationId, senderRole: 'bot' });
                if (io) io.emit('new_message_user', aiMessage);

            } catch (aiError) {
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

                if (io) io.emit('new_message_admin', { conversationId, senderRole: 'bot' });
                if (io) io.emit('new_message_user', aiMessage);
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

        // ✅ Phát Socket để khách hàng đổi giao diện nút [REQUEST_HUMAN]
        const io = req.app.get('io');
        if (io) io.emit('bot_status_changed', { conversationId, isBotActive });

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