const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Book = require('../models/Book');
const Promotion = require('../models/Promotion'); // ✅ Fix: thiếu import này khiến executeGetPromotions crash
const Voucher = require('../models/Voucher');
const OpenAI = require('openai');
const Order = require('../models/Order');
const PricingService = require('../services/pricingService');
const mongoose = require('mongoose');

// ✅ Dùng OpenRouter cho cả chat lẫn embedding 
const getOpenAI = () => new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

// Embedding cũng qua OpenRouter — phải cùng endpoint với script reEmbedAllBooks
// để book vector và query vector nằm cùng không gian toán học
const getOpenAIEmbedding = () => new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────── */
const AI_MODEL = 'openai/gpt-4o-mini';
const AI_TIMEOUT_MS = 15_000;
const HISTORY_LIMIT = 4;
const SEARCH_LIMIT = 5;
const FALLBACK_MSG = 'Xin lỗi bạn, mình đang gặp sự cố nhỏ. Bạn vui lòng thử lại nhé! 😊';

let _promotionCache = null;
let _promotionCacheAt = 0;
const PROMOTION_CACHE_TTL = 30_000;

exports.clearBotCache = () => {
    _promotionCache = null;
    _promotionCacheAt = 0;
};

/* ─────────────────────────────────────────────────────────────────
   TOOL DEFINITIONS
───────────────────────────────────────────────────────────────── */
const tools = [
    {
        type: 'function',
        function: {
            name: 'search_books',
            description:
                'Tìm kiếm sách TẤT CẢ TRONG MỘT. ' +
                'Dùng khi khách hỏi tên sách, tác giả, thể loại, nhà xuất bản (NXB), HOẶC mô tả cốt truyện (VD: "siêu anh hùng", "tình yêu"). ' +
                'Tool này đã tích hợp sẵn cả tìm kiếm chính xác và tìm kiếm mờ. ' +
                'LƯU Ý: Nếu khách hỏi sách sale/khuyến mãi → truyền "sale" vào query.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Từ khóa hoặc nguyên câu mô tả của khách.' },
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
                'Có thể lọc theo thể loại HOẶC nhà xuất bản (NXB) nếu khách chỉ định (VD: "rẻ nhất thể loại tình cảm", "đắt nhất truyện kinh dị"). ' +
                'Truyền genre là từ khóa thể loại của khách — không cần chính xác 100%, hệ thống tự match mờ.',
            parameters: {
                type: 'object',
                properties: {
                    price_type: { type: 'string', enum: ['original', 'discounted'] },
                    sort: { type: 'string', enum: ['asc', 'desc'] },
                    limit: { type: 'number' },
                    genre: {
                        type: 'string',
                        description: 'Thể loại khách muốn lọc. Truyền nguyên từ khóa của khách, VD: "tình cảm", "kinh dị", "viễn tưởng". Bỏ qua nếu khách không đề cập thể loại.'
                    },
                    publisher: { // ✅ BỔ SUNG THÊM THAM SỐ NÀY
                        type: 'string',
                        description: 'Nhà xuất bản khách muốn lọc (VD: "nxb trẻ", "kim đồng"). Bỏ qua nếu không đề cập.'
                    }
                },
                required: ['price_type', 'sort'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_promotions',
            description: 'Lấy danh sách khuyến mãi, sự kiện và MÃ VOUCHER đang hoạt động.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_recent_orders',
            description: 'Lấy danh sách 5 đơn hàng gần nhất của khách (check trạng thái đơn, tiền hoàn).',
            parameters: { type: 'object', properties: {} },
        },
    },
];

/* ─────────────────────────────────────────────────────────────────
   TOOL EXECUTORS
───────────────────────────────────────────────────────────────── */
const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').trim();

const executeSearchBooks = async (query) => {
    try {
        if (!query?.trim()) return JSON.stringify({ message: 'Từ khóa tìm kiếm trống.' });
        const original = query.trim();
        const normalizedQuery = original.replace(/nhà xuất bản|nha xuat ban/gi, 'nxb');
        const noAccents = removeAccents(original);
        const isSaleQuery = ['sale', 'giam gia', 'khuyen mai', 'uu dai'].some(kw => noAccents.toLowerCase().includes(kw));

        if (isSaleQuery) {
            const allBooks = await Book.find({ stock: { $gt: 0 } }).lean();
            const priced = PricingService.applyPricing(allBooks);
            const books = priced.filter(b => b.discountedPrice !== null).slice(0, SEARCH_LIMIT);
            if (books.length === 0) return JSON.stringify({ message: 'Hiện tại cửa hàng không có chương trình giảm giá nào.' });
            return JSON.stringify(books.map(b => ({
                title: b.title, author: b.author, genre: b.genre, price: b.price, discountedPrice: b.discountedPrice, stock: b.stock
            })));
        }

        // BƯỚC 1: TÌM KIẾM CƠ BẢN (Lọc từ rác & Collation Không Dấu)
        const stopWords = ['sach', 'cuon', 'quyen', 'tap', 'bo', 'tim', 'cho', 'toi', 'shop', 'co', 'ban', 'khong', 've', 'giup', 'nhe', 'a', 'tua', 'de', 'ten', 'la', 'oi', 'hoi', 'muon', 'cua', 'nhung', 'cac'];
        const originalKeywords = original.split(/\s+/).filter(kw => kw.length > 0);
        const keywords = originalKeywords.filter(kw => !stopWords.includes(removeAccents(kw).toLowerCase()));

        if (keywords.length > 0) {
            const searchConditions = keywords.map(kw => ({
                $or: [
                    { title: { $regex: kw, $options: 'i' } },
                    { author: { $regex: kw, $options: 'i' } },
                    { genre: { $regex: kw, $options: 'i' } },
                    { publisher: { $regex: kw, $options: 'i' } } // ✅ BỔ SUNG TRƯỜNG NXB VÀO ĐÂY
                ]
            }));

            const rawBooks = await Book.find({ $and: searchConditions })
                .collation({ locale: 'vi', strength: 1 })
                .limit(SEARCH_LIMIT)
                .lean();

            if (rawBooks.length > 0) {
                const books = PricingService.applyPricing(rawBooks);
                return JSON.stringify(books.map((b) => ({
                    title: b.title, author: b.author, genre: b.genre, price: b.price,
                    discountedPrice: b.discountedPrice, stock: b.stock, description: b.description?.slice(0, 80) ?? ''
                })));
            }
        }

        // BƯỚC 2: TỰ ĐỘNG CHUYỂN SANG TÌM MỜ (VECTOR SEMANTIC SEARCH)
        // Nếu tên không khớp 100% hoặc sai chính tả, tự động quăng nguyên câu gốc vào Vector để so sánh độ tương đồng
        return await executeSemanticSearch(original);

    } catch (error) { return JSON.stringify({ message: 'Lỗi hệ thống khi tìm sách.' }); }
};

const executeGetBooksByPrice = async (price_type, sort = 'asc', limit = 1, genre = null, publisher = null) => {
    try {
        const sortOrder = sort === 'desc' ? -1 : 1;
        const baseFilter = { stock: { $gt: 0 } };

        // 1. Xử lý Thể loại (Genre)
        if (genre?.trim()) {
            baseFilter.genre = { $regex: genre.trim(), $options: 'i' };
        }

        // 2. Xử lý Nhà xuất bản (Publisher) kèm trick chuẩn hóa
        if (publisher?.trim()) {
            const normalizedPublisher = publisher.replace(/nhà xuất bản|nha xuat ban/gi, 'nxb').trim();
            baseFilter.publisher = { $regex: normalizedPublisher, $options: 'i' };
        }

        // 3. Bật Collation nếu có bất kỳ điều kiện lọc chữ nào (để tìm không dấu)
        const collation = (genre?.trim() || publisher?.trim()) ? { locale: 'vi', strength: 1 } : undefined;

        // Hàm tạo câu thông báo lỗi tự nhiên cho AI
        const getErrorMessage = (isDiscounted) => {
            let msg = isDiscounted ? 'Hiện không có sách ' : 'Không tìm thấy sách ';
            if (genre && publisher) msg += `thể loại "${genre}" của "${publisher}"`;
            else if (genre) msg += `thể loại "${genre}"`;
            else if (publisher) msg += `thuộc "${publisher}"`;
            else msg += 'nào';

            msg += isDiscounted ? ' đang khuyến mãi.' : '.';
            return msg;
        };

        let books;
        if (price_type === 'discounted') {
            // Luồng 1: Tìm sách đang Khuyến Mãi
            const query = Book.find(baseFilter);
            if (collation) query.collation(collation);
            const allBooks = await query.lean();

            const priced = PricingService.applyPricing(allBooks);
            books = priced
                .filter(b => b.discountedPrice !== null)
                .sort((a, b) => sortOrder === 1 ? a.discountedPrice - b.discountedPrice : b.discountedPrice - a.discountedPrice)
                .slice(0, limit);

            if (books.length === 0) return JSON.stringify({ message: getErrorMessage(true) });
        } else {
            // Luồng 2: Tìm sách giá thường (Mắc nhất / Rẻ nhất)
            const query = Book.find(baseFilter).sort({ price: sortOrder }).limit(limit);
            if (collation) query.collation(collation);
            const rawBooks = await query.lean();

            if (rawBooks.length === 0) return JSON.stringify({ message: getErrorMessage(false) });
            books = PricingService.applyPricing(rawBooks);
        }

        // Trả về cho AI (Thêm trường publisher để AI có thông tin chém gió với khách)
        return JSON.stringify(books.map((b) => ({
            title: b.title,
            author: b.author,
            genre: b.genre,
            publisher: b.publisher,
            price: b.price,
            discountedPrice: b.discountedPrice,
            stock: b.stock
        })));
    } catch (error) {
        console.error("Lỗi executeGetBooksByPrice:", error);
        return JSON.stringify({ message: 'Lỗi hệ thống khi lọc sách theo giá.' });
    }
};

const executeGetPromotions = async () => {
    try {
        const now = Date.now();
        if (_promotionCache && (now - _promotionCacheAt) < PROMOTION_CACHE_TTL) return _promotionCache;

        const nowDate = new Date();
        const promotions = await Promotion.find({ isActive: true, startDate: { $lte: nowDate }, endDate: { $gte: nowDate } }).lean();
        const vouchers = await Voucher.find({ isActive: true, startDate: { $lte: nowDate }, expirationDate: { $gte: nowDate } }).lean();

        if (promotions.length === 0 && vouchers.length === 0) {
            const emptyMsg = JSON.stringify({ message: 'Hiện không có chương trình khuyến mãi hay voucher nào.' });
            _promotionCache = emptyMsg; _promotionCacheAt = now; return emptyMsg;
        }

        const result = JSON.stringify({
            promotions: promotions.map((p) => ({
                type: 'Chương trình khuyến mãi', // ✅ Label rõ ràng cho AI
                name: p.name,
                discountType: p.discountType,
                discountValue: p.discountValue,
                endDate: p.endDate
            })),
            vouchers: vouchers.map((v) => ({
                type: 'Mã giảm giá (voucher)', // ✅ Label rõ ràng cho AI
                code: v.code,
                discountType: v.discountType,
                discountValue: v.discountValue,
                remaining_usage: v.usageLimit - (v.usedCount || 0)
            }))
        });

        _promotionCache = result; _promotionCacheAt = now; return result;
    } catch (error) { return JSON.stringify({ message: 'Lỗi hệ thống.' }); }
};

const executeGetRecentOrders = async (userId) => {
    try {
        const ACTIVE_STATUSES = [
            'pending', 'confirmed', 'delivering', 'delivered',
            'failed_delivery', 'return_requested', 'return_approved', 'returning'
        ];
        const DONE_STATUSES = ['completed', 'returned', 'cancelled'];
        const DONE_WITHIN_DAYS = 30;
        const MAX_ORDERS = 5;

        const translateStatus = (s) => ({
            pending: 'Đang xử lý',
            confirmed: 'Đã xác nhận',
            delivering: 'Đang giao hàng',
            delivered: 'Đã giao (chờ bạn xác nhận)',
            completed: 'Hoàn tất',
            failed_delivery: 'Giao thất bại',
            return_requested: 'Yêu cầu trả hàng',
            return_approved: 'Shop đã duyệt trả hàng',
            returning: 'Đang hoàn về kho',
            returned: 'Đã trả hàng',
            cancelled: 'Đã hủy'
        }[s] || s);

        const formatOrder = (o) => ({
            orderId: o._id.toString().slice(-6).toUpperCase(),
            orderDate: new Date(o.createdAt).toLocaleDateString('vi-VN'),
            status: translateStatus(o.status),
            paymentStatus: o.paymentStatus || 'Chưa thanh toán',
            totalPrice: o.totalPrice,
            items: o.items.map(i => `${i.book?.title || 'Sách'} x${i.quantity}`).join(', ')
        });

        // Nhóm 1: Đơn đang active — không giới hạn thời gian
        const activeOrders = await Order.find({ user: userId, status: { $in: ACTIVE_STATUSES } })
            .sort({ createdAt: -1 })
            .limit(MAX_ORDERS)
            .populate('items.book', 'title')
            .lean();

        if (activeOrders.length > 0) {
            return JSON.stringify({
                note: 'Đơn hàng đang xử lý',
                orders: activeOrders.map(formatOrder)
            });
        }

        // Nhóm 2: Không có active → lấy đơn đã xong trong 30 ngày gần nhất
        const since = new Date();
        since.setDate(since.getDate() - DONE_WITHIN_DAYS);

        const doneOrders = await Order.find({
            user: userId,
            status: { $in: DONE_STATUSES },
            createdAt: { $gte: since }
        })
            .sort({ createdAt: -1 })
            .limit(MAX_ORDERS)
            .populate('items.book', 'title')
            .lean();

        if (doneOrders.length > 0) {
            return JSON.stringify({
                note: `Không có đơn đang xử lý. Dưới đây là đơn hàng trong ${DONE_WITHIN_DAYS} ngày gần nhất`,
                orders: doneOrders.map(formatOrder)
            });
        }

        return JSON.stringify({ message: 'Bạn không có đơn hàng nào đang xử lý hoặc trong 30 ngày gần đây.' });

    } catch (error) {
        console.error('Lỗi get_recent_orders:', error);
        return JSON.stringify({ message: 'Lỗi hệ thống khi lấy đơn hàng.' });
    }
};

// Tính Vector Similarity
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) { dot += vecA[i] * vecB[i]; normA += vecA[i] * vecA[i]; normB += vecB[i] * vecB[i]; }
    return (!normA || !normB) ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Tìm kiếm mờ
const executeSemanticSearch = async (description) => {
    try {
        if (!description?.trim()) return JSON.stringify({ message: 'Mô tả tìm kiếm trống.' });

        const embeddingResponse = await getOpenAIEmbedding().embeddings.create({
            model: 'text-embedding-3-small',
            input: description.trim().slice(0, 300),
        });
        const queryVector = embeddingResponse.data[0].embedding;

        const books = await Book.find({ stock: { $gt: 0 } }).select('+embedding').lean();
        const booksWithEmbedding = books.filter(b => b.embedding?.length > 0);

        if (booksWithEmbedding.length === 0) return JSON.stringify({ message: 'Chưa có dữ liệu embedding.' });

        // Ngưỡng 0.5 — đủ rộng để bắt được sách liên quan gần, không trả rác
        const SIMILARITY_THRESHOLD = 0.5;
        const RECOMMEND_LIMIT = 3; // ✅ Top 3 cho use case recommend theo mô tả
        const scored = booksWithEmbedding
            .map(b => ({ ...b, score: cosineSimilarity(queryVector, b.embedding) }))
            .filter(b => b.score >= SIMILARITY_THRESHOLD)
            .sort((a, b) => b.score - a.score)
            .slice(0, RECOMMEND_LIMIT);

        if (scored.length === 0) return JSON.stringify({ message: `Xin lỗi, hiện tại mình chưa tìm thấy cuốn sách nào phù hợp với mô tả "${description}".` });

        const priced = PricingService.applyPricing(scored);
        return JSON.stringify({
            type: 'recommendation', // ✅ Đánh dấu để AI biết đây là kết quả recommend, cần giới thiệu ngắn
            results: priced.map(b => ({
                title: b.title,
                author: b.author,
                genre: b.genre,
                price: b.price,
                discountedPrice: b.discountedPrice,
                stock: b.stock,
                description: b.description?.slice(0, 150) ?? '' // ✅ Tăng từ 80 → 150 để AI có đủ ngữ cảnh giới thiệu
            }))
        });
    } catch (error) { return JSON.stringify({ message: 'Lỗi hệ thống khi tìm kiếm theo mô tả.' }); }
};

/* ─────────────────────────────────────────────────────────────────
   SYSTEM PROMPT
───────────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của nhà sách BookNest.

QUY TẮC GIAO TIẾP:
- Xưng "mình", gọi khách là "bạn". Thân thiện, tự nhiên.
- Trả lời NGẮN GỌN. Không giải thích lan man, không hỏi thêm khi không cần thiết.
- KHÔNG tự bịa tên sách, giá, tác giả nếu tool không trả về.

LIỆT KÊ SÁCH THÔNG THƯỜNG (tìm theo tên/tác giả/thể loại):
- Mỗi cuốn 1 dòng, dùng (-). Tên sách in **đậm**. Tối đa 5 dòng.

GỢI Ý SÁCH THEO MÔ TẢ (kết quả có type="recommendation"):
- Giới thiệu từng cuốn ngắn gọn: tên **đậm**, tác giả, 1 câu mô tả nội dung tại sao phù hợp, giá.
- Tối đa 3 cuốn, mỗi cuốn 2-3 dòng. Kết thúc bằng 1 câu mời xem thêm.

TÌM KIẾM SẢN PHẨM:
- Bất kể khách gõ sai chính tả, viết tắt, hay mô tả nội dung ("sách du hành vũ trụ", "truyện về tình yêu") → LUÔN gọi 'search_books' và truyền nguyên câu vào. Hệ thống tự động tìm chính xác hoặc gợi ý tương đối.

THÔNG TIN VÀ XỬ LÝ KHÁC:
- Phí ship: 40.000₫ toàn quốc. Thanh toán: COD, Chuyển khoản, VNPAY.
- Đơn hàng: Dùng 'get_recent_orders' nếu khách hỏi tình trạng đơn, duyệt chưa, hoàn tiền chưa.
- Khuyến mãi/voucher: Dùng 'get_promotions'. Khi trả lời PHẢI tách thành 2 nhóm rõ ràng:
  + 🎉 Chương trình khuyến mãi: liệt kê các promotion (tự động áp dụng, không cần nhập mã).
  + 🎟️ Mã giảm giá: liệt kê voucher kèm mã code, nhắc khách nhập ở trang Thanh Toán.`;

/* ─────────────────────────────────────────────────────────────────
   EXPORTS
───────────────────────────────────────────────────────────────── */
const callAI = (payload) => Promise.race([
    getOpenAI().chat.completions.create(payload),
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI request timed out')), AI_TIMEOUT_MS))
]);

exports.startConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) return res.status(404).json({ message: 'Không tìm thấy admin' });

        let conversation = await Conversation.findOne({ participants: { $all: [userId, admin._id] } });
        if (!conversation) conversation = await Conversation.create({ participants: [userId, admin._id] });
        res.status(200).json(conversation);
    } catch (err) { res.status(500).json({ message: 'Lỗi tạo chat', error: err.message }); }
};

exports.sendMessage = async (req, res) => {
    try {
        const sender = req.user.id;
        const { conversationId, text } = req.body;
        const io = req.app.get('io');

        const currentUser = await User.findById(sender);
        if (!currentUser) {
            return res.status(404).json({ message: 'User không tồn tại' });
        }

        const isStaff = currentUser.role === 'admin' || currentUser.role === 'employee';
        const admin = await User.findOne({ role: 'admin' });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: 'Hội thoại không tồn tại' });
        }

        const isRequestingHuman = text === '[REQUEST_HUMAN]';
        const actualText = isRequestingHuman
            ? 'Mình muốn được nhân viên tư vấn trực tiếp.'
            : text;

        // 🟢 1. USER/ADMIN MESSAGE
        const userMessage = await Message.create({
            conversationId,
            sender,
            text: actualText
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: actualText,
            updatedAt: Date.now()
        });

        // 🔥 REAL-TIME: Gửi tin nhắn cho cả Admin và User
        if (io) {
            // Lấy toàn bộ object tin nhắn và thêm role để Frontend dễ style (màu sắc, vị trí trái/phải)
            const messageData = {
                ...userMessage.toObject(),
                senderRole: currentUser.role
            };
            io.emit('new_message_user', messageData);
            io.emit('new_message_admin', messageData);
        }

        // 🟡 2. REQUEST HUMAN
        if (isRequestingHuman && !isStaff) {
            await Conversation.findByIdAndUpdate(conversationId, { isBotActive: false });

            // 🔥 Cập nhật trạng thái Bot realtime cho Admin
            if (io) {
                io.emit('bot_status_changed', {
                    conversationId,
                    isBotActive: false
                });
            }

            const sysMsg = await Message.create({
                conversationId,
                sender: admin._id,
                text: 'Hệ thống đã ghi nhận yêu cầu. Bạn vui lòng chờ một lát, nhân viên sẽ phản hồi ngay nhé! 👨‍💻'
            });

            if (io) {
                const sysMsgData = { ...sysMsg.toObject(), senderRole: 'bot' };
                io.emit('new_message_user', sysMsgData);
                io.emit('new_message_admin', sysMsgData);
            }

            return res.status(201).json({ userMessage, aiMessage: sysMsg });
        }

        // 🤖 3. AI RESPONSE
        let aiMessage = null;

        if (!isStaff && conversation.isBotActive) {
            try {
                const history = await Message.find({ conversationId })
                    .sort({ createdAt: -1 })
                    .limit(HISTORY_LIMIT)
                    .lean();

                history.reverse();

                const messages = [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...history.map((msg) => ({
                        role: (msg.sender.toString() === admin._id.toString()) ? 'assistant' : 'user',
                        content: msg.text
                    })),
                ];

                const firstResponse = await callAI({
                    model: AI_MODEL,
                    messages,
                    tools,
                    tool_choice: 'auto',
                    temperature: 0.2,
                    max_tokens: 400
                });

                let aiResponseMsg = firstResponse.choices[0].message;

                if (aiResponseMsg.tool_calls?.length > 0) {
                    messages.push(aiResponseMsg);

                    for (const toolCall of aiResponseMsg.tool_calls) {
                        let dbResult;

                        if (toolCall.function.name === 'search_books') {
                            dbResult = await executeSearchBooks(JSON.parse(toolCall.function.arguments).query);
                        } else if (toolCall.function.name === 'get_books_by_price') {
                            const args = JSON.parse(toolCall.function.arguments);
                            dbResult = await executeGetBooksByPrice(
                                args.price_type,
                                args.sort,
                                args.limit,
                                args.genre,
                                args.publisher
                            );
                        } else if (toolCall.function.name === 'get_promotions') {
                            dbResult = await executeGetPromotions();
                        } else if (toolCall.function.name === 'get_recent_orders') {
                            dbResult = await executeGetRecentOrders(sender);
                        }

                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            name: toolCall.function.name,
                            content: dbResult
                        });
                    }

                    const finalResponse = await callAI({
                        model: AI_MODEL,
                        messages,
                        temperature: 0.2,
                        max_tokens: 500
                    });

                    aiResponseMsg = finalResponse.choices[0].message;
                }

                const aiText = aiResponseMsg.content?.trim() || FALLBACK_MSG;

                aiMessage = await Message.create({
                    conversationId,
                    sender: admin._id,
                    text: aiText
                });

                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: aiText,
                    updatedAt: Date.now()
                });

                // 🔥 REAL-TIME BOT RESPONSE
                if (io) {
                    const botMsgData = { ...aiMessage.toObject(), senderRole: 'bot' };
                    io.emit('new_message_user', botMsgData);
                    io.emit('new_message_admin', botMsgData);
                }

            } catch (err) {
                console.error("Lỗi AI:", err.message);
            }
        }

        return res.status(201).json({ userMessage, aiMessage });

    } catch (err) {
        return res.status(500).json({
            message: 'Lỗi server',
            error: err.message
        });
    }
};

exports.toggleBot = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { isBotActive } = req.body;
        const conversation = await Conversation.findByIdAndUpdate(conversationId, { isBotActive }, { new: true });
        const io = req.app.get('io');
        if (io) io.emit('bot_status_changed', { conversationId, isBotActive });
        res.status(200).json(conversation);
    } catch (err) { res.status(500).json({ message: 'Không thể cập nhật trạng thái bot', error: err.message }); }
};

exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).populate('sender', 'name role');
        res.status(200).json(messages);
    } catch (err) { res.status(500).json({ message: 'Không thể lấy tin nhắn', error: err.message }); }
};

exports.getAllConversations = async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const userRole = req.user.role;
        if (userRole !== 'admin' && userRole !== 'employee') return res.status(403).json({ message: 'Không có quyền truy cập' });

        const conversations = await Conversation.find().sort({ updatedAt: -1 }).populate({ path: 'participants', select: 'name role avatar', match: { role: 'user' } });

        const conversationsWithCustomers = [];
        for (const conv of conversations) {
            const customer = conv.participants.find((p) => p && p.role === 'user');
            if (!customer) continue;
            conversationsWithCustomers.push({ conversation: conv, customer });
        }

        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    conversationId: { $in: conversationsWithCustomers.map(({ conversation }) => conversation._id) },
                    sender: { $in: conversationsWithCustomers.map(({ customer }) => customer._id) },
                    readBy: { $ne: new mongoose.Types.ObjectId(currentUserId) }
                }
            },
            { $group: { _id: { conversationId: '$conversationId', sender: '$sender' }, count: { $sum: 1 } } }
        ]);
        const unreadCountByConversationAndSender = new Map(
            unreadCounts.map(({ _id, count }) => [`${_id.conversationId}:${_id.sender}`, count])
        );
        const result = conversationsWithCustomers.map(({ conversation, customer }) => ({
            ...conversation.toObject(),
            participant: customer,
            unreadCount: unreadCountByConversationAndSender.get(`${conversation._id}:${customer._id}`) || 0
        }));

        res.status(200).json(result);
    } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const conversationIds = (await Conversation.find({ participants: userId }).select('_id')).map(c => c._id);
        const count = await Message.countDocuments({ conversationId: { $in: conversationIds }, sender: { $ne: userId }, readBy: { $ne: userId } });
        res.json({ unreadCount: count });
    } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
};

exports.getAdminUnreadCount = async (req, res) => {
    try {
        const adminId = req.user.id;
        // Quét TOÀN BỘ hệ thống: Đếm các tin nhắn không phải do Admin này gửi và Admin này chưa đọc
        const count = await Message.countDocuments({
            sender: { $ne: adminId },
            readBy: { $ne: adminId }
        });
        res.json({ unreadCount: count });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};

exports.markMessagesAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        await Message.updateMany({ conversationId, sender: { $ne: userId }, readBy: { $ne: userId } }, { $push: { readBy: userId } });
        res.json({ message: 'Đã đánh dấu là đã đọc' });
    } catch (err) { res.status(500).json({ message: 'Lỗi server', error: err.message }); }
};

exports.deleteAllConversations = async (req, res) => {
    try {
        await Message.deleteMany({});
        await Conversation.deleteMany({});
        res.json({ message: 'Đã dọn dẹp sạch sẽ toàn bộ hội thoại và tin nhắn thành công! 🧹' });
    } catch (err) { res.status(500).json({ message: 'Không thể xóa dữ liệu', error: err.message }); }
};