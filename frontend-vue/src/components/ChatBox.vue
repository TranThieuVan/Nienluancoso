<template>
  <div class="fixed bottom-4 right-4 z-50 w-[400px] max-h-[500px] min-h-[400px] bg-white rounded-lg shadow-lg flex flex-col">
    <!-- Header -->
    <div class="bg-blue-600 text-white p-3 flex justify-between items-center rounded-t-lg">
      <span>Hỗ trợ khách hàng</span>
      <button @click="$emit('close')">❌</button>
    </div>

    <!-- Nội dung tin nhắn -->
    <div ref="messageContainer" class="flex-1 overflow-y-auto p-3 space-y-2">
      <div
        v-for="msg in messages"
        :key="msg._id"
        class="w-full flex"
        :class="msg.sender?._id === userId ? 'justify-end' : 'justify-start'"
      >
        <div
          :class="[
            'px-3 py-2 rounded-lg max-w-[80%] break-words',
            msg.sender?._id === userId
              ? 'bg-blue-100 text-right'
              : 'bg-gray-200 text-left'
          ]"
        >
          {{ msg.text }}
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="p-3 border-t flex items-center gap-2">
      <input
        v-model="newMessage"
        type="text"
        placeholder="Nhập tin nhắn..."
        class="flex-1 border rounded px-3 py-2"
        @keyup.enter="sendMessage"
      />
      <button @click="sendMessage" class="text-blue-600 font-semibold">Gửi</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import axios from 'axios'

const props = defineProps(['userId'])
const emit = defineEmits(['close'])

const messages = ref([])
const newMessage = ref('')
const conversationId = ref(null)
const messageContainer = ref(null)

const fetchConversation = async () => {
  if (!props.userId) return

  try {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await axios.post('/api/messages/start', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })

    conversationId.value = res.data._id
    await fetchMessages()
  } catch (err) {
    console.error('Lỗi fetch conversation:', err)
  }
}

const fetchMessages = async () => {
  if (!conversationId.value) return

  try {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await axios.get(`/api/messages/${conversationId.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    messages.value = res.data
    scrollToBottom()
    await markAsRead()
  } catch (err) {
    console.error('Lỗi fetch messages:', err)
  }
}

const markAsRead = async () => {
  if (!conversationId.value) return

  try {
    const token = localStorage.getItem('token')
    if (!token) return

    await axios.put(`/api/messages/read/${conversationId.value}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch (err) {
    console.error('Lỗi đánh dấu đã đọc:', err)
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !conversationId.value) return

  try {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await axios.post('/api/messages', {
      text: newMessage.value,
      conversationId: conversationId.value
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    messages.value.push({
      ...res.data,
      sender: { _id: props.userId }
    })

    newMessage.value = ''
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

// Theo dõi userId để khởi động chat
watch(
  () => props.userId,
  (id) => {
    if (id) fetchConversation()
  },
  { immediate: true }
)
</script>
