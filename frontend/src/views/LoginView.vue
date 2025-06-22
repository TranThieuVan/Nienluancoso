<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
      <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Admin Login</h2>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
          <input v-model="email" type="email" id="email"
            class="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:border-blue-400"
            required />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input v-model="password" type="password" id="password"
            class="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:border-blue-400"
            required />
        </div>

        <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition">
          Đăng nhập
        </button>
      </form>

      <p v-if="error" class="text-red-500 text-sm mt-4 text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const error = ref('')
const router = useRouter()

const handleLogin = async () => {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', {
      email: email.value,
      password: password.value,
    })

    if (res.data.user.role !== 'admin') {
      error.value = 'Chỉ admin mới được truy cập'
      return
    }

    localStorage.setItem('token', res.data.token)
    router.push('/dashboard')
  } catch (err) {
    error.value = err.response?.data?.msg || 'Đăng nhập thất bại'
  }
}
</script>
