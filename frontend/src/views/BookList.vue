<template>
    <div class="p-6">
      <h1 class="text-3xl font-bold mb-4">📚 Danh Sách Sách</h1>
  
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div v-for="book in books" :key="book._id" class="bg-white shadow rounded-lg p-4">
          <img :src="book.image" alt="Book Cover" class="w-full h-48 object-cover rounded" />
  
          <h2 class="font-bold text-lg mt-2">{{ book.title }}</h2>
          <p class="text-sm text-gray-600">{{ book.author }}</p>
          <p class="text-green-600 font-semibold mt-1">{{ book.price.toLocaleString() }}₫</p>
  
          <!-- Nút yêu thích và giỏ hàng -->
          <div class="flex justify-between items-center mt-3">
            <button @click="toggleFavorite(book)" class="text-red-500 text-xl hover:scale-110">
              ❤️
            </button>
            <button @click="addToCart(book)" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
              🛒
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const books = ref([]);

const fetchBooks = async () => {
  try {
    const res = await axios.get('http://localhost:5000/api/books');
    books.value = res.data;
  } catch (err) {
    console.error('Lỗi khi tải danh sách sách:', err);
  }
};

const toggleFavorite = (book) => {
  // TODO: Lưu vào danh sách yêu thích (localStorage hoặc gửi lên server nếu có login)
  alert(`Đã ❤️ sách: ${book.title}`);
};

const addToCart = (book) => {
  // TODO: Lưu vào giỏ hàng (localStorage hoặc store Vuex/pinia nếu có)
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
</style>
  