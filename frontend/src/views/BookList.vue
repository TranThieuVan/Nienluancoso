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
        class="min-w-[160px] w-40 md:w-[16.6667%] sm:w-[33.3333%] bg-white shadow-md rounded-2xl flex flex-col hover:shadow-lg transition-shadow min-h-[300px]"
      >
        <!-- Ảnh sách -->
        <img
          :src="book.image"
          alt="Book Cover"
          class="w-full h-48 object-cover rounded-t-2xl cursor-pointer"
          @click="goToDetail(book._id)"
        />

        <!-- Nội dung -->
        <div class="flex-1 p-3 flex flex-col justify-between h-full">
          <div>
            <h2 class="font-bold text-sm text-left line-clamp-2 leading-tight">
              {{ book.title }}
            </h2>
            <p class="text-xs text-gray-600 text-left mt-1">{{ book.author }}</p>
          </div>

          <div class="flex justify-between items-center mt-3">
            <p class="text-green-600 text-sm font-semibold">
              {{ book.price.toLocaleString() }}₫
            </p>

            <div class="flex items-center gap-2">
              <!-- ❤️ -->
              <button @click="toggleFavorite(book)">
                <font-awesome-icon
                  :icon="[isFavorite(book._id) ? 'fas' : 'far', 'heart']"
                  :class="isFavorite(book._id) ? 'text-red-500' : 'text-gray-500'"
                />
              </button>
              <!-- 🛒 -->
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
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useFavorites } from '@/composables/useFavorites'
import { useCart } from '@/composables/useCart'

const books = ref([])
const scrollContainer = ref(null)
const router = useRouter()

const { favorites, isFavorite, toggleFavorite, fetchFavorites } = useFavorites()
const { addToCart } = useCart()

const fetchBooks = async () => {
  try {
    const res = await axios.get('/api/books')
    books.value = res.data
  } catch (err) {
    console.error('Lỗi khi tải sách:', err)
  }
}

const goToDetail = (id) => {
  router.push(`/books/${id}`)
}

const scrollLeft = () => {
  scrollContainer.value.scrollLeft -= 900
}
const scrollRight = () => {
  scrollContainer.value.scrollLeft += 900
}

onMounted(async () => {
  await fetchBooks()
  await fetchFavorites()
})
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  padding-bottom: 4px;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
img {
  transition: transform 0.3s ease;
}
img:hover {
  transform: scale(1.03);
}
</style>
