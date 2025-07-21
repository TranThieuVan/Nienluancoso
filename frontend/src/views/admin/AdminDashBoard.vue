<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6 text-center">Bảng điều khiển Admin</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Người dùng -->
      <div class="bg-blue-50 shadow rounded-xl p-6 flex items-center gap-4">
        <div class="text-4xl text-blue-600">
          <i class="fas fa-user"></i>
        </div>
        <div>
          <p class="text-sm text-gray-500">Người dùng</p>
          <p class="text-xl font-bold">{{ userCount }}</p>
        </div>
      </div>

      <!-- Sách -->
      <div class="bg-green-50 shadow rounded-xl p-6 flex items-center gap-4">
        <div class="text-4xl text-green-600">
          <i class="fas fa-book"></i>
        </div>
        <div>
          <p class="text-sm text-gray-500">Sách</p>
          <p class="text-xl font-bold">{{ bookCount }}</p>
        </div>
      </div>

      <!-- Đơn hàng -->
      <div class="bg-yellow-50 shadow rounded-xl p-6 flex items-center gap-4">
        <div class="text-4xl text-yellow-600">
          <i class="fas fa-file-invoice-dollar"></i>
        </div>
        <div>
          <p class="text-sm text-gray-500">Đơn hàng</p>
          <p class="text-xl font-bold">{{ orderCount }}</p>
        </div>
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

const fetchStats = async () => {
  try {
    const token = localStorage.getItem('adminToken')
    const headers = { Authorization: `Bearer ${token}` }

    const [userRes, bookRes, orderRes] = await Promise.all([
      axios.get('/api/admin/users', { headers }),
      axios.get('/api/books'),
      axios.get('/api/admin/orders', { headers })
    ])

    userCount.value = userRes.data.length
    bookCount.value = bookRes.data.length
    orderCount.value = orderRes.data.length
  } catch (err) {
    console.error('Lỗi khi lấy thống kê:', err)
  }
}

onMounted(fetchStats)
</script>