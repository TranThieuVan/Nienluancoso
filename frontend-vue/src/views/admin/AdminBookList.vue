<template>
  <div class="flex flex-col p-6 w-full">
    <!-- Tiêu đề -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold mb-1">Quản lý sách</h1>
        <p class="text-gray-500">Quản lý toàn bộ cơ sở dữ liệu sách, bao gồm hình ảnh, tên, giá bán, số lượng, ...</p>
      </div>
    </div>

    <!-- Thanh công cụ -->
    <div class="flex justify-between mb-4 items-center">
      <!-- Bộ lọc -->
      <div class="flex gap-3 items-center">
        <InputSearchAdmin
          v-model="searchQuery"
          @search="onSearch"
          placeholder="Tìm sách theo tiêu đề"
        />
        <select v-model="selectedGenre" class="p-2 border rounded shadow-sm">
          <option value="">Thể loại</option>
          <option v-for="genre in genres" :key="genre" :value="genre">{{ genre }}</option>
        </select>
      </div>

      <!-- Nút thêm sách -->
      <button @click="$router.push('/admin/add-book')" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
        + Thêm sách
      </button>
    </div>

    <!-- Bảng sách -->
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white border border-gray-200 rounded shadow-md">
        <thead class="bg-gray-100 text-left bg-white">
          <tr>
            <th class="p-3 border-b">No.</th>
            <th class="p-3 border-b">Image</th>
            <th class="p-3 border-b">Name</th>
            <th class="p-3 border-b">Price</th>
            <th class="p-3 border-b">Stock</th>
            <th class="p-3 border-b text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(book, index) in paginatedBooks" :key="book._id" class="hover:bg-gray-50">
            <td class="p-3 border-b">{{ (currentPage - 1) * booksPerPage + index + 1 }}</td>
            <td class="p-3 border-b">
              <img :src="'http://localhost:5000' + book.image" alt="Book" class="h-12 w-12 object-cover rounded" />
            </td>
            <td class="p-3 border-b">{{ book.title }}</td>
            <td class="p-3 border-b text-green-700 font-semibold">{{ formatPrice(book.price) }}</td>
            <td class="p-3 border-b">
              <span :class="{ 'text-red-500 font-bold': book.stock === 0 }">
                {{ book.stock === 0 ? 'Out of stock' : book.stock }}
              </span>
            </td>
            <td class="p-3 border-b text-center">
              <button @click="editBook(book._id)" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-1">
                <font-awesome-icon icon="edit" />
              </button>
              <button @click="deleteBook(book._id)" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">
                <font-awesome-icon icon="trash" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Component phân trang -->
    <Pagination
      :current-page="currentPage"
      :total-pages="totalPages"
      @page-change="changePage"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

import InputSearchAdmin from '@/components/InputSearchAdmin.vue'
import Pagination from '@/components/Pagination.vue'

const router = useRouter()

const books = ref([])
const searchQuery = ref('')
const selectedGenre = ref('')
const genres = ref([])

const currentPage = ref(1)
const booksPerPage = 20

const fetchBooks = async () => {
  try {
    const res = await axios.get('http://localhost:5000/api/books')
    books.value = res.data
    genres.value = [...new Set(books.value.map(b => b.genre))]
  } catch (err) {
    console.error('Lỗi khi lấy danh sách sách:', err)
  }
}

onMounted(fetchBooks)

const filteredBooks = computed(() =>
  books.value.filter(book =>
    book.title.toLowerCase().includes(searchQuery.value.toLowerCase()) &&
    (selectedGenre.value === '' || book.genre === selectedGenre.value)
  )
)

watch([searchQuery, selectedGenre], () => {
  currentPage.value = 1
})

const paginatedBooks = computed(() => {
  const start = (currentPage.value - 1) * booksPerPage
  return filteredBooks.value.slice(start, start + booksPerPage)
})

const totalPages = computed(() => Math.ceil(filteredBooks.value.length / booksPerPage))

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' }) // Optional: scroll to top
  }
}

const formatPrice = price => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(price)

const editBook = id => router.push(`/admin/edit-book/${id}`)

const deleteBook = async id => {
  const result = await Swal.fire({
    title: 'Xác nhận xóa',
    text: 'Bạn có chắc chắn muốn xóa sách này?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xóa',
    cancelButtonText: 'Hủy',
   customClass: {
  confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 mr-2 rounded',
  cancelButton: 'bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-4 rounded'
},
    buttonsStyling: false
  })

  if (result.isConfirmed) {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`http://localhost:5000/api/books/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      await fetchBooks()
      Swal.fire('Đã xóa!', 'Cuốn sách đã được xóa.', 'success')
    } catch (err) {
      Swal.fire('Lỗi!', 'Xóa không thành công.', 'error')
    }
  }
}



const onSearch = () => {
  // đã có v-model nên không cần gì thêm
}
</script>

<style scoped>
table th,
table td {
  text-align: left;
  vertical-align: middle;
}
</style>
