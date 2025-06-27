<template>
  <div class="p-6">
    <!-- Tiêu đề và icon slider cùng hàng -->
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-xl font-bold">Danh Sách Sách</h1>
      <div class="flex items-center gap-2">
        <button
          class="bg-white p-2 shadow rounded-full hover:bg-gray-100 transition duration-300"
          @click="scrollLeft"
        >
          ⬅
        </button>
        <button
          class="bg-white p-2 shadow rounded-full hover:bg-gray-100 transition duration-300"
          @click="scrollRight"
        >
          ➡
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
        class="relative min-w-[160px] w-40 md:w-[16.6667%] sm:w-[33.3333%] bg-white shadow rounded-lg p-3 flex-shrink-0 transition duration-300 hover:shadow-lg"
      >
        <img
          :src="book.image"
          alt="Book Cover"
          class="w-full h-48 object-cover rounded transition duration-300 hover:scale-105"
        />

        <!-- Tiêu đề 2 dòng, căn trái nếu 1 dòng -->
        <h2
          class="font-bold text-sm mt-2 text-left line-clamp-2 leading-tight h-[3rem] flex items-center"
        >
          {{ book.title }}
        </h2>

        <p class="text-xs text-gray-600 text-left mt-1">{{ book.author }}</p>

        <p class="text-green-600 text-sm font-semibold text-left mt-2">{{ book.price.toLocaleString() }}₫</p>

        <!-- Icon yêu thích và giỏ hàng phía dưới như cũ -->
        <div class="flex justify-end items-center gap-2 mt-2">
          <RouterLink to="/favorites" class="flex items-center text-black hover:underline" @click="toggleFavorite(book)">
            <font-awesome-icon :icon="['far', 'heart']" class="mr-2" />
          </RouterLink> 

          <RouterLink to="/cart" class="flex items-center text-black hover:underline" @click="addToCart(book)">
            <font-awesome-icon :icon="['fas', 'bag-shopping']" class="mr-2" />
          </RouterLink>   
         </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
const books = ref([]);
const scrollContainer = ref(null);

const fetchBooks = async () => {
  try {
    const res = await axios.get('/api/books');
    books.value = res.data;
  } catch (err) {
    console.error('Lỗi khi tải danh sách sách:', err);
  }
};

const scrollLeft = () => {
  scrollContainer.value.scrollLeft -= 900;
};

const scrollRight = () => {
  scrollContainer.value.scrollLeft += 900;
};

const toggleFavorite = (book) => {
  alert(`Đã ❤️ sách: ${book.title}`);
};

const addToCart = (book) => {
  alert(`🛒 Đã thêm vào giỏ: ${book.title}`);
};

onMounted(fetchBooks);
</script>

<style scoped>
img {
  transition: transform 0.3s ease;
}
img:hover {
  transform: scale(1.05);
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
