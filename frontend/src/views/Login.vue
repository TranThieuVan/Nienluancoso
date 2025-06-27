<template>
  <div class="flex min-h-screen">
    <!-- Slider background -->
    <div class="w-4/5 overflow-hidden relative">
      <img src="@/assets/image/dare1.jpg" alt="">
    </div>

    <!-- Login form -->
    <div class="w-1/5 flex items-center justify-center bg-white">
      <div class="max-w-lg w-full p-8 rounded">
        <img src="@/assets/image/iron1.jpg" alt="Logo" class="mx-auto mb-4 w-40" />
        <h2 class="text-3xl font-bold text-center mb-6 text-gray-800">Đăng Nhập</h2>

        <p v-if="errorMessage" class="text-red-600 text-center mb-4">
          {{ errorMessage }}
        </p>

        <form @submit.prevent="handleLogin">
          <div class="mb-5">
            <label class="block font-medium text-lg">Email</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full p-3 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div class="mb-5">
            <label class="block font-medium text-lg">Mật khẩu</label>
            <input
              v-model="password"
              type="password"
              required
              class="w-full p-3 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            type="submit"
            class="w-full bg-gray-900 text-white p-3 rounded hover:bg-gray-800 transition-all duration-300 text-lg font-semibold"
          >
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
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const router = useRouter()

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'Vui lòng nhập đầy đủ thông tin.'
    return
  }

  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: email.value,
      password: password.value
    })

    const { token, user } = res.data

    // Lưu vào localStorage
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))

    // Điều hướng theo quyền
    if (user.role === 'admin') {
      router.push('/admin')  // 👈 đường dẫn tuỳ bạn cấu hình
    } else {
      router.push('/')  // trang người dùng
    }
  } catch (err) {
    errorMessage.value = err.response?.data?.msg || 'Đăng nhập thất bại'
  }
}
</script>
