<template>
  <div class="flex flex-col md:flex-row min-h-screen">
    <!-- Slider background (ẩn trên mobile) -->
    <div class="hidden md:block md:w-3/5 xl:w-4/5 overflow-hidden relative">
      <img src="@/assets/image/iron1.jpg" class="h-screen w-screen object-cover" />
    </div>

    <!-- Register form -->
    <div class="w-full md:w-2/5 xl:w-1/5 flex items-center justify-center bg-white">
      <div class="max-w-lg w-full p-6 sm:p-8 rounded">
        <img src="@/assets/image/logo.png" alt="Logo" class="mx-auto mb-10 w-48 sm:w-60" />
        <h2 class="text-2xl sm:text-3xl font-bold text-center mb-6 text-gray-800">Đăng Ký</h2>

        <p v-if="errorMessage" class="text-red-600 text-center mb-4">
          {{ errorMessage }}
        </p>

        <form @submit.prevent="register">
          <div class="mb-4">
            <label class="block font-medium text-base sm:text-lg">Tên người dùng</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div class="mb-4">
            <label class="block font-medium text-base sm:text-lg">Email</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div class="mb-4">
            <label class="block font-medium text-base sm:text-lg">Mật khẩu</label>
            <input
              v-model="form.password"
              type="password"
              required
              class="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p v-if="passwordTooShort" class="text-red-500 text-sm mt-1">
              ⚠️ Mật khẩu phải có ít nhất 6 ký tự
            </p>
          </div>

          <div class="mb-5">
            <label class="block font-medium text-base sm:text-lg">Nhập lại mật khẩu</label>
            <input
              v-model="form.confirmPassword"
              type="password"
              required
              class="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p
              v-if="form.password && form.confirmPassword && passwordMismatch"
              class="text-red-500 text-sm mt-1"
            >
              ⚠️ Mật khẩu không khớp
            </p>
          </div>

          <button
            type="submit"
            class="w-full p-2 rounded hover-flip-btn text-lg font-semibold"
            :disabled="passwordMismatch || passwordTooShort"
          >
            Đăng Ký
          </button>
        </form>

        <p class="text-center mt-5 text-base sm:text-lg">
          Đã có tài khoản?
          <router-link to="/login" class="text-blue-600 font-semibold hover:underline">
            Đăng nhập
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const errorMessage = ref('')

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const passwordMismatch = computed(() =>
  form.value.password &&
  form.value.confirmPassword &&
  form.value.password !== form.value.confirmPassword
)

const passwordTooShort = computed(() =>
  form.value.password.length > 0 && form.value.password.length < 6
)

const register = async () => {
  if (passwordMismatch.value) {
    errorMessage.value = '⚠️ Mật khẩu không khớp'
    return
  }

  if (form.value.password.length < 6) {
    errorMessage.value = '⚠️ Mật khẩu phải có ít nhất 6 ký tự'
    return
  }

  try {
    await axios.post('http://localhost:5000/api/auth/register', form.value)
    alert('Đăng ký thành công!')
    router.push('/login')
  } catch (error) {
    errorMessage.value = error.response?.data?.msg || 'Đăng ký thất bại'
  }
}
</script>
