<template>
  <div class="p-6">
    <!-- Tiêu đề + nút scroll + xem tất cả -->
    <div class="flex justify-between items-center mb-4 flex-nowrap overflow-hidden">
      <!-- Tiêu đề -->
      <h1 class="text-xl font-bold truncate">{{ title }}</h1>

      <!-- Nút scroll trái/phải + Xem tất cả -->
      <div class="flex items-center gap-2 mr-4 shrink-0">
        <button
          v-if="shouldShowSlider"
          class="bg-white p-2 shadow rounded-full hover:bg-gray-100"
          @click="scrollLeft"
          aria-label="Scroll left"
        >
          <font-awesome-icon icon="angle-left"class="bigger"  />
        </button>
        <button
          v-if="shouldShowSlider"
          class="bg-white p-2 shadow rounded-full hover:bg-gray-100"
          @click="scrollRight"
          aria-label="Scroll right"
        >
          <font-awesome-icon icon="angle-right" class="bigger" />
        </button>
        <button
          v-if="shouldShowSlider"
          @click="goToViewAll"
          class="text-blue-600 text-sm hover:underline ml-2"
        >
          Xem tất cả
        </button>
      </div>
    </div>

    <!-- Danh sách sách dạng ngang -->
    <div
      ref="scrollContainer"
      class="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
    >
      <div
        v-for="book in books"
        :key="book._id"
        class="min-w-[160px] w-40 md:w-[16.6667%] sm:w-[33.3333%] bg-white shadow-md rounded-2xl flex flex-col hover:shadow-lg transition-shadow min-h-[300px]"
      >
        <img
          :src="book.image"
          alt="Book Cover"
          class="w-full h-48 object-cover rounded-t-2xl cursor-pointer"
          @click="goToDetail(book._id)"
        />
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
              <button @click="toggleFavorite(book)">
                <font-awesome-icon
                  :icon="[isFavorite(book._id) ? 'fas' : 'far', 'heart']"
                  :class="isFavorite(book._id) ? 'text-red-500' : 'text-gray-500'" class="hover:text-red-600 bigger"
                />
              </button>
              <button @click="addToCart(book)" class="text-black hover:text-green-600 bigger">
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useFavorites } from '@/composables/useFavorites'
import { useCart } from '@/composables/useCart'

const props = defineProps({
  books: {
    type: Array,
    default: () => []
  },
  genre: String,
  title: {
    type: String,
    default: 'Danh Sách Sách'
  }
})

const router = useRouter()
const scrollContainer = ref(null)
const books = ref([])

const { favorites, isFavorite, toggleFavorite, fetchFavorites } = useFavorites()
const { addToCart } = useCart()

// Dùng router.push kèm history.state để truyền danh sách
const goToViewAll = () => {
  localStorage.setItem('viewAllBooks', JSON.stringify(books.value))

  router.push({
    name: 'ViewAllBooks',
    query: { title: props.title },
    state: { books: books.value }
  })
}

const scrollLeft = () => {
  scrollContainer.value.scrollLeft -= 900
}

const scrollRight = () => {
  scrollContainer.value.scrollLeft += 900
}

const goToDetail = (id) => {
  router.push(`/books/${id}`)
}

// Nếu không truyền props.books → tự fetch
onMounted(async () => {
  if (!props.books.length) {
    const res = await axios.get('/api/books')
    books.value = props.genre
      ? res.data.filter(b => b.genre === props.genre)
      : res.data
  } else {
    books.value = props.books
  }

  await fetchFavorites()
})

// Chỉ hiện icon + "Xem tất cả" nếu đủ nhiều sách
const shouldShowSlider = computed(() => books.value.length > 6)
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
