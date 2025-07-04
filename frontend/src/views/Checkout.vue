<template>
  <div class="max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-6">
    <!-- LEFT (40%) - Selected Cart Items -->
    <div class="md:w-2/5 w-full bg-white shadow rounded-xl p-4 space-y-4">
      <h2 class="text-xl font-bold text-gray-800">Sản phẩm đã chọn</h2>

      <div v-if="cart.length">
        <div v-for="item in cart" :key="item.book._id" class="flex gap-3 items-center border-b pb-3">
          <img :src="`${item.book.image}`" class="w-16 h-20 object-cover rounded shadow" />
          <div class="flex-1">
            <p class="font-semibold text-gray-800 line-clamp-2">{{ item.book.title }}</p>
            <p class="text-sm text-gray-500">x{{ item.quantity }}</p>
          </div>
          <div class="font-semibold text-gray-700">{{ formatPrice(item.book.price * item.quantity) }}</div>
        </div>

        <div class="text-right font-bold text-lg pt-4 border-t">
          Tổng tiền: {{ formatPrice(totalPrice) }}
        </div>
      </div>
      <div v-else class="text-gray-500 italic">Không có sản phẩm nào được chọn.</div>
    </div>

    <!-- RIGHT (60%) - Shipping Info -->
    <div class="md:w-3/5 w-full bg-white shadow rounded-xl p-6 space-y-4">
      <h2 class="text-xl font-bold text-gray-800">Địa chỉ giao hàng</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block font-medium mb-1">Họ và tên</label>
          <input
            v-model="form.fullName"
            type="text"
            :readonly="true"
            :class="['input-style', 'cursor-not-allowed bg-gray-100']"
          />
        </div>
        <div>
          <label class="block font-medium mb-1">Số điện thoại</label>
          <input
            v-model="form.phone"
            type="text"
            :readonly="true"
            :class="['input-style', 'cursor-not-allowed bg-gray-100']"
          />
        </div>
      </div>

      <div>
        <label class="block font-medium mb-1">Địa chỉ nhà</label>
        <input
          v-model="form.street"
          type="text"
          :readonly="true"
          :class="['input-style', 'cursor-not-allowed bg-gray-100']"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block font-medium mb-1">Quận/Huyện</label>
          <input
            v-model="form.district"
            type="text"
            :readonly="true"
            :class="['input-style', 'cursor-not-allowed bg-gray-100']"
          />
        </div>
        <div>
          <label class="block font-medium mb-1">Thành phố</label>
          <input
            v-model="form.city"
            type="text"
            :readonly="true"
            :class="['input-style', 'cursor-not-allowed bg-gray-100']"
          />
        </div>
      </div>

      <div class="text-right pt-4">
        <button @click="submitOrder" class="btn-primary">Xác nhận đặt hàng</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const token = localStorage.getItem('token')
const cart = ref([])
const totalPrice = ref(0)
const form = ref({ fullName: '', phone: '', street: '', district: '', city: '' })
const router = useRouter()

const formatPrice = (n) => n.toLocaleString('vi-VN') + '₫'

onMounted(async () => {
  try {
    const selected = localStorage.getItem('checkoutItems')
    if (!selected) {
      alert('Không có sản phẩm nào được chọn để thanh toán.')
      return router.push('/cart')
    }

    cart.value = JSON.parse(selected)
    totalPrice.value = cart.value.reduce(
      (sum, item) => sum + item.book.price * item.quantity,
      0
    )

    const addrRes = await axios.get('/api/addresses', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (addrRes.data.length > 0) {
      form.value = { ...addrRes.data[0] }
    }
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu:', err)
  }
})

const submitOrder = async () => {
  const { fullName, phone, street, district, city } = form.value
  if (!fullName || !phone || !street || !district || !city) {
    return alert('Thiếu thông tin giao hàng')
  }

  try {
    await axios.post(
      '/api/orders',
      {
        items: cart.value,
        shippingAddress: form.value,
        total: totalPrice.value
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    alert('Đặt hàng thành công!')
    localStorage.removeItem('checkoutItems')
    router.push('/orders')
  } catch (err) {
    alert('Lỗi đặt hàng')
  }
}
</script>

<style scoped>
.input-style {
  @apply w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500;
}
.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition;
}
</style>