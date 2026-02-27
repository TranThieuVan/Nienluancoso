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

          <div>
            <strong>Trạng thái:</strong>
            <ul class="mt-1 space-y-1">
              <li
                v-for="(entry, index) in order.statusHistory"
                :key="index"
                class="flex items-center text-sm"
              >
                <span :class="statusClass(entry.status)">
                  <i v-if="entry.status === 'pending'" class="fas fa-clock mr-1"></i>
                  <i v-if="entry.status === 'shipping'" class="fas fa-check-circle mr-1 text-green-500"></i>
                  <i v-if="entry.status === 'delivered'" class="fas fa-box mr-1 text-green-500"></i>
                  <i v-if="entry.status === 'cancelled'" class="fas fa-times-circle mr-1"></i>
                  {{ translateStatus(entry.status) }} - {{ formatDateTime(entry.date) }}
                </span>
              </li>
            </ul>
          </div>

          <p v-if="order.status === 'cancelled' && order.cancelReason" class="text-red-600 text-sm italic">
            Lý do hủy: {{ order.cancelReason }}
          </p>

          <button
            v-if="order.status === 'pending'"
            @click="openCancelModal(order._id)"
            class="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Hủy đơn
          </button>
        </div>
      </div>
    </div>

    <!-- Modal chọn lý do hủy -->
    <div
      v-if="showCancelModal"
      class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg shadow-lg p-6 w-96 max-w-full">
        <h3 class="text-lg font-semibold mb-4">Lý do hủy đơn hàng</h3>

        <div class="space-y-3">
          <label
            v-for="reason in reasons"
            :key="reason"
            class="flex items-center gap-3 cursor-pointer"
          >
            <input
              type="radio"
              name="cancelReason"
              :value="reason"
              v-model="selectedReason"
              class="form-radio text-red-600"
            />
            <span>{{ reason }}</span>
          </label>
        </div>

        <div class="mt-6 flex justify-end gap-4">
          <button
            @click="cancelModal"
            class="px-4 py-2 border rounded hover:bg-gray-100 transition"
          >
            Hủy
          </button>
          <button
            @click="confirmCancel"
            :disabled="!selectedReason"
            class="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50 hover:bg-red-700 transition"
          >
            Xác nhận
          </button>
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

const showCancelModal = ref(false)
const selectedReason = ref('')
const cancelOrderId = ref(null)
const reasons = [
  'Thay đổi ý định',
  'Đặt nhầm sản phẩm',
  'Tìm thấy giá tốt hơn',
  'Thời gian giao quá lâu',
  'Lý do khác'
]

const formatPrice = (n) => n.toLocaleString('vi-VN') + ' ₫'
const formatAddress = (a) => `${a.street}, ${a.district}, ${a.city}`
const formatDate = (isoString) => new Date(isoString).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })
const formatDateTime = (isoString) => new Date(isoString).toLocaleString('vi-VN')

const translateStatus = (status) => {
  switch (status) {
    case 'pending': return 'Đang xử lý'
    case 'shipping': return 'Đang giao'
    case 'delivered': return 'Đã giao'
    case 'cancelled': return 'Đã hủy'
    default: return status
  }
}

const statusClass = (status) => {
  switch (status) {
    case 'pending': return 'text-yellow-600 font-medium'
    case 'shipping': return 'text-green-600 font-semibold'
    case 'delivered': return 'text-green-600 font-semibold'
    case 'cancelled': return 'text-red-600 font-semibold'
    default: return 'text-gray-600'
  }
}

const loadOrders = async () => {
  try {
    const { data } = await axios.get('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    })
    orders.value = data
  } catch (err) {
    console.error('Lỗi khi tải đơn hàng:', err)
  }
}

onMounted(loadOrders)

const openCancelModal = (orderId) => {
  cancelOrderId.value = orderId
  selectedReason.value = ''
  showCancelModal.value = true
}

const cancelModal = () => {
  showCancelModal.value = false
  selectedReason.value = ''
  cancelOrderId.value = null
}

const confirmCancel = async () => {
  try {
    if (!selectedReason.value) return

    await axios.put(
      `/api/orders/cancel/${cancelOrderId.value}`,
      { reason: selectedReason.value },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    await loadOrders()
    cancelModal()
  } catch (err) {
    console.error(err)
    alert('Hủy đơn hàng thất bại')
  }
}
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>