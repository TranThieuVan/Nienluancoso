<template>
  <div class="max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-6 items-start">
    <!-- LEFT - Cart -->
    <div class="md:w-2/5 w-full bg-white shadow  p-4 space-y-4">
      <h2 class="text-xl font-bold text-gray-800">Sản phẩm đã chọn</h2>

      <div v-if="cart.length">
        <div
          v-for="item in cart"
          :key="item.book._id"
          class="flex gap-3 items-center border-b pb-3 hover:bg-gray-100"
        >
          <img :src="item.book.image" class="w-16 h-20 object-cover rounded shadow" />
          <div class="flex-1">
            <p class="font-semibold text-gray-800 line-clamp-2">{{ item.book.title }}</p>
            <p class="text-sm text-gray-500">x{{ item.quantity }}</p>
          </div>
          <div class="font-semibold text-gray-700">
            {{ formatPrice(item.book.price * item.quantity) }}
          </div>
        </div>

        <div class="pt-4 border-t space-y-1 text-right font-medium text-gray-800">
          <p>Tổng giá sách: <span>{{ formatPrice(subTotal) }}</span></p>
          <p>Phí vận chuyển: <span>{{ formatPrice(shippingFee) }}</span></p>
          <p class="text-lg font-bold pt-1">
            Tổng cộng: <span class="text-red-600">{{ formatPrice(totalAmount) }}</span>
          </p>
        </div>
      </div>
      <div v-else class="text-gray-500 italic">Không có sản phẩm nào được chọn.</div>
    </div>

    <!-- RIGHT - Shipping -->
    <div class="md:w-3/5 w-full bg-white shadow  p-6 space-y-4 sticky top-[80px]">
      <h2 class="text-xl font-bold text-gray-800">Địa chỉ giao hàng</h2>

      <!-- Nếu đã có địa chỉ -->
      <div
        v-if="form && form.fullName"
        class="border border-gray-300 py-1 px-2 bg-gray-50 flex items-center justify-between"
      >
        <div>
          <p class="font-medium">{{ form.fullName }} | {{ form.phone }}</p>
          <p class="text-gray-700">{{ formatAddress(form) }}</p>
        </div>
        <button @click="showAddressModal = true" class="py-1 px-4 hover-flip-btn">Thay đổi</button>
      </div>

      <!-- Nếu chưa có địa chỉ -->
      <div
        v-else
        class="border border-gray-300 py-6 px-4 bg-gray-50 text-center text-gray-600 rounded flex items-center justify-between"
      >
        <p class="mb-2">Bạn chưa có địa chỉ giao hàng</p>
        <button @click="showAddressModal = true; showNewAddressForm = true" class="hover-flip-btn px-4 py-2">
          Thêm địa chỉ
        </button>
      </div>

      <div class="text-right pt-4">
        <button
          @click="submitOrder"
          class="py-2 px-4 font-semibold hover-flip-btn transition"
        >
          XÁC NHẬN ĐẶT HÀNG
        </button>
      </div>
    </div>
  </div>

  <!-- 📦 Address Modal -->
  <div v-if="showAddressModal" class="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
    <div class="bg-white w-[90%] max-w-xl rounded-lg p-6 shadow space-y-4 relative">
      <h3 class="text-lg font-bold text-gray-800 mb-2">Chọn địa chỉ giao hàng</h3>

      <div class="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        <div v-for="addr in addresses" :key="addr._id" class="flex items-center gap-2">
          <input type="radio" :value="addr._id" v-model="tempSelectedAddressId" />
          <label class="cursor-pointer">
            <strong>{{ addr.fullName }}</strong> | {{ formatAddress(addr) }}
          </label>
        </div>
      </div>

      <div class="pt-4 border-t mt-4">
        <button @click="showNewAddressForm = !showNewAddressForm" class="text-blue-600 hover:underline text-sm">
          ➕ Thêm địa chỉ mới
        </button>
      </div>

      <div v-if="showNewAddressForm" class="grid grid-cols-1 gap-3 mt-3">
        <input v-model="newAddress.fullName" placeholder="Họ và tên" class="input-style" />
        <input v-model="newAddress.phone" placeholder="Số điện thoại" class="input-style" />
        <input v-model="newAddress.street" placeholder="Địa chỉ nhà" class="input-style" />
        <input v-model="newAddress.district" placeholder="Quận/Huyện" class="input-style" />
        <input v-model="newAddress.city" placeholder="Thành phố" class="input-style" />
        <div class="text-right">
          <button @click="addNewAddress" class="hover-flip-btn mt-2 px-6 py-2">Lưu địa chỉ</button>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button @click="closeModal" class="hover-flip-btn px-2">Hủy</button>
        <button @click="confirmAddressSelection" class="py-1 px-4 hover-flip-btn">Xác nhận</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

const token = localStorage.getItem('token')
const cart = ref([])
const form = ref({ fullName: '', phone: '', street: '', district: '', city: '' })
const addresses = ref([])
const selectedAddressId = ref(null)
const tempSelectedAddressId = ref(null)
const showAddressModal = ref(false)
const showNewAddressForm = ref(false)
const newAddress = ref({ fullName: '', phone: '', street: '', district: '', city: '' })

const router = useRouter()
const shippingFee = 40000

const formatPrice = (n) => (n || 0).toLocaleString('vi-VN') + '₫'
const formatAddress = (addr) => `${addr.street}, ${addr.district}, ${addr.city}`

const subTotal = computed(() =>
  cart.value.reduce((sum, item) => sum + item.book.price * item.quantity, 0)
)
const totalAmount = computed(() => subTotal.value + shippingFee)

const closeModal = () => {
  showAddressModal.value = false
  showNewAddressForm.value = false
  tempSelectedAddressId.value = selectedAddressId.value
}

const confirmAddressSelection = () => {
  const selected = addresses.value.find(a => a._id === tempSelectedAddressId.value)
  if (selected) {
    selectedAddressId.value = selected._id
    form.value = { ...selected }
  }
  closeModal()
}

const addNewAddress = async () => {
  const addr = newAddress.value
  if (!addr.fullName || !addr.phone || !addr.street || !addr.district || !addr.city) {
    return Swal.fire('Thiếu thông tin', 'Vui lòng điền đầy đủ địa chỉ.', 'warning')
  }

  try {
    const res = await axios.post('/api/addresses', addr, {
      headers: { Authorization: `Bearer ${token}` }
    })
    addresses.value.push(res.data)
    tempSelectedAddressId.value = res.data._id
    newAddress.value = { fullName: '', phone: '', street: '', district: '', city: '' }
    showNewAddressForm.value = false
    Swal.fire('Đã thêm địa chỉ', '', 'success')
  } catch (err) {
    Swal.fire('Lỗi', 'Không thể thêm địa chỉ. Vui lòng thử lại.', 'error')
  }
}

onMounted(async () => {
  try {
    const selected = localStorage.getItem('checkoutItems')
    if (!selected) {
      await Swal.fire('Không có sản phẩm', 'Vui lòng chọn sản phẩm trước khi thanh toán.', 'info')
      return router.push('/cart')
    }

    const parsedItems = JSON.parse(selected)
    cart.value = parsedItems.filter(item => item.book && item.book.price != null)

    const addrRes = await axios.get('/api/addresses', {
      headers: { Authorization: `Bearer ${token}` }
    })
    addresses.value = addrRes.data

    if (addresses.value.length > 0) {
      const defaultAddress = addresses.value.find(a => a.isDefault) || addresses.value[0]
      selectedAddressId.value = defaultAddress._id
      tempSelectedAddressId.value = defaultAddress._id
      form.value = { ...defaultAddress }
    } else {
      form.value = {}
    }
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu:', err)
    Swal.fire('Lỗi', 'Không thể tải thông tin người dùng', 'error')
  }
})

const submitOrder = async () => {
  if (!form.value.fullName || !form.value.phone || !form.value.street || !form.value.district || !form.value.city) {
    return Swal.fire('Thiếu thông tin', 'Vui lòng chọn địa chỉ giao hàng.', 'warning')
  }

  try {
    const payload = {
      shippingAddress: form.value,
      items: cart.value.map(item => ({
        book: item.book._id,
        quantity: item.quantity
      })),
      shippingFee
    }

    await axios.post('/api/orders', payload, {
      headers: { Authorization: `Bearer ${token}` }
    })

    await Swal.fire('Thành công', 'Đơn hàng đã được đặt!', 'success')
    localStorage.removeItem('checkoutItems')
    router.push('/orders')
  } catch (err) {
    console.error('❌ Lỗi đặt hàng:', err.response?.data || err.message)
    const message = err.response?.data?.msg || 'Không thể đặt hàng. Vui lòng thử lại sau.'
    Swal.fire('Lỗi đặt hàng', message, 'error')
  }
}
</script>

<style scoped>
.input-style {
  @apply w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500;
}
</style>
