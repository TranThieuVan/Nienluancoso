<template>  
  <div class="min-h-screen p-6 bg-gray-100">
    <div class=" mx-auto flex gap-6">
      <!-- Bộ lọc bên trái -->
      <div class=" basic-1/4 bg-white p-4 rounded-xl shadow">
        <label class="block text-sm font-medium text-gray-700 mb-1">Tìm theo tên sách</label>
        <input
          v-model="searchTitle"
          type="text"
          placeholder="Nhập tên sách..."
          class="w-full px-3 py-2 border rounded-md mb-4 focus:outline-none focus:ring"
        />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Thể loại</label>
          <div class="space-y-2">
            <div v-for="genre in genres" :key="genre" class="flex items-center gap-2">
              <input type="radio" :value="genre" v-model="selectedGenre" class="accent-red-500" />
              <span class="text-sm">{{ genre }}</span>
            </div>
            <div class="flex items-center gap-2">
              <input type="radio" value="" v-model="selectedGenre" class="accent-red-500" />
              <span class="text-sm">Tất cả</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Danh sách sách bên phải -->
      <div class="w-3/4">
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Sắp xếp</label>
          <select v-model="sortBy" class="w-full px-3 py-2 rounded border focus:outline-none">
            <option value="title">Tên A → Z</option>
            <option value="sold">Mua nhiều nhất</option>
            <option value="priceHigh">Giá cao nhất</option>
            <option value="priceLow">Giá thấp nhất</option>
          </select>
        </div>

        <h2 class="text-xl font-bold mb-4 mt-6">{{ computedTitle }}</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div
            v-for="book in paginatedBooks"
            :key="book._id"
            class="bg-white rounded-2xl shadow p-3 flex flex-col hover:shadow-lg transition-shadow min-h-[300px]"
          >
            <img
              :src="book.image"
              alt="Book Cover"
              class="w-full h-48 object-cover cursor-pointer"
              @click="goToDetail(book._id)"
            />
            <div class="flex-1 flex flex-col justify-between h-full">
              <div>
                <h2 class="font-bold text-sm text-left line-clamp-2 leading-tight mt-2">
                  {{ book.title }}
                </h2>
                <p class="text-xs text-gray-600 text-left mt-1">{{ book.author }}</p>
              </div>
              <div class="flex justify-between items-center mt-3">
                <p class="text-green-600 text-sm font-semibold">
                  {{ book.price.toLocaleString() }}₫
                </p>
                <div class="flex items-center gap-2">
                  <button @click="toggleFavorite(book)">
                    <font-awesome-icon
                      :icon="[isFavorite(book._id) ? 'fas' : 'far', 'heart']"
                      :class="isFavorite(book._id) ? 'text-red-500' : 'text-gray-500'"
                    />
                  </button>
                  <button @click="addToCart(book)" class="text-black hover:text-green-600">
                    <font-awesome-icon :icon="['fas', 'bag-shopping']" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <Pagination
          :current-page="page"
          :total-pages="totalPages"
          @page-change="page = $event"
          class="mt-8"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useFavorites } from '@/composables/useFavorites'
import { useCart } from '@/composables/useCart'
import { useRouter } from 'vue-router'
import Pagination from '@/components/Pagination.vue'

const router = useRouter()
const books = ref([])
const genres = ref([])
const searchTitle = ref('')
const selectedGenre = ref('')
const sortBy = ref('title')
const page = ref(1)
const perPage = 20

const { toggleFavorite, isFavorite, fetchFavorites } = useFavorites()
const { addToCart } = useCart()

const goToDetail = (id) => router.push(`/books/${id}`)

const fetchBooks = async () => {
  try {
    let response
    if (sortBy.value === 'rating') {
      response = await axios.get('/api/ratings/top-rated')
    } else if (sortBy.value === 'sold') {
      response = await axios.get('/api/books/top-selling')
    } else {
      response = await axios.get('/api/books')
    }
    books.value = response.data
  } catch (err) {
    console.error('Lỗi khi tải sách:', err)
  }
}

onMounted(async () => {
  await fetchBooks()
  const genreRes = await axios.get('/api/books/genres')
  genres.value = genreRes.data
  await fetchFavorites()
})

watch(sortBy, async () => {
  await fetchBooks()
})

const filteredBooks = computed(() => {
  let result = [...books.value]

  if (searchTitle.value) {
    result = result.filter(book =>
      book.title.toLowerCase().includes(searchTitle.value.toLowerCase())
    )
  }

  if (selectedGenre.value) {
    result = result.filter(book => book.genre === selectedGenre.value)
  }

  // Các kiểu sort local không cần gọi API riêng
  if (['priceHigh', 'priceLow', 'title'].includes(sortBy.value)) {
    switch (sortBy.value) {
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'priceHigh':
        result.sort((a, b) => b.price - a.price)
        break
      case 'priceLow':
        result.sort((a, b) => a.price - b.price)
        break
    }
  }

  return result
})

const paginatedBooks = computed(() => {
  const start = (page.value - 1) * perPage
  return filteredBooks.value.slice(start, start + perPage)
})

const computedTitle = computed(() =>
  selectedGenre.value ? `Thể loại: ${selectedGenre.value}` : 'Tất cả sách'
)

const totalPages = computed(() => Math.ceil(filteredBooks.value.length / perPage))
</script>

<style scoped>
img {
  transition: transform 0.3s ease;
}
img:hover {
  transform: scale(1.03);
}
</style>
