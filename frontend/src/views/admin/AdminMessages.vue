<template>
  <div class="flex bg-white" style="height: calc(100vh - 50px);">
    <!-- 🔹 Sidebar: danh sách hội thoại -->
    <div class="w-1/3 border-r overflow-y-auto p-4">
      <h2 class="text-xl font-bold mb-4">Khách hàng</h2>

      <div
        v-for="conv in conversations"
        :key="conv._id"
        @click="selectConversation(conv)"
        :class="[ 
          'p-3 rounded cursor-pointer hover:bg-gray-100 flex items-center justify-between',
          selectedConversation?._id === conv._id ? 'bg-gray-200' : ''
        ]"
      >
        <div class="flex items-center gap-3">
          <img
            :src="`/${conv.participants[0]?.avatar}`"
            class="w-8 h-8 rounded-full object-cover"
          />
          <span class="truncate">
            {{ conv.participant?.name || 'Người dùng' }}
          </span>
        </div>

        <!-- 🔴 Badge tin nhắn chưa đọc -->
        <span
          v-if="conv.unreadCount && conv.unreadCount > 0"
          class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full"
        >
          {{ conv.unreadCount }}
        </span>
      </div>
    </div>

    <!-- 🔸 Main chat area -->
    <div class="w-2/3 flex flex-col">
      <div class="p-4 border-b font-bold text-lg bg-gray-50">
        {{ selectedConversation?.participant?.name || 'Chọn hội thoại' }}
      </div>

      <div ref="messageContainer" class="flex-1 overflow-y-auto p-4 space-y-2">
        <div
          v-for="msg in messages"
          :key="msg._id"
          :class="msg.sender.role === 'admin' ? 'text-right' : 'text-left'"
        >
          <div
            :class="msg.sender.role === 'admin' ? 'bg-green-100' : 'bg-gray-100'"
            class="inline-block px-3 py-2 rounded-lg max-w-[70%]"
          >
            {{ msg.text }}
          </div>
        </div>
      </div>

      <div class="p-4 border-t flex gap-2 items-center">
        <input
          v-model="newMessage"
          @keyup.enter="sendMessage"
          class="flex-1 border rounded px-3 py-2"
          placeholder="Nhập tin nhắn..."
        />
        <button
          @click="sendMessage"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Gửi
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'

const conversations = ref([])
const selectedConversation = ref(null)
const messages = ref([])
const newMessage = ref('')
const messageContainer = ref(null)

const fetchConversations = async () => {
  try {
    const res = await axios.get('/api/messages/admin/all', {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    })

    const unique = []
    const seen = new Set()

    for (const conv of res.data) {
      const user = conv.participants?.find(p => p.role === 'user')
      if (user && !seen.has(user._id)) {
        unique.push({
          ...conv,
          participant: user,
          unreadCount: conv.unreadCount || 0
        })
        seen.add(user._id)
      }
    }

    conversations.value = unique
  } catch (err) {
    console.error('Lỗi fetch conversations:', err)
  }
}

const selectConversation = async (conv) => {
  try {
    selectedConversation.value = conv
    conv.unreadCount = 0

    // 🔴 Gọi API đánh dấu đã đọc
    await axios.put(`/api/messages/read/${conv._id}`, null, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    })

    const res = await axios.get(`/api/messages/${conv._id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    })

    messages.value = res.data

    scrollToBottom()
  } catch (err) {
    console.error('Lỗi fetch messages:', err)
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return

  const messageText = newMessage.value
  newMessage.value = ''

  try {
    const res = await axios.post('/api/messages', {
      conversationId: selectedConversation.value._id,
      text: messageText
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
    })

    const newMsg = {
      _id: res.data._id,
      text: messageText,
      sender: { role: 'admin' }
    }

    messages.value.push(newMsg)
    scrollToBottom()
  } catch (err) {
    console.error('Lỗi gửi tin nhắn:', err)
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

onMounted(() => {
  fetchConversations()
})
</script>
