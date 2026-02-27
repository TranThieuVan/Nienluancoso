<!-- ChatIcon.vue -->
<template>
  <div class="fixed bottom-4 right-4 z-50">
    <div
      class="relative bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform"
      @click="handleClick"
    >
      <font-awesome-icon icon="comments" size="lg" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 bg-red-600 text-xs w-5 h-5 rounded-full flex items-center justify-center"
      >
        {{ unreadCount }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'

const unreadCount = ref(0)
let intervalId = null

const fetchUnreadCount = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return

    const res = await axios.get('/api/messages/unread/count', {
      headers: { Authorization: `Bearer ${token}` }
    })

    unreadCount.value = (res.data?.unreadCount ?? 0) > 0 ? res.data.unreadCount : 0
  } catch (err) {
    console.error('Lỗi lấy số tin chưa đọc:', err)
    unreadCount.value = 0
  }
}

const waitForTokenThenFetch = async () => {
  let waited = 0
  while (!localStorage.getItem('token') && waited < 5000) {
    await new Promise(resolve => setTimeout(resolve, 100))
    waited += 100
  }

  if (localStorage.getItem('token')) {
    fetchUnreadCount()
    intervalId = setInterval(fetchUnreadCount, 1000)
  }
}

const handleClick = () => {
  const token = localStorage.getItem('token')
  if (!token) {
    alert('Bạn cần đăng nhập để sử dụng chức năng chat.')
    return
  }
  // Gửi sự kiện toggle ra ngoài
  emit('toggle')
}

onMounted(() => {
  waitForTokenThenFetch()
})
onBeforeUnmount(() => {
  clearInterval(intervalId)
})

const emit = defineEmits(['toggle'])
</script>
