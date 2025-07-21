<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">{{ title }}</h1>

    <!-- Grid sách -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
      <div
        v-for="book in paginatedBooks"
        :key="book._id"
        class="bg-white rounded-2xl shadow p-3 flex flex-col hover:shadow-lg transition-shadow min-h-[300px]"
      >
        <img
          :src="book.image"
          alt="Book Cover"
          class="w-full h-48 object-cover rounded-t-2xl cursor-pointer"
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

    <!-- Phân trang -->
    <Pagination
      :current-page="currentPage"
      :total-pages="totalPages"
      @page-change="changePage"
      class="mt-8"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Pagination from '@/components/Pagination.vue'
import { useFavorites } from '@/composables/useFavorites'
import { useCart } from '@/composables/useCart'

const router = useRouter()
const route = useRoute()

const allBooks = ref([])
const currentPage = ref(1)
const booksPerPage = 21
const title = ref('Tất cả sách')
const genre = ref(route.query.genre || '')

const { isFavorite, toggleFavorite, fetchFavorites } = useFavorites()
const { addToCart } = useCart()

// Hàm chuyển trang chi tiết
const goToDetail = (id) => {
  router.push(`/books/${id}`)
}

// Phân trang
const paginatedBooks = computed(() => {
  const start = (currentPage.value - 1) * booksPerPage
  return allBooks.value.slice(start, start + booksPerPage)
})
const totalPages = computed(() => Math.ceil(allBooks.value.length / booksPerPage))
const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Tải từ localStorage nếu không có genre
const loadBooksFromStorageOrRedirect = () => {
  const fromStorage = localStorage.getItem('viewAllBooks')
  if (fromStorage) {
    allBooks.value = JSON.parse(fromStorage)
  } else {
    router.replace('/')
  }
}

// Lấy sách theo thể loại
const fetchBooksByGenre = async (genreValue) => {
  try {
    const { data } = await axios.get(`http://localhost:5000/api/books?genre=${genreValue}`)
    allBooks.value = data
    title.value = `Thể loại: ${genreValue}`
  } catch (error) {
    console.error('Lỗi khi tải sách theo thể loại:', error)
  }
}

// Khi mount hoặc khi `genre` thay đổi
onMounted(async () => {
  await fetchFavorites()

  const stateGenre = history.state?.booksByGenre
  if (stateGenre) {
    genre.value = stateGenre
    await fetchBooksByGenre(genre.value)
  } else if (route.query.genre) {
    genre.value = route.query.genre
    await fetchBooksByGenre(genre.value)
  } else {
    title.value = route.query.title || 'Tất cả sách'
    loadBooksFromStorageOrRedirect()
  }
})

watch(() => route.query.genre, async (newGenre) => {
  if (newGenre) {
    await fetchBooksByGenre(newGenre)
    title.value = `Thể loại: ${newGenre}`
  }
})

</script>

<style scoped>
img {
  transition: transform 0.3s ease;
}
img:hover {
  transform: scale(1.03);
}
</style>
