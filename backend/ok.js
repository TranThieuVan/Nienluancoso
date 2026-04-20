/**
 * Script: reEmbedAllBooks.js
 * Mục đích: Re-generate embedding cho toàn bộ sách trong DB
 *           với giới hạn 1500 ký tự (thay vì 500 cũ).
 *
 * Cách chạy (từ thư mục root của project):
 *   node scripts/reEmbedAllBooks.js
 *
 * Lưu ý:
 *   - Chạy 1 lần duy nhất sau khi cập nhật description.
 *   - Script xử lý tuần tự từng cuốn để không bị rate limit OpenAI.
 *   - Nếu bị ngắt giữa chừng, chạy lại — sách đã embed sẽ bị skip.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const OpenAI = require('openai');
const Book = require('./models/Book'); // ← Chỉnh đường dẫn nếu cần

// ✅ Dùng OpenRouter — vì OPENAI_API_KEY là sk-or-v1 (OpenRouter key)
// messageController cũng phải dùng OpenRouter cho embedding để vector cùng không gian
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

/* ─────────────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────────────── */
const CHAR_LIMIT = 1500;       // ✅ Tăng từ 500 lên 1500
const DELAY_MS = 300;          // Delay giữa mỗi lần gọi API — tránh rate limit
const FORCE_REEMBED = true;    // true = re-embed kể cả sách đã có embedding

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const normalize = (text) => (text || '').toLowerCase().replace(/\s+/g, ' ').trim();

const buildTextToEmbed = (book) => {
    let description = normalize(book.description);

    // Fallback nếu description quá ngắn
    if (!description || description.length < 30) {
        description = `sách thể loại ${book.genre || 'chưa rõ'} của ${book.author || 'chưa rõ'}`;
    }

    // Boost title và genre bằng cách lặp 2 lần (giữ nguyên logic gốc)
    const text = `
        tên sách: ${normalize(book.title)}
        tên sách: ${normalize(book.title)}
        thể loại: ${normalize(book.genre)}
        thể loại: ${normalize(book.genre)}
        tác giả: ${normalize(book.author)}
        mô tả: ${description}
    `;

    return {
        textToEmbed: text.slice(0, CHAR_LIMIT), // ✅ 1500 thay vì 500
        enrichedDescription: description
    };
};

/* ─────────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────────── */
const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected\n');

    // Lấy tất cả sách kèm embedding (select: false nên cần +embedding)
    const books = await Book.find({}).select('+embedding').lean();
    console.log(`📚 Tổng số sách: ${books.length}`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        const label = `[${i + 1}/${books.length}] "${book.title}"`;

        // Skip nếu đã có embedding VÀ không force re-embed
        if (!FORCE_REEMBED && book.embedding?.length > 0) {
            console.log(`⏭️  ${label} — đã có embedding, bỏ qua`);
            skipCount++;
            continue;
        }

        try {
            const { textToEmbed, enrichedDescription } = buildTextToEmbed(book);

            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: textToEmbed,
            });

            const embedding = response.data[0].embedding;

            await Book.findByIdAndUpdate(book._id, {
                embedding,
                description: enrichedDescription,
                embeddingUpdatedAt: new Date(),
                embeddingVersion: (book.embeddingVersion || 1) + 1,
            });

            console.log(`✅ ${label} — embed thành công (${embedding.length} dims)`);
            successCount++;

            await sleep(DELAY_MS); // Tránh rate limit
        } catch (err) {
            console.error(`❌ ${label} — lỗi: ${err.message}`);
            errorCount++;
            await sleep(1000); // Đợi lâu hơn nếu có lỗi
        }
    }

    console.log('\n════════════════════════════════');
    console.log(`✅ Thành công : ${successCount}`);
    console.log(`⏭️  Bỏ qua    : ${skipCount}`);
    console.log(`❌ Lỗi       : ${errorCount}`);
    console.log('════════════════════════════════');

    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối MongoDB');
};

run().catch(err => {
    console.error('💥 Script crash:', err);
    process.exit(1);
});