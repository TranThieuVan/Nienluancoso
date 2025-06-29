<template>
  <div class="p-6">
    <!-- Tiêu đề và icon slider -->
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-bold">Danh Sách Sách</h1>
      <div class="flex items-center gap-2 mr-8">
        <button class="bg-white p-2 shadow rounded-full hover:bg-gray-100" @click="scrollLeft">⬅</button>
        <button class="bg-white p-2 shadow rounded-full hover:bg-gray-100" @click="scrollRight">➡</button>
      </div>
    </div>

    <!-- Danh sách sách dạng ngang -->
    <div ref="scrollContainer" class="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth">
      <div
  v-for="book in books"
  :key="book._id"
  @click="goToDetail(book._id)"
  class="min-w-[160px] w-40 md:w-[16.6667%] sm:w-[33.3333%] bg-white shadow-md rounded-2xl flex flex-col hover:shadow-lg transition-shadow min-h-[300px]"
>
  <img
    :src="book.image"
    alt="Book Cover"
    class="w-full h-48 object-cover rounded-t-2xl"
  />

  <div class="flex-1 p-3 flex flex-col justify-between h-full">
    <h2 class="font-bold text-sm text-left line-clamp-2 leading-tight flex items-center">
      {{ book.title }}
    </h2>
    <p class="text-xs text-gray-600 text-left mt-1">{{ book.author }}</p>

    <div class="flex justify-between items-center mt-3">
      <p class="text-green-600 text-sm font-semibold">
        {{ book.price.toLocaleString() }}₫
      </p>

      <div class="flex items-center gap-2">
        <button @click="toggleFavorite(book)" class="text-black hover:text-pink-600">
          <font-awesome-icon :icon="['far', 'heart']" />
        </button>
        <button @click="addToCart(book)" class="text-black hover:text-green-600">
          <font-awesome-icon :icon="['fas', 'bag-shopping']" />
        </button>
      </div>
    </div>
  </div>
</div>

    </div>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { incrementCartCount } from '@/composables/cartStore'
import { useRouter } from 'vue-router' // <== THÊM DÒNG NÀY

const books = ref([])
const scrollContainer = ref(null)

const fetchBooks = async () => {
  try {
    const res = await axios.get('/api/books')
    books.value = res.data
  } catch (err) {
    console.error('Lỗi khi tải sách:', err)
  }
}

const scrollLeft = () => {
  scrollContainer.value.scrollLeft -= 900
}

const scrollRight = () => {
  scrollContainer.value.scrollLeft += 900
}

const toggleFavorite = (book) => {
  alert(`Đã ❤️ sách: ${book.title}`)
}

const addToCart = async (book) => {
  const token = localStorage.getItem('token')
  if (!token) {
    alert('Vui lòng đăng nhập để thêm vào giỏ hàng!')
    return
  }

  try {
    await axios.post(
      'http://localhost:5000/api/cart/add',
      { bookId: book._id, quantity: 1 },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    incrementCartCount(1) // tăng số lượng trên navbar
  } catch (err) {
    console.error('Lỗi khi thêm vào giỏ hàng:', err)
    alert('Không thể thêm vào giỏ hàng.')
  }
}

const router = useRouter();
const goToDetail = (id) => {
  router.push(`/books/${id}`);
};


onMounted(fetchBooks)
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
img {
  transition: transform 0.3s ease;
}
.scrollbar-hide {
  padding-bottom: 4px; /* giúp không bị cắt sát */
}
</style>
