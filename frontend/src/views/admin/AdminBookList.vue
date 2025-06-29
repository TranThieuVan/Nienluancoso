<template>
    <div class="container mx-auto p-6 relative">
      <!-- Nút quay lại -->
      <button
        @click="goHome"
        class="text-blue-500 flex items-center mb-4 text-lg font-semibold px-4 py-2 rounded hover:bg-blue-100"
      >
        ⬅ Quay lại
      </button>
  
      <!-- Tiêu đề -->
      <h1 class="text-3xl font-bold mb-6 text-center">Danh Sách Các Quyển Sách</h1>
  
      <!-- Thanh tìm kiếm -->
      <div class="mb-4 flex justify-center">
        <InputSearch v-model="searchQuery" placeholder="🔍 Tìm sách theo tiêu đề..." />
      </div>
  
      <!-- Bộ lọc -->
      <div class="mb-6 flex flex-wrap justify-center gap-4 items-center">
        <select v-model="selectedGenre" class="p-2 border rounded shadow-md">
          <option value="">Chọn thể loại</option>
          <option v-for="genre in genres" :key="genre" :value="genre">{{ genre }}</option>
        </select>
  
        <!-- Nút thêm sách -->
        <button
          @click="$router.push('/admin/add-book')"
          class="bg-green-500 text-white px-4 py-2 rounded shadow-md hover:bg-green-600"
        >
          ➕ Thêm sách
        </button>
      </div>
  
      <!-- Danh sách sách -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div v-for="book in filteredBooks" :key="book._id" class="book-card">
          <div class="book-content">
            <img
              :src="'http://localhost:5000' + book.image"
              :alt="book.title"
              class="w-full h-48 object-cover rounded"
            />
            <h2 class="text-lg font-bold mt-2">{{ book.title }}</h2>
            <p class="text-gray-600">Tác giả: {{ book.author }}</p>
            <span
              class="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded mt-2 inline-block"
            >
              {{ book.genre }}
            </span>
            <p class="mt-2 font-bold text-green-700">Giá: {{ formatPrice(book.price) }}</p>
            <p class="text-gray-700">
              Số lượng:
              <span :class="{ 'text-red-500': book.stock === 0 }">
                {{ book.stock === 0 ? 'Đã hết' : book.stock }}
              </span>
            </p>
          </div>
  
          <!-- Nút chỉnh sửa và xóa -->
          <div class="flex w-full gap-0.5 mt-2">
            <button
              @click="editBook(book._id)"
              class="w-1/2 bg-yellow-500 text-white p-2 rounded-l-md hover:bg-yellow-600"
            >
              Sửa
            </button>
            <button
              @click="deleteBook(book._id)"
              class="w-1/2 bg-red-500 text-white p-2 rounded-r-md hover:bg-red-600"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import axios from 'axios';
  import InputSearch from '@/components/InputSearch.vue';
  import { useRouter } from 'vue-router';
  import Swal from 'sweetalert2';
  
  const router = useRouter();
  const books = ref([]);
  const searchQuery = ref('');
  const selectedGenre = ref('');
  const genres = ref([]);
  
  const fetchBooks = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/books');
      books.value = response.data;
      genres.value = [...new Set(books.value.map(book => book.genre))];
    } catch (error) {
      console.error('Lỗi khi lấy sách:', error);
    }
  };
  
  onMounted(fetchBooks);
  
  const filteredBooks = computed(() => {
    return books.value.filter(book => {
      return (
        book.title.toLowerCase().includes(searchQuery.value.toLowerCase()) &&
        (selectedGenre.value === '' || book.genre === selectedGenre.value)
      );
    });
  });
  
  const formatPrice = price => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };
  
  const editBook = bookId => {
    router.push(`/admin/edit-book/${bookId}`);
  };
  
  const deleteBook = async bookId => {
    const result = await Swal.fire({
      title: 'Bạn có chắc chắn?',
      text: 'Hành động này không thể hoàn tác!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    });
  
    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/books/${bookId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        Swal.fire({
          title: 'Xóa thành công!',
          text: 'Cuốn sách đã được xóa khỏi danh sách.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
        fetchBooks();
      } catch (error) {
        Swal.fire({
          title: 'Lỗi!',
          text: 'Xóa sách thất bại!',
          icon: 'error',
        });
      }
    }
  };
  
  const goHome = () => {
    router.push('/admin/home');
  };
  </script>
  
  <style scoped>
  .book-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    background: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .book-content {
    flex-grow: 1;
  }
  </style>
  