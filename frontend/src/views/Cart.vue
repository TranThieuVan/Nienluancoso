<template>
  <div class="container mx-auto p-6">
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Bên trái (Danh sách giỏ hàng) -->
      <div class="w-full lg:w-3/4">
        <h1 class="text-3xl font-bold text-center mb-6">GIỎ HÀNG CỦA BẠN</h1>
        <div class="bg-gray-100 p-4 space-y-1 ">
          <div v-if="cart.length === 0" class="text-center text-gray-500">Giỏ hàng trống.</div>

          <div
            v-for="item in cart"
            :key="item.book._id"
            class="bg-white p-4  shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <!-- Ảnh + Thông tin -->
            <div class="flex gap-4 sm:flex-1">
              <input
                type="checkbox"
                :value="item.book._id"
                v-model="selectedItems"
                class="w-5 h-5 mt-2"
              />
              <img :src="item.book.image" class="w-16 h-24 object-cover " />
              <div class="flex flex-col justify-between">
                <h3 class="font-semibold text-gray-800 line-clamp-2">
                  {{ item.book.title }}
                </h3>
                <p class="text-sm text-gray-500">{{ item.book.author }}</p>
                <p class="text-sm mt-1 text-gray-700">{{ formatPrice(item.book.price) }} đ</p>
              </div>
            </div>

            <!-- Số lượng + Tổng tiền + Xoá -->
            <div class="flex justify-between sm:justify-end items-center gap-6 flex-wrap sm:flex-nowrap">
              <!-- Số lượng -->
              <div class="flex border  overflow-hidden h-8">
                <button class="px-2  text-lg" @click="item.quantity > 1 && updateQuantity(item.book._id, item.quantity - 1)">−</button>
                <input type="number" :value="item.quantity" readonly class="w-10 text-center outline-none bg-gray-200 no-arrows" />
                <button class="px-2  text-lg" @click="updateQuantity(item.book._id, item.quantity + 1)">+</button>
              </div>

              <!-- Thành tiền -->
              <div class="text-right">
                <p class="text-sm text-gray-600">Thành tiền:</p>
                <p class="text-red-600 font-bold text-lg">{{ formatPrice(item.book.price * item.quantity) }} đ</p>
              </div>

              <!-- Xoá -->
              <button @click="removeItem(item.book._id)" class="text-gray-500 hover:text-black text-xl">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bên phải (Tóm tắt đơn hàng) -->
      <div class="w-full lg:w-1/4 bg-white shadow mt-4 lg:mt-16 p-6 h-fit sticky top-20 ">
        <h2 class="text-xl font-semibold mb-2">THÔNG TIN ĐƠN HÀNG</h2>
        <hr class="mb-4" />

        <!-- Tổng tiền -->
        <div class="flex justify-between items-center text-black mb-6">
          <p class="text-lg font-medium">Tổng tiền</p>
          <p class="text-xl font-bold">{{ formatPrice(totalSelected) }} đ</p>
        </div>

        <!-- Nút thanh toán -->
        <button
          @click="proceedToCheckout"
          class="w-full bg-black text-white py-3 text-center tracking-widest uppercase hover:opacity-90 transition"
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
import { useRouter } from 'vue-router'
import { setCartCount } from '@/composables/cartStore'

const cart = ref([])
const selectedItems = ref([])
const token = localStorage.getItem('token')
const router = useRouter()

const formatPrice = (n) => n.toLocaleString('vi-VN')

onMounted(async () => {
  const { data } = await axios.get('/api/cart', {
    headers: { Authorization: `Bearer ${token}` },
  })
  cart.value = data.items || []
  updateCartCount()

  const preselect = localStorage.getItem('preselectItem')
  if (preselect) {
    selectedItems.value = [preselect]
    localStorage.removeItem('preselectItem')
  }
})

const totalSelected = computed(() =>
  cart.value
    .filter((item) => selectedItems.value.includes(item.book._id))
    .reduce((sum, item) => sum + item.book.price * item.quantity, 0)
)

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
const proceedToCheckout = () => {
  if (selectedItems.value.length === 0) {
    alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán')
    return
  }

  const selected = cart.value.filter(item => selectedItems.value.includes(item.book._id))
  localStorage.setItem('checkoutItems', JSON.stringify(selected))
  router.push('/checkout')
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
