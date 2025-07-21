const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema(
    {
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        lastMessage: { type: String }
        // ❌ Không cần khai báo updatedAt
    },
    { timestamps: true } // sẽ tự thêm createdAt và updatedAt
)

module.exports = mongoose.model('Conversation', conversationSchema)
