<template>
  <div class="container mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">🛒 Giỏ Hàng Của Bạn</h1>

    <!-- Nếu giỏ hàng trống -->
    <div v-if="cart.length === 0" class="text-center text-gray-500">
      Giỏ hàng trống.
    </div>

    <!-- Nếu có sách trong giỏ -->
    <div v-else class="flex gap-6 items-start">
      <!-- Cột trái -->
      <div class="w-3/5 space-y-4">
        <div
          v-for="item in cart"
          :key="item._id"
          class="relative bg-white rounded-2xl shadow-[0_0_12px_rgba(0,0,0,0.08)] p-4 hover:shadow-lg transition-shadow flex gap-4  w-[95%] max-w-[700px] mx-auto"
        >
          <!-- Icon xoá -->
          <button
            @click="removeItem(item.bookId._id)"
            class="absolute top-2 right-2 text-gray-400 hover:text-red-600 text-xl"
            title="Xoá"
          >
            ✕
          </button>

          <!-- Ảnh sách -->
          <img
            :src="item.bookId.image"
            alt="book cover"
            class="w-24 h-32 object-cover rounded-xl"
          />

          <!-- Nội dung -->
          <div class="flex-1 flex flex-col justify-between">
            <div>
              <h3 class="font-semibold text-lg">{{ item.bookId.title }}</h3>
              <p class="text-gray-600">{{ item.bookId.author }}</p>
              <p class="text-[#8B4513] font-bold">
                {{ formatPrice(item.bookId.price) }} đ
              </p>
            </div>

            <div class="flex items-center gap-3 mt-3">
              <input
                type="number"
                v-model.number="item.quantity"
                @change="updateQuantity(item)"
                class="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                min="1"
              />
            </div>

            <!-- Nút mua -->
            <div class="mt-4 text-right">
              <button
                class="bg-[#8B4513] text-white px-4 py-2 rounded-3xl	 hover:bg-[#6B3510] transition-colors text-sm"
                @click="buyItem(item)"
              >
                Mua
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cột phải -->
      <!-- Cột phải: Tổng tiền + Thanh toán -->
<div
  class="w-2/5 bg-white rounded-2xl shadow-[0_0_12px_rgba(0,0,0,0.08)] p-6 flex flex-col gap-6 mr-20"
  style="position: sticky; top: 80px;"
>
  <!-- Chi tiết từng sách -->
  <div class="space-y-2">
    <h2 class="text-xl font-semibold mb-2">Chi tiết giỏ hàng</h2>
    <div
      v-for="item in cart"
      :key="item.bookId._id"
      class="flex justify-between text-sm text-gray-700"
    >
      <span class="truncate w-2/3" title="">{{ item.bookId.title }}</span>
      <span>
        {{ formatPrice(item.bookId.price) }} đ × {{ item.quantity }}
      </span>
    </div>
  </div>

  <!-- Tổng tiền -->
  <div>
    <h2 class="text-2xl font-semibold mt-4">Tổng tiền</h2>
    <p class="text-3xl text-[#8B4513] font-bold">
      {{ formatPrice(total) }} đ
    </p>
  </div>

  <!-- Nút thanh toán -->
  <button
    class="bg-[#8B4513] text-white py-3 rounded-xl text-xl hover:bg-[#6B3510] transition-colors"
    @click="checkout"
  >
    Thanh toán
  </button>
</div>

    </div>
  </div>
</template>


<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { setCartCount } from '@/composables/cartStore'
const cart = ref([])

const formatPrice = (price) => price.toLocaleString('vi-VN')

// ✅ Tải giỏ hàng khi mounted
onMounted(async () => {
  const token = localStorage.getItem('token')
  const { data } = await axios.get('http://localhost:5000/api/cart', {
    headers: { Authorization: `Bearer ${token}` },
  })
  cart.value = data.items || [] // backend trả về { userId, items }
  
  // Cập nhật cartCount khi mới load giỏ hàng
  const totalQuantity = cart.value.reduce((sum, item) => sum + item.quantity, 0)
  setCartCount(totalQuantity)
})

// 🧮 Tổng tiền
const total = computed(() =>
  cart.value.reduce((sum, item) => sum + item.bookId.price * item.quantity, 0)
)

  // 🛠 Cập nhật số lượng
  const updateQuantity = async (item) => {
  const token = localStorage.getItem('token')
  try {
    await axios.put(
      'http://localhost:5000/api/cart/update',
      {
        bookId: item.bookId._id,
        quantity: item.quantity,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    // Cập nhật lại tổng số lượng từ cart hiện tại
    const totalQuantity = cart.value.reduce((sum, i) => sum + i.quantity, 0)
    setCartCount(totalQuantity)
  } catch (error) {
    console.error('Lỗi cập nhật số lượng:', error)
  }
}

// ❌ Xoá khỏi giỏ
const removeItem = async (bookId) => {
  const token = localStorage.getItem('token')
  try {
    await axios.delete(`http://localhost:5000/api/cart/remove/${bookId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // Cập nhật lại cart local
    cart.value = cart.value.filter((item) => item.bookId._id !== bookId)

    // Tính lại tổng số lượng hiện tại
    const totalQuantity = cart.value.reduce((sum, item) => sum + item.quantity, 0)
    setCartCount(totalQuantity)
  } catch (error) {
    console.error('Lỗi khi xoá khỏi giỏ:', error)
  }
}
</script>
