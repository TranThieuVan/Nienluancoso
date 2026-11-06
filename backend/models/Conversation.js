const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema(
    {
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        lastMessage: { type: String },
        isBotActive: { type: Boolean, default: true } // ✨ Cờ đánh dấu AI đang bật hay tắt
    },
    { timestamps: true }
)

conversationSchema.index({ participants: 1, updatedAt: -1 })
conversationSchema.index({ updatedAt: -1 })

module.exports = mongoose.model('Conversation', conversationSchema)