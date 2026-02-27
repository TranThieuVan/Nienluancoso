<template>
  <div class="p-6 bg-gray-100 min-h-screen">
    <h1 class="text-2xl font-bold mb-6 text-center text-gray-800">QUẢN LÝ CHUNG</h1>

    <!-- Thống kê nhanh -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-blue-100 shadow rounded-xl p-6 flex items-center gap-4 bigger-small">
        <div class="text-4xl text-blue-600">
          <i class="fas fa-user"></i>
        </div>
        <div>
          <p class="text-sm text-gray-600">Người dùng</p>
          <p class="text-xl font-bold text-gray-800">{{ userCount }}</p>
        </div>
      </div>

      <div class="bg-green-100 shadow rounded-xl p-6 flex items-center gap-4 bigger-small">
        <div class="text-4xl text-green-600">
          <i class="fas fa-book"></i>
        </div>
        <div>
          <p class="text-sm text-gray-600">Sách</p>
          <p class="text-xl font-bold text-gray-800">{{ bookCount }}</p>
        </div>
      </div>

      <div class="bg-yellow-100 shadow rounded-xl p-6 flex items-center gap-4 bigger-small">
        <div class="text-4xl text-yellow-600">
          <i class="fas fa-file-invoice-dollar"></i>
        </div>
        <div>
          <p class="text-sm text-gray-600">Đơn hàng</p>
          <p class="text-xl font-bold text-gray-800">{{ orderCount }}</p>
        </div>
      </div>
    </div>

    <!-- Khu vực bảng dữ liệu -->
    <div class="w-full max-w-7xl mx-auto mt-10 flex flex-col lg:flex-row gap-6 items-stretch">

      <!-- Cột trái: đơn hàng + top sách -->
      <div class="lg:w-3/5 w-full flex flex-col gap-6">
        <!-- Top sách bán chạy -->
        <div class="bg-emerald-100 shadow-md rounded-xl overflow-x-auto flex-grow">
          <h2 class="text-lg font-bold px-4 py-3 border-b bg-emerald-100 text-emerald-700 rounded-t-xl">Top 5 sách bán chạy</h2>
          <table class="w-full text-sm text-left text-gray-700 min-w-[600px]">
            <thead class="bg-emerald-200 text-gray-600 uppercase text-xs">
              <tr>
                <th class="px-3 py-2 text-center">Top</th>
                <th class="px-3 py-2 text-center">Ảnh</th>
                <th class="px-3 py-2">Tên sách</th>
                <th class="px-3 py-2">Tác giả</th>
                <th class="px-3 py-2 text-center">Đã bán</th>
              </tr>
            </thead>
            <tbody class="bg-emerald-100">
              <tr v-for="(book, index) in topSellingBooks" :key="book._id" class="border-t hover:bg-emerald-200">
                <td class="px-3 py-2 text-center font-semibold">{{ index + 1 }}</td>
                <td class="px-3 py-2 text-center">
                  <img :src="book.image" class="w-10 h-14 object-cover rounded shadow-sm mx-auto" />
                </td>
                <td class="px-3 py-2 font-medium truncate max-w-[150px]">{{ book.title }}</td>
                <td class="px-3 py-2 truncate max-w-[100px]">{{ book.author }}</td>
                <td class="px-3 py-2 text-center text-red-700 font-semibold">{{ book.totalSold }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Đơn hàng gần đây -->
        <div class="bg-cyan-100 shadow-md rounded-xl overflow-x-auto flex-grow">
          <h2 class="text-lg font-bold px-4 py-3 border-b bg-cyan-100 text-cyan-700 rounded-t-xl">5 Đơn hàng gần đây</h2>
          <table class="w-full text-sm text-left text-gray-700 min-w-[500px]">
            <thead class="bg-cyan-200 text-gray-600 uppercase text-xs">
              <tr>
                <th class="px-3 py-2">Khách hàng</th>
                <th class="px-3 py-2 text-center">Tổng tiền</th>
                <th class="px-3 py-2">Trạng thái</th>
                <th class="px-3 py-2">Ngày tạo</th>
              </tr>
            </thead>
            <tbody class="bg-cyan-100">
              <tr v-for="order in recentOrders" :key="order._id" class="border-t hover:bg-cyan-200">
                <td class="px-3 py-2">{{ order.user?.name }}</td>
                <td class="text-center font-semibold text-green-600">
                  {{ formatCurrency(order.totalPrice) }}
                </td>
                <td class="px-3 py-2 capitalize" :class="statusClass(order.status)">
                  {{ translateStatus(order.status) }}
                </td>
                <td class="px-3 py-2">{{ formatDate(order.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Cột phải: sách sắp hết -->
      <div class="lg:w-2/5 w-full flex flex-col bg-rose-100 shadow-md rounded-xl h-full">
        <h2 class="text-lg font-bold px-4 py-3 border-b bg-rose-100 text-rose-700 rounded-t-xl">Sách sắp hết hàng</h2>
        <table class="w-full text-sm text-left text-gray-700">
          <thead class="bg-rose-200 text-gray-600 uppercase text-xs">
            <tr>
              <th class="px-3 py-2 text-center">Ảnh</th>
              <th class="px-3 py-2">Tên sách</th>
              <th class="px-3 py-2 text-center">Số lượng</th>
            </tr>
          </thead>
          <tbody class="bg-rose-100">
            <tr v-for="book in lowStockBooks" :key="book._id" class="border-t hover:bg-rose-100">
              <td class="px-3 py-2 text-center">
                <img :src="book.image" class="w-10 h-14 object-cover rounded shadow-sm mx-auto" />
              </td>
              <td class="px-3 py-2 font-medium truncate max-w-[150px]">{{ book.title }}</td>
              <td class="px-3 py-2 text-center font-semibold text-red-600">{{ book.stock }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const userCount = ref(0)
const bookCount = ref(0)
const orderCount = ref(0)
const topSellingBooks = ref([])
const recentOrders = ref([]) // 🆕 Đơn hàng gần đây
const lowStockBooks = ref([]) // 🆕


const fetchLowStockBooks = async () => {
  try {
    const res = await axios.get('/api/books/low-stock')
    lowStockBooks.value = res.data
  } catch (err) {
    console.error('Lỗi khi lấy sách sắp hết hàng:', err)
  }
}



const formatCurrency = (value) => {
  if (!value) return '0₫'
  return Number(value).toLocaleString('vi-VN') + '₫'
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const fetchStats = async () => {
  try {
    const token = localStorage.getItem('adminToken')
    const headers = { Authorization: `Bearer ${token}` }

    const [userRes, bookRes, orderRes, topBooksRes] = await Promise.all([
      axios.get('/api/admin/users', { headers }),
      axios.get('/api/books'),
      axios.get('/api/admin/orders', { headers }),
      axios.get('/api/books/top-selling'),
      axios.get('/api/books/low-stock') // 🆕 API sách sắp hết hàng

    ])

    userCount.value = userRes.data.length
    bookCount.value = bookRes.data.length
    orderCount.value = orderRes.data.length
    topSellingBooks.value = topBooksRes.data

    // 🆕 Lấy 5 đơn hàng mới nhất
    recentOrders.value = orderRes.data.slice(0, 5)
        lowStockBooks.value = lowStockRes.data // 🆕

  } catch (err) {
    console.error('Lỗi khi lấy thống kê:', err)
  }
}

function translateStatus(status) {
  switch (status) {
    case 'pending': return 'Đang xử lý'
    case 'shipping': return 'Đang giao'
    case 'delivered': return 'Đã giao'
    case 'cancelled': return 'Đã hủy'
    default: return status
  }
}

function statusClass(status) {
  switch (status) {
    case 'pending': return 'text-yellow-600 font-medium'
    case 'shipping':
    case 'delivered': return 'text-green-600 font-medium'
    case 'cancelled': return 'text-red-600 font-medium'
    default: return 'text-gray-600'
  }
}

onMounted(() => {
  fetchStats()
  fetchLowStockBooks() // 🆕
})
</script>
