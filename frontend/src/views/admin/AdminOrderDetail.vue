<template>
  <div class="p-6 max-w-6xl mx-auto space-y-6">
    <h1 class="text-2xl font-bold text-gray-800 mb-4">Chi tiết đơn hàng</h1>

    <!-- Info top section -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-green-200 p-4 rounded flex items-start gap-3">
        <i class="fas fa-shopping-cart text-xl text-green-700"></i>
        <div>
          <p class="font-semibold text-gray-700">Đơn hàng được tạo ngày</p>
          <p class="text-sm text-gray-800">{{ formatDate(order.createdAt) }}</p>
        </div>
      </div>

      <div class="bg-red-200 p-4 rounded flex items-start gap-3">
        <i class="fas fa-user text-xl text-red-700"></i>
        <div>
          <p class="font-semibold text-gray-700">Tên người dùng</p>
          <p class="text-sm text-gray-800">{{ order.user?.name || 'Ẩn danh' }}</p>
        </div>
      </div>

      <div class="bg-yellow-200 p-4 rounded flex items-start gap-3">
        <i class="fas fa-envelope text-xl text-yellow-700"></i>
        <div>
          <p class="font-semibold text-gray-700">Email</p>
          <p class="text-sm text-gray-800">{{ order.user?.email || 'Không có email' }}</p>
        </div>
      </div>

      <div class="bg-blue-200 p-4 rounded flex items-start gap-3">
        <i class="fas fa-phone text-xl text-blue-700"></i>
        <div>
          <p class="font-semibold text-gray-700">Số điện thoại</p>
          <p class="text-sm text-gray-800">
            {{ order.shippingAddress?.phone || 'Không có SĐT' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Left: Order Summary -->
      <div class="md:col-span-2 bg-white rounded px-2">
        <h2 class="text-xl font-semibold mb-4 text-gray-800 text-center mt-2">Tổng hợp đơn hàng</h2>
        <div class="overflow-hidden">
          <div class="grid grid-cols-5 font-medium text-gray-700 text-sm p-2">
            <div>Hình ảnh</div>
            <div class="col-span-2">Tên sách</div>
            <div>Số lượng</div>
            <div>Đơn giá</div>
          </div>
          <div
            v-for="item in order.items"
            :key="item.book._id"
            class="grid grid-cols-5 items-center p-2 border-t"
          >
            <img
              :src="getImageUrl(item.book.image)"
              alt="book"
              class="w-12 h-16 object-cover rounded"
            />
            <div class="col-span-2 text-gray-800">{{ item.book.title }}</div>
            <div class="text-gray-700">{{ item.quantity }}</div>
            <div class="text-gray-700">{{ formatPrice(item.book.price) }}</div>
          </div>
        </div>

        <!-- Tổng tiền -->
        <div class="text-right font-semibold text-gray-800 mt-4space-y-1 p-3 rounded">
          <p>Tổng giá sách: <span class="text-gray-800">{{ formatPrice(subTotal) }}</span></p>
          <p>Phí vận chuyển: <span class="text-gray-800">{{ formatPrice(order.shippingFee || 0) }}</span></p>
          <p class="text-lg mt-1">Tổng cộng: <span class="text-red-600 font-bold">{{ formatPrice(totalAmount) }}</span></p>
        </div>
      </div>

      <!-- Right: Recipient Info -->
      <div>
        <div class="bg-gray-50 p-4 rounded border space-y-2 text-sm text-gray-700">
          <p><strong>Người nhận:</strong> {{ order.shippingAddress?.fullName || 'Ẩn danh' }}</p>
          <p><strong>SĐT:</strong> {{ order.shippingAddress?.phone || 'Không có SĐT' }}</p>
          <p><strong>Địa chỉ:</strong> {{ formatAddress(order.shippingAddress) }}</p>

          <div class="mt-4">
            <label class="block font-semibold mb-1">Trạng thái đơn hàng</label>
            <select
              v-model="order.status"
              @change="confirmStatusChange"
              :disabled="order.status === 'cancelled'"
              class="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100"
            >
              <option value="pending">Đang xử lý</option>
              <option value="shipping">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <button
            v-if="order.status === 'cancelled'"
            @click="deleteOrder"
            class="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
          >
            Xóa đơn hàng
          </button>
                  <!-- Lịch sử trạng thái -->
        <div class="mt-6">
          <h3 class="font-semibold text-gray-700 mb-2 text-center mt-5">Lịch sử trạng thái</h3>
          <ul class="space-y-1 text-sm text-gray-600">
            <li v-for="(entry, index) in order.statusHistory" :key="index">
              <span class="font-medium">{{ translateStatus(entry.status) }}</span> - {{ formatDateTime(entry.date) }}
            </li>
          </ul>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Swal from 'sweetalert2'

const route = useRoute()
const router = useRouter()

const order = ref({})
const previousStatus = ref('')

const formatDate = (iso) => new Date(iso).toLocaleDateString('vi-VN', {
  year: 'numeric', month: 'short', day: 'numeric',
})

const formatDateTime = (iso) => new Date(iso).toLocaleString('vi-VN')

const formatAddress = (a) => `${a?.street || ''}, ${a?.district || ''}, ${a?.city || ''}`

const getImageUrl = (path) => `http://localhost:5000${path}`

const formatPrice = (num) => (num || 0).toLocaleString('vi-VN') + 'đ'

const translateStatus = (s) => {
  switch (s) {
    case 'pending': return 'Đang xử lý'
    case 'shipping': return 'Đang giao'
    case 'delivered': return 'Đã giao'
    case 'cancelled': return 'Đã hủy'
    default: return s
  }
}

const allowedStatusTransitions = {
  pending: ['shipping'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: []
}

const subTotal = computed(() => {
  return order.value.items?.reduce((sum, item) => sum + item.quantity * item.book.price, 0) || 0
})

const totalAmount = computed(() => {
  return subTotal.value + (order.value.shippingFee || 0)
})

const confirmStatusChange = async (event) => {
  const newStatus = event.target.value
  const currentStatus = previousStatus.value

  const allowedNext = allowedStatusTransitions[currentStatus]
  if (!allowedNext.includes(newStatus)) {
    alert(`❌ Không thể đổi từ "${translateStatus(currentStatus)}" sang "${translateStatus(newStatus)}"`)
    order.value.status = currentStatus
    return
  }

  const confirmChange = confirm(`Bạn có chắc muốn đổi trạng thái từ "${translateStatus(currentStatus)}" sang "${translateStatus(newStatus)}"?`)
  if (!confirmChange) {
    order.value.status = currentStatus
    return
  }

  try {
    const token = localStorage.getItem('adminToken')
    await axios.put(`/api/admin/orders/${order.value._id}/status`, {
      status: newStatus
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    previousStatus.value = newStatus
    order.value.status = newStatus
    order.value.statusHistory.push({
      status: newStatus,
      date: new Date().toISOString()
    })

    alert('✅ Cập nhật trạng thái thành công!')
  } catch (err) {
    console.error('Lỗi khi cập nhật trạng thái:', err)
    alert('❌ Cập nhật trạng thái thất bại')
    order.value.status = currentStatus
  }
}

const deleteOrder = async () => {
  const confirm = await Swal.fire({
    title: 'Bạn có chắc muốn xóa?',
    text: 'Hành động này sẽ xóa vĩnh viễn đơn hàng khỏi hệ thống!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#e3342f',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Xóa đơn hàng',
    cancelButtonText: 'Hủy'
    
  })

  if (confirm.isConfirmed) {
    try {
      const token = localStorage.getItem('adminToken')
      await axios.delete(`/api/admin/orders/${order.value._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      await Swal.fire('Đã xóa!', 'Đơn hàng đã bị xóa khỏi hệ thống.', 'success')
      router.push('/admin/orders')
    } catch (err) {
      console.error('Lỗi khi xóa đơn hàng:', err)
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể xóa đơn hàng.', 'error')
    }
  }
}

const fetchOrder = async () => {
  const id = route.params.id
  const token = localStorage.getItem('adminToken')

  try {
    const { data } = await axios.get(`/api/admin/orders/${id}`, {
      headers: { Authorization: 'Bearer ' + token },
    })

    order.value = data
    previousStatus.value = data.status
  } catch (err) {
    console.error('Lỗi khi lấy đơn hàng:', err)
  }
}

onMounted(fetchOrder)

</script>
