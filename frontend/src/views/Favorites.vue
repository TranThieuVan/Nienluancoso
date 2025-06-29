<template>
  <div class="p-4">
    <h2 class="text-2xl font-semibold text-center">Sách Yêu Thích</h2>
    <p class="text-lg mb-6 text-center text-gray-700">
      Danh sách giá sách được tôi tuyển chọn để sắp xếp tất cả những cuốn sách yêu thích.
    </p>

    <div v-if="books.length === 0" class="text-gray-500 text-center">
      Chưa có sách nào được yêu thích.
    </div>

    <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
      <div
        v-for="book in books"
        :key="book._id"
        class="shadow-md p-0 flex flex-col justify-between relative overflow-hidden"
      >
        <!-- Ảnh -->
        <div class="relative">
          <img
            :src="book.image"
            alt="Book"
            class="w-full h-96 object-cover cursor-pointer"
            @click="goToDetail(book._id)"
          />
          <button
            @click="toggleFavorite(book, (id) => books = books.filter(b => b._id !== id))"
            class="absolute top-2 right-2 bg-white bg-opacity-70 rounded-full p-2"
            title="Bỏ khỏi yêu thích"
          >
            <font-awesome-icon
              :icon="[isFavorite(book._id) ? 'fas' : 'far', 'heart']"
              :class="isFavorite(book._id) ? 'text-red-500' : 'text-black'"
            />
          </button>
        </div>

        <!-- Thông tin -->
        <div class="p-3">
          <h2 class="font-bold text-sm mt-1 line-clamp-2">{{ book.title }}</h2>
          <p class="text-green-600 text-sm font-semibold mt-2">
            {{ book.price.toLocaleString() }}₫
          </p>

          <!-- Nút thêm vào giỏ -->
          <button
            @click="addToCart(book)"
            class="mt-4 border border-gray-300 text-base px-5 py-2 rounded-2xl hover:border-gray-500 transition"
          >
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCart } from '@/composables/useCart'
import { useFavorites } from '@/composables/useFavorites'

const router = useRouter()
const books = ref([])

const { addToCart } = useCart()
const { favorites, fetchFavorites, toggleFavorite, isFavorite } = useFavorites()

const goToDetail = (id) => {
  router.push(`/books/${id}`)
}

onMounted(async () => {
  const favoriteBooks = await fetchFavorites()
  books.value = favoriteBooks || []
})
</script>
