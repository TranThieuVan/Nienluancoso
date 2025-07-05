<template>
  <div class="max-w-6xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Lịch sử đơn hàng</h1>

    <div v-if="orders.length === 0" class="text-center text-gray-500 italic">
      Bạn chưa có đơn hàng nào.
    </div>

    <div
      v-for="order in orders"
      :key="order._id"
      class="border rounded-xl p-4 mb-6 bg-white shadow-sm space-y-4"
    >
      <div class="flex justify-between items-center">
        <p class="font-semibold text-gray-800">Mã đơn: {{ order._id.slice(-6).toUpperCase() }}</p>
        <p class="text-sm text-gray-500">{{ formatDate(order.createdAt) }}</p>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <!-- Danh sách sách -->
        <div class="space-y-3">
          <div v-for="item in order.items" :key="item.book._id" class="flex items-center gap-3">
            <img :src="item.book.image" class="w-12 h-16 object-cover rounded" />
            <div class="flex-1">
              <p class="font-semibold text-gray-800 line-clamp-2">{{ item.book.title }}</p>
              <p class="text-sm text-gray-600">x{{ item.quantity }}</p>
            </div>
            <div class="font-semibold text-gray-700">
              {{ formatPrice(item.book.price * item.quantity) }}
            </div>
          </div>
        </div>

        <!-- Thông tin đơn -->
        <div class="bg-gray-50 p-4 rounded border space-y-2 text-sm text-gray-700">
          <p><strong>Người nhận:</strong> {{ order.shippingAddress.fullName }}</p>
          <p><strong>SĐT:</strong> {{ order.shippingAddress.phone }}</p>
          <p><strong>Địa chỉ:</strong> {{ formatAddress(order.shippingAddress) }}</p>
          <p>
            <strong>Tổng tiền: </strong>
            <span class="text-red-600 font-bold">{{ formatPrice(order.totalPrice) }}</span>
          </p>
          <p>
            <strong>Trạng thái: </strong>
            <span :class="statusClass(order.status)">
              <i v-if="order.status === 'pending'" class="fas fa-clock mr-1"></i>
              <i v-if="order.status === 'shipped'" class="fas fa-check-circle mr-1"></i>
              <i v-if="order.status === 'cancelled'" class="fas fa-times-circle mr-1"></i>
              {{ translateStatus(order.status) }}
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const orders = ref([])
const token = localStorage.getItem('token')

const formatPrice = (n) => n.toLocaleString('vi-VN') + ' ₫'

const formatAddress = (a) => `${a.street}, ${a.district}, ${a.city}`

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const translateStatus = (status) => {
  switch (status) {
    case 'pending':
      return 'Đang xử lý'
    case 'shipped':
      return 'Đã giao'
    case 'cancelled':
      return 'Đã hủy'
    default:
      return status
  }
}

const statusClass = (status) => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 font-medium'
    case 'shipped':
      return 'text-green-600 font-semibold'
    case 'cancelled':
      return 'text-red-600 font-semibold'
    default:
      return 'text-gray-600'
  }
}

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    })
    orders.value = data
  } catch (err) {
    console.error('Lỗi khi tải đơn hàng:', err)
  }
})
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
