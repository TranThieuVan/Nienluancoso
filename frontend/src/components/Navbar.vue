<template>
  <!-- Top bar -->
  <div class="hidden md:flex bg-gray-100 justify-end px-5 py-2 gap-3 text-sm relative">
    <template v-if="user">
      <!-- Avatar Dropdown -->
      <div class="relative" @click="toggleDropdown">
        <img
          :src="avatarUrl"
          alt="User Avatar"
          class="w-8 h-8 rounded-full mr-10 object-cover cursor-pointer border-2 border-gray-300"
        />

        <!-- Dropdown menu -->
        <div
          v-if="dropdownOpen"
          class="absolute right-0 mt-2 mr-10 w-48 bg-white rounded-md shadow-lg border z-[999]"
        >
          <div class="px-4 py-2 text-sm text-gray-700 font-semibold truncate">
            {{ user.name }}
          </div>
          <hr class="my-1" />
          <RouterLink
            to="/profile"
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            @click="closeDropdown"
          >
            Hồ sơ cá nhân
          </RouterLink>
          <button
            @click="logout"
            class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </template>
    <template v-else>
      <RouterLink class="hover:underline font-medium" to="/register">Join Us</RouterLink>
      <RouterLink
        class="hover:underline font-medium border-l mr-10 border-gray-400 pl-3"
        to="/login"
      >Sign In</RouterLink>
    </template>
  </div>

  <!-- Navbar -->
  <nav class="bg-white sticky top-0 shadow py-3 z-50">
    <div class="container mx-auto flex items-center px-4 md:px-8 relative">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center  flex-shrink-0">
        <img src="@/assets/image/logo.png" alt="Logo" class="h-10 w-auto" />
      </RouterLink>

      <!-- Center navigation links -->
      <div
        class="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-6 text-base font-medium text-gray-700"
      >
        <RouterLink to="/" class="hover:text-blue-600">Trang chủ</RouterLink>
        <RouterLink to="/books" class="hover:text-blue-600">Sách</RouterLink>
        <RouterLink to="/contact" class="hover:text-blue-600">Liên hệ</RouterLink>
      </div>

      <!-- Right section: Search + Icons -->
      <div class="hidden md:flex items-center ml-auto mr-8 gap-4">
        <!-- Search -->
        <div class="relative w-56">
          <input
            type="text"
            placeholder="Tìm sách..."
            class="w-full border rounded pl-10 pr-10 py-2 shadow-sm focus:outline-none"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
          </span>
          <button class="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800">
            <font-awesome-icon :icon="['fas', 'arrow-right']" />
          </button>
        </div>

        <!-- Icons -->
        <RouterLink to="/favorites" class="text-gray-700 hover:text-blue-600 text-lg">
          <font-awesome-icon :icon="['far', 'heart']" />
        </RouterLink>

        <!-- Giỏ hàng với số lượng -->
        <RouterLink to="/cart" class="relative text-gray-700 hover:text-blue-600 text-xl">
          <font-awesome-icon :icon="['fas', 'bag-shopping']" />
          <span
            v-if="cartCount > 0"
            class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
          >
            {{ cartCount }}
          </span>
        </RouterLink>
      </div>

      <!-- Mobile menu toggle -->
      <button class="md:hidden text-black text-xl ml-4" @click="toggleMenu">
        <font-awesome-icon :icon="['fas', 'bars']" />
      </button>
    </div>

    <!-- Mobile menu -->
    <div
      class="md:hidden fixed top-0 right-0 h-full w-2/3 bg-white shadow-md z-40 transition-transform duration-300"
      :class="{ 'translate-x-0': menuOpen, 'translate-x-full': !menuOpen }"
    >
      <div class="flex items-center justify-between p-4 border-b">
        <h5 class="font-bold">Menu</h5>
        <button @click="toggleMenu" class="text-gray-500">
          <font-awesome-icon :icon="['fas', 'xmark']" class="text-xl" />
        </button>
      </div>

      <ul class="flex flex-col gap-4 p-4">
        <li>
          <RouterLink to="/" class="flex items-center text-black hover:underline" @click="toggleMenu">
            Trang chủ
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/books" class="flex items-center text-black hover:underline" @click="toggleMenu">
            Sách
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/contact" class="flex items-center text-black hover:underline" @click="toggleMenu">
            Liên hệ
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/favorites" class="flex items-center text-black hover:underline" @click="toggleMenu">
            <font-awesome-icon :icon="['far', 'heart']" class="mr-2" />
            Yêu thích
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/cart" class="flex items-center text-black hover:underline" @click="toggleMenu">
            <font-awesome-icon :icon="['fas', 'bag-shopping']" class="mr-2" />
            Giỏ hàng
          </RouterLink>
        </li>
        <li v-if="!user">
          <RouterLink to="/login" class="flex items-center text-black hover:underline" @click="toggleMenu">
            <font-awesome-icon :icon="['far', 'user']" class="mr-2" />
            Đăng nhập
          </RouterLink>
        </li>
        <li v-else>
          <button @click="logout" class="text-left text-black hover:underline">Đăng xuất</button>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { cartCount, setCartCount } from '@/composables/cartStore'
import axios from 'axios'

const router = useRouter()

// Menu Toggle
const menuOpen = ref(false)
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

// Lấy user từ localStorage
const user = ref(null)
onMounted(() => {
  const stored = localStorage.getItem('user')
  if (stored) user.value = JSON.parse(stored)
})

// Avatar
const avatarUrl = computed(() => {
  if (!user.value) return ''
  const baseUrl = user.value.avatar
    ? `/${user.value.avatar}`
    : '/uploads/avatars/default-user.png'

  const timestamp = Date.now() // force refresh
  return `${baseUrl}?t=${timestamp}`
})

// Dropdown
const dropdownOpen = ref(false)
const toggleDropdown = () => (dropdownOpen.value = !dropdownOpen.value)
const closeDropdown = () => (dropdownOpen.value = false)
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.relative')
  if (dropdown && !dropdown.contains(event.target)) {
    dropdownOpen.value = false
  }
}
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Logout
const logout = () => {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  user.value = null
  dropdownOpen.value = false
  router.push('/')
}

// Load số lượng giỏ hàng khi mount Navbar
const loadCartCount = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    setCartCount(0)
    return
  }
  try {
    const { data } = await axios.get('http://localhost:5000/api/cart', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (data && data.items) {
      const total = data.items.reduce((sum, item) => sum + item.quantity, 0)
      setCartCount(total)
    } else {
      setCartCount(0)
    }
  } catch (error) {
    setCartCount(0)
  }
}

onMounted(() => {
  loadCartCount()
})
</script>
