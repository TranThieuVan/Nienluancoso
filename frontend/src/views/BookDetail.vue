<template>
  <div class="p-6 max-w-6xl mx-auto mt-10">
    <div v-if="book" class="flex flex-col md:flex-row gap-6">
      <!-- 📘 PHẦN TRÁI -->
      <div class="md:w-3/5 space-y-6">
        <!-- Chi tiết sách -->
        <div class="shadow-[0_0_10px_rgba(0,0,0,0.15)] bg-white overflow-hidden">
          <img :src="book.image" alt="Book Cover" class="w-full h-full object-cover" />
          <div class="p-4">
            <h2 class="text-xl font-semibold mb-2">Chi tiết sản phẩm</h2>
            <p><strong>Thể loại:</strong> {{ book.genre }}</p>
            <p><strong>Tác giả:</strong> {{ book.author }}</p>

            <div class="mt-4">
              <h2 class="text-xl font-semibold mb-2">Mô tả</h2>
              <p class="text-sm text-gray-700 whitespace-pre-line">{{ book.description }}</p>
            </div>
          </div>
        </div>

        <!-- Đánh giá -->
        <div class="p-4 shadow bg-white flex justify-between">
          <h2 class="text-xl font-semibold mb-2">Đánh giá sách</h2>
          <div class="flex gap-1 text-yellow-500 text-xl">
            <span v-for="star in 5" :key="star" class="cursor-pointer" @click="setRating(star)">
              <font-awesome-icon :icon="[rating >= star ? 'fas' : 'far', 'star']"  class="bigger" />
            </span>
          </div>
        </div>

        <div class="text-gray-700">
          ⭐ <strong>{{ averageRating }}/5</strong> ({{ totalRatings }} lượt đánh giá)
        </div>

        <!-- Bình luận -->
        <div>
          <h2 class="text-xl font-semibold mb-2 mt-6">Bình luận</h2>

          <!-- Gửi bình luận -->
          <div v-if="isLoggedIn" class="mb-4 flex items-center gap-3">
            <img :src="getAvatarUrl(user.avatar)" class="w-10 h-10 rounded-full object-cover" @error="onImageError" />
            <div class="flex-1 flex items-center border rounded-md px-2">
              <textarea ref="ta" v-model="msg" class="flex-1 resize-none overflow-hidden p-2" rows="1" placeholder="Nhập nội dung..." @input="onInput"></textarea>
            </div>
            <button @click="submitComment" class="text-[#8B4513] hover:text-[#6B3510] text-2xl">
              <font-awesome-icon :icon="['fas', 'paper-plane']" class="bigger" />
            </button>
          </div>
          <div v-else class="text-gray-500 italic mb-4">Vui lòng đăng nhập để bình luận.</div>

          <!-- Danh sách bình luận -->
          <div v-if="comments.length === 0" class="text-gray-500">Chưa có bình luận nào.</div>
          <div v-else class="space-y-4">
            <div v-for="cmt in comments" :key="cmt._id" class="relative  flex items-start gap-3 border-b pb-3">
              
              <img :src="getAvatarUrl(cmt.userId.avatar)" class="w-10 h-10 rounded-full object-cover" @error="onImageError" />
              <div class="flex-1">
                <p class="font-semibold">{{ cmt.userId.name }}</p>

                <p v-if="cmt.isHidden" class="text-sm italic text-red-500">
                  Bình luận đã bị ẩn vì lý do: {{ cmt.hiddenReason }}.
                </p>

                <p v-else-if="editId !== cmt._id" class="text-sm text-gray-700">{{ cmt.content }}</p>

                <!-- Đang sửa -->
                <div v-else class="mt-1">
                  <textarea v-model="editContent" rows="2" class="w-full p-2 border rounded text-sm resize-none"></textarea>
                  <div class="flex gap-2 mt-1">
                    <button @click="saveEdit(cmt._id)" class="text-green-600 hover:underline text-sm">Lưu</button>
                    <button @click="cancelEdit" class="text-gray-500 hover:underline text-sm">Huỷ</button>
                  </div>
                </div>
              </div>

              <!-- Menu 3 chấm -->
<div v-if="isLoggedIn && isCommentOwner(cmt.userId)" class="relative">

    <button
    @click="toggleMenu(cmt._id)"
    class="text-gray-500 hover:text-gray-800 px-2 text-xl transition-colors duration-200"
  >
    <font-awesome-icon icon="ellipsis-v" />
  </button>

  <div
    v-if="menuOpenId === cmt._id"
    class="absolute left-10 bottom-0 bg-white border rounded-xl shadow-lg z-10 min-w-[120px] overflow-hidden"
  >
    <button
      @click="startEdit(cmt)"
      class="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm text-gray-700"
    >
      <font-awesome-icon icon="pen" />
      Sửa
    </button>
    <button
      @click="deleteComment(cmt._id)"
      class="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full text-left text-sm text-red-600"
    >
      <font-awesome-icon icon="trash" />
      Xoá
    </button>
  </div>
</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 🛒 PHẦN PHẢI -->
      <div class="md:w-2/5 space-y-4 border p-6 shadow-md h-fit sticky top-[80px]">
        <h1 class="text-2xl font-bold">{{ book.title }}</h1>
        <p class="text-gray-600 text-sm">{{ book.author }}</p>
        <hr />
        <div class="text-yellow-500 text-lg">⭐ {{ averageRating }}/5 ({{ totalRatings }} đánh giá)</div>
        <p class="text-2xl font-bold">{{ formatPrice(book.price) }}₫</p>

        <div class="mt-2 flex items-center gap-2 text-red-500 cursor-pointer" @click="toggleFavoriteHandler">
          <font-awesome-icon :icon="[isFavorite(book?._id) ? 'fas' : 'far', 'heart']" class="text-xl bigger" />
        </div>

        <div class="flex gap-1 mt-4">
          <button @click="addToCart(book)" class="hover-flip-btn py-2 w-52">Thêm vào giỏ hàng</button>
          <button class="hover-flip-btn py-2 w-48" @click="handleBuyNow">Thanh toán</button>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-gray-500">Đang tải sách...</div>
  </div>

</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import autosize from 'autosize'
import Swal from 'sweetalert2'
import { useCart } from '@/composables/useCart'
import { useFavorites } from '@/composables/useFavorites'

const route = useRoute()
const router = useRouter()

const { addToCart } = useCart()
const { isFavorite, toggleFavorite, fetchFavorites } = useFavorites()

const book = ref(null)
const rating = ref(0)
const averageRating = ref(0)
const totalRatings = ref(0)
const comments = ref([])
const msg = ref('')
const ta = ref(null)
const user = ref({})
const userId = ref()
const editId = ref(null)
const editContent = ref('')
const menuOpenId = ref(null)

const token = localStorage.getItem('token')
const isLoggedIn = !!token

const toggleFavoriteHandler = () => toggleFavorite(book.value)

const isCommentOwner = (cmtUserId) => {
  const currentUserId = userId.value
  const commentUserId = typeof cmtUserId === 'object' ? cmtUserId._id : cmtUserId
  console.log('Current:', currentUserId, 'Comment:', commentUserId)
  return currentUserId && commentUserId && currentUserId === commentUserId
}


const fetchComments = async () => {
  const res = await axios.get(`/api/comments/${book.value._id}/comments`)
    console.log('Fetched comments:', res.data)

  comments.value = res.data
}

onMounted(async () => {
  await fetchFavorites()

  const { id } = route.params
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    user.value = JSON.parse(storedUser)
      console.log('✅ user từ localStorage:', user.value)

userId.value = user.value._id || user.value.id
  }

  const res = await axios.get(`/api/books/${id}`)
  book.value = res.data

  const ratingRes = await axios.get(`/api/rating/${id}/rating`)
  averageRating.value = ratingRes.data.average
  totalRatings.value = ratingRes.data.total

  await fetchComments()

  if (isLoggedIn) {
    const myRatingRes = await axios.get(`/api/rating/${id}/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    rating.value = myRatingRes.data.value || 0
  }

  await nextTick()
  if (ta.value) autosize(ta.value)
})

const onInput = () => {
  if (ta.value) autosize.update(ta.value)
}

watch(msg, () => {
  if (ta.value) autosize.update(ta.value)
})

const setRating = async (value) => {
  if (!isLoggedIn) return alert('Vui lòng đăng nhập để đánh giá!')
  rating.value = value
  try {
    await axios.post('/api/rating', { bookId: book.value._id, value }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const res = await axios.get(`/api/rating/${book.value._id}/rating`)
    averageRating.value = res.data.average
    totalRatings.value = res.data.total
  } catch {
    alert('Lỗi khi gửi đánh giá')
  }
}

const submitComment = async () => {
  if (!msg.value.trim()) return
  try {
    await axios.post('/api/comments', { bookId: book.value._id, content: msg.value }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    msg.value = ''
    await fetchComments()
    if (ta.value) autosize.update(ta.value)
  } catch {
    alert('Lỗi khi gửi bình luận')
  }
}

const startEdit = (comment) => {
  editId.value = comment._id
  editContent.value = comment.content
  menuOpenId.value = null
}

const cancelEdit = () => {
  editId.value = null
  editContent.value = ''
}

const saveEdit = async (id) => {
  try {
    await axios.put(`/api/comments/${id}`, { content: editContent.value }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    editId.value = null
    editContent.value = ''
    await fetchComments()
    Swal.fire('Thành công', 'Đã cập nhật bình luận', 'success')
  } catch (err) {
    Swal.fire('Lỗi', err.response?.data?.message || 'Không thể cập nhật bình luận', 'error')
  }
}

const toggleMenu = (id) => {
  menuOpenId.value = menuOpenId.value === id ? null : id
}

const deleteComment = async (id) => {
  const confirm = await Swal.fire({
    title: 'Xác nhận xoá?',
    text: 'Bạn có chắc muốn xoá bình luận này?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xoá',
    cancelButtonText: 'Huỷ'
  })

  if (confirm.isConfirmed) {
    await axios.delete(`/api/comments/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchComments()
    Swal.fire('Đã xoá', '', 'success')
  }
}

const getAvatarUrl = (avatar) => {
  if (!avatar || avatar.includes('default-user.png')) {
    return 'http://localhost:5000/uploads/avatars/default-user.png'
  }
  return `http://localhost:5000/${avatar}`
}

const onImageError = (e) => {
  e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png'
}

const formatPrice = (price) => price.toLocaleString()

const handleBuyNow = async () => {
  try {
    const res = await axios.get('/api/cart', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const items = res.data.items || []
    const exists = items.find(item => item.book._id === book.value._id)
    if (!exists) await addToCart(book.value)
    localStorage.setItem('preselectItem', book.value._id)
    router.push('/cart')
  } catch (error) {
    console.error('Lỗi khi mua ngay:', error)
  }
}
</script>
