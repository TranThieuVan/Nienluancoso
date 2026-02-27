<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold mb-6">Quản lý Đơn hàng</h1>

    <table class="min-w-full bg-white text-sm">
      <thead class="bg-gray-100 border-b bg-white text-left">
        <tr>
          <th class="p-3 ">Mã đơn</th>
          <th class="p-3 ">Sản phẩm</th>
          <th class="p-3 ">Người mua</th>
          <th class="p-3 ">Tổng tiền</th>
          <th class="p-3 ">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        
        <tr
          v-for="order in orders"
          :key="order._id"
          class="hover:bg-gray-50 border-b"
        >
          <!-- Cột 1: ID -->
          <td class="p-3  font-semibold text-xs text-gray-700">
            {{ order._id.slice(-6).toUpperCase() }}
          </td>

          <!-- Cột 2: Sản phẩm -->
          <td class="p-3 ">
            <div class="flex items-center gap-2">
              <img
      :src="getImageUrl(order.items[0].book.image)"
      alt="ảnh sách"
      class="w-12 h-16 object-cover rounded "
    />
              <div>
                <p class="font-medium text-gray-800 line-clamp-2">
                  {{ order.items[0]?.book?.title || 'Sản phẩm không xác định' }}
                </p>
                <p v-if="order.items.length > 1" class="text-xs text-gray-500 italic">
                  ... và {{ order.items.length - 1 }} sản phẩm khác
                </p>
              </div>
            </div>
          </td>

          <!-- Cột 3: Người mua -->
          <td class="p-3 ">
            {{ order.user?.name || 'Khách không xác định' }}
          </td>

          <!-- Cột 4: Tổng tiền -->
          <td class="p-3  ">
            {{ formatPrice(order.totalPrice) }}
          </td>

          <!-- Cột 5: Trạng thái -->
          <td class="p-3 ">
            <span :class="statusClass(order.status)">
              {{ translateStatus(order.status) }}
            </span>
          </td>

          <!-- Cột 6: Hành động -->
          <td class="p-3  text-center relative">
            <button @click="toggleMenu(order._id)">
              <font-awesome-icon icon="ellipsis-v" class="text-gray-600 hover:text-black text-xl px-2 py-2" />
            </button>

            <!-- Dropdown menu -->
            <div
              v-if="activeMenu === order._id"
              class="absolute right-0  z-10 mt-2 w-40 bg-white  rounded shadow"
            >
              <button
                class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                @click="viewDetail(order._id)"
              >
                Thông tin chi tiết
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="error" class="mt-4 text-red-600 font-semibold">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'
import { useRouter } from 'vue-router'
const router = useRouter()

library.add(faEllipsisV)
const getImageUrl = (p) => `http://localhost:5000${p}`
const orders = ref([])
const error = ref(null)
const activeMenu = ref(null)

function formatPrice(n) {
  return n.toLocaleString('vi-VN') + ' ₫'
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

function toggleMenu(id) {
  activeMenu.value = activeMenu.value === id ? null : id
}

function viewDetail(orderId) {
  router.push(`/admin/orders/${orderId}`)
  activeMenu.value = null
}
async function fetchOrders() {
  error.value = null
  try {
    const token = localStorage.getItem('adminToken')
    const res = await fetch('/api/admin/orders', {
      headers: { Authorization: 'Bearer ' + token }
    })
    if (!res.ok) throw new Error('Lỗi khi lấy danh sách đơn hàng')
    orders.value = await res.json()
  } catch (err) {
    error.value = err.message
  }
}

onMounted(fetchOrders)
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
