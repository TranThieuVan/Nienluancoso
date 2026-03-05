import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1", // 👈 BẮT BUỘC với OpenRouter
});

async function test() {
    try {
        const response = await openai.chat.completions.create({
            model: "openai/gpt-3.5-turbo", // model free phổ biến trên OpenRouter
            messages: [
                { role: "user", content: "Hello AI" }
            ],
        });

        console.log(response.choices[0].message);
    } catch (err) {
        console.error("Lỗi:", err);
    }
}

test();