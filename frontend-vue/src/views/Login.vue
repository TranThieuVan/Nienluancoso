<template>
  <div class="flex min-h-screen">
    <!-- Slider background -->
    <div class="hidden md:block md:w-3/5 xl:w-4/5 overflow-hidden relative">
      <img src="@/assets/image/iron1.jpg" class="h-screen w-screen object-cover" />
    </div>

    <!-- Login form -->
    <div class="w-full md:w-2/5 xl:w-1/5 flex items-center justify-center bg-white">
      <div class="max-w-lg w-full p-8 rounded">
        <img src="@/assets/image/logo.png" alt="Logo" class="mx-auto mb-8 w-60" />
        <h2 class="text-3xl font-bold text-center mb-6 text-gray-800">Đăng Nhập</h2>

        <p v-if="errorMessage" class="text-red-600 text-center mb-4">
          {{ errorMessage }}
        </p>

        <form @submit.prevent="handleLogin">
          <div class="mb-5">
            <label class="block font-medium text-lg">Email</label>
            <input
              ref="emailInput"
              v-model="email"
              type="email"
              required
              class="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div class="mb-5 relative">
            <label class="block font-medium text-lg">Mật khẩu</label>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="w-full p-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
            />
            <button
              type="button"
              @click="togglePassword"
              class="absolute right-2 top-9 text-gray-500"
            >
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>

          <button
            type="submit"
            class="w-full p-2 rounded hover-flip-btn text-lg font-semibold flex items-center justify-center"
            :disabled="loading"
          >
            <span v-if="loading" class="animate-spin mr-2"><i class="fas fa-spinner"></i></span>
            Đăng Nhập
          </button>
        </form>

        <p class="text-center mt-5 text-lg">
          Chưa có tài khoản?
          <router-link to="/register" class="text-blue-600 font-semibold hover:underline">Đăng ký</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')
const loading = ref(false)
const router = useRouter()
const emailInput = ref(null)

function togglePassword() {
  showPassword.value = !showPassword.value
}

onMounted(() => {
  nextTick(() => {
    emailInput.value?.focus()
  })
})

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'Vui lòng nhập đầy đủ thông tin.'
    return
  }

  loading.value = true
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: email.value,
      password: password.value
    })

    const { token, user } = res.data

    if (user.role === 'admin') {
      localStorage.setItem('adminToken', token)
      await nextTick()
      router.push('/admin')
    } else {
      const auth = useAuthStore()
      auth.login(user, token) // <-- GỌI HÀM PINIA Ở ĐÂY
      await nextTick()
      router.push('/')
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.msg || 'Đăng nhập thất bại'
  } finally {
    loading.value = false
  }
}
</script>
