const path = require('path');
const mongoose = require('mongoose');
const OpenAI = require('openai');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const Book = require('./models/Book');
const vietnameseTextPattern = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ]/;
const model = 'openai/gpt-4o-mini';

async function translateDescription(client, description) {
    const response = await client.chat.completions.create({
        model,
        temperature: 0,
        messages: [
            {
                role: 'system',
                content: 'Translate the supplied Vietnamese book description into natural English. Preserve its meaning and paragraph structure. Return only the translation.'
            },
            { role: 'user', content: description }
        ]
    });

    const translation = response.choices[0]?.message?.content?.trim();
    if (!translation) {
        throw new Error('The translation API returned an empty response.');
    }
    if (translation.length > 2000) {
        throw new Error(`The translated description exceeds the 2000-character limit (${translation.length}).`);
    }

    return translation;
}

async function translateVietnameseBookDescriptions() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI is not set in the backend environment.');
    }

    const execute = process.argv.includes('--execute');
    const apiKey = process.env.OPENAI_API_KEY;
    if (execute && !apiKey) {
        throw new Error('OPENAI_API_KEY is required to translate descriptions.');
    }

    await mongoose.connect(mongoUri);

    try {
        const books = await Book.find({ description: vietnameseTextPattern })
            .select('_id title description')
            .lean();

        console.log(`Found ${books.length} book(s) with Vietnamese-specific characters in the description.`);
        if (!execute) {
            for (const book of books) {
                console.log(`- ${book.title} (${book._id})`);
            }
            console.log('Dry run only. Re-run with --execute to translate and save these descriptions.');
            return;
        }

        const client = new OpenAI({
            apiKey,
            baseURL: 'https://openrouter.ai/api/v1'
        });
        let translatedCount = 0;
        let failedCount = 0;

        for (const book of books) {
            try {
                const description = await translateDescription(client, book.description);
                const result = await Book.updateOne(
                    { _id: book._id, description: book.description },
                    { $set: { description } }
                );

                if (result.modifiedCount !== 1) {
                    throw new Error('Description changed during translation; the result was not saved.');
                }

                translatedCount += 1;
                console.log(`Translated: ${book.title} (${book._id})`);
            } catch (error) {
                failedCount += 1;
                console.error(`Failed to translate ${book.title} (${book._id}):`, error.message);
            }
        }

        console.log(`Finished: ${translatedCount} translated, ${failedCount} failed.`);
        if (failedCount > 0) {
            process.exitCode = 1;
        }
    } finally {
        await mongoose.disconnect();
    }
}

translateVietnameseBookDescriptions().catch((error) => {
    console.error('Book description translation failed:', error);
    process.exitCode = 1;
});
