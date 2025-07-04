<template>
  <div class="container mx-auto p-6">
    <div class="flex gap-6">
      <!-- Bên trái 75% -->
      <div class="w-3/4">
        <h1 class="text-3xl font-bold-300 text-center mb-6">GIỎ HÀNG CỦA BẠN</h1>
        <div class="w-100% bg-gray-100 p-6  space-y-6">
          <div v-if="cart.length === 0" class="text-center text-gray-500">Giỏ hàng trống.</div>

          <div v-for="item in cart" :key="item.book._id" class="bg-white p-4 flex flex-col space-y-4">
            <div class="flex items-center justify-between gap-4">
              <!-- Checkbox -->
              <input
                type="checkbox"
                :value="item.book._id"
                v-model="selectedItems"
                class="w-5 h-5"
              />

              <!-- Ảnh -->
              <img :src="item.book.image" alt="book" class="w-16 h-24 object-cover" />

              <!-- Tên và tác giả -->
              <div class="w-1/3 truncate">
                <h3 class="font-semibold truncate">{{ item.book.title }}</h3>
                <p class="text-sm text-gray-500 truncate">{{ item.book.author }}</p>
              </div>

              <!-- Giá -->
              <div class="text-#333 font-semibold w-24 text-right">{{ formatPrice(item.book.price) }} đ</div>

              <!-- Số lượng -->
              <div class="flex h-8 items-center border rounded overflow-hidden">
                <button class="px-3 py-1 text-lg" @click="item.quantity > 1 && updateQuantity(item.book._id, item.quantity - 1)">−</button>
                <input type="number" :value="item.quantity" readonly class="w-10 py-3 text-center outline-none bg-gray-200 no-arrows" />
                <button class="px-3 py-1 text-lg" @click="updateQuantity(item.book._id, item.quantity + 1)">+</button>
              </div>

              <!-- Tổng tiền + Xoá -->
              <div class="text-right w-32 flex flex-col items-center justify-center">
                <p class="text-sm text-gray-600">Thành tiền:
                  <span class="block text-red-600 font-bold text-lg">
                    {{ formatPrice(item.book.price * item.quantity) }} đ
                  </span>
                </p>
                <button @click="removeItem(item.book._id)" class="text-gray-500 hover:text-black text-lg mt-2">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bên phải 25% -->
      <div class="w-1/4 bg-white shadow mt-16 p-6 h-fit" style="position: sticky; top: 80px;">
        <h2 class="text-xl font-semibold mb-2">THÔNG TIN ĐƠN HÀNG</h2>
        <hr class="mb-4" />

        <!-- Tổng tiền -->
        <div class="flex justify-between items-center text-black mb-6">
          <p class="text-lg font-medium">Tổng tiền</p>
          <p class="text-xl font-bold">{{ formatPrice(totalSelected) }} đ</p>
        </div>

        <!-- Nút thanh toán -->
        <router-link to="/checkout" class="block bg-black text-white py-3 text-center tracking-widest uppercase hover:opacity-90 transition">
          Thanh toán
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { setCartCount } from '@/composables/cartStore'

const cart = ref([])
const selectedItems = ref([])
const token = localStorage.getItem('token')
const formatPrice = (n) => n.toLocaleString('vi-VN')

onMounted(async () => {
  const { data } = await axios.get('/api/cart', {
    headers: { Authorization: `Bearer ${token}` },
  })
  cart.value = data.items || []
  updateCartCount()

  // Auto-tick nếu có preselectItem trong localStorage
  const preselect = localStorage.getItem('preselectItem')
  if (preselect) {
    selectedItems.value = [preselect]
    localStorage.removeItem('preselectItem')
  }
})

const total = computed(() =>
  cart.value.reduce((sum, item) => sum + item.book.price * item.quantity, 0)
)

const totalSelected = computed(() => {
  return cart.value
    .filter((item) => selectedItems.value.includes(item.book._id))
    .reduce((sum, item) => sum + item.book.price * item.quantity, 0)
})

const updateCartCount = () => {
  const totalQty = cart.value.reduce((sum, i) => sum + i.quantity, 0)
  setCartCount(totalQty)
}

const updateQuantity = async (bookId, quantity) => {
  try {
    await axios.put('/api/cart/update', { bookId, quantity }, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const item = cart.value.find(i => i.book._id === bookId)
    if (item) item.quantity = quantity
    updateCartCount()
  } catch (err) {
    console.error('Lỗi cập nhật số lượng:', err)
  }
}

const removeItem = async (bookId) => {
  try {
    await axios.delete(`/api/cart/remove/${bookId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    cart.value = cart.value.filter(i => i.book._id !== bookId)
    selectedItems.value = selectedItems.value.filter(id => id !== bookId)
    updateCartCount()
  } catch (err) {
    console.error('Lỗi khi xoá khỏi giỏ:', err)
  }
}
</script>

<style scoped>
input[type="number"].no-arrows::-webkit-outer-spin-button,
input[type="number"].no-arrows::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"].no-arrows {
  -moz-appearance: textfield;
}
</style>
