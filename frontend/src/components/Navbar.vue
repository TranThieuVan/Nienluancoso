<template>
  <!-- Top bar -->
  <div class="hidden md:flex bg-gray-100 justify-end px-5 py-2 gap-3 text-sm relative">
    <template v-if="user">
      <div class="relative" @click="toggleDropdown">
        <img
          :src="avatarUrl"
          alt="User Avatar"
          class="w-8 h-8 rounded-full mr-10 object-cover cursor-pointer border-2 border-gray-300"
        />
        <div
          v-if="dropdownOpen"
          class="absolute right-0 mt-2 mr-10 w-48 bg-white rounded-md shadow-lg border z-[999]"
        >
          <div class="px-4 py-2 text-sm text-gray-700 font-semibold truncate">
            {{ user.name }}
          </div>
          <hr class="my-1" />
          <RouterLink to="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" @click="closeDropdown">Hồ sơ cá nhân</RouterLink>
          <RouterLink to="/orders" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" @click="closeDropdown">Lịch sử mua hàng</RouterLink>
          <button @click="logout" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Đăng xuất</button>
        </div>
      </div>
    </template>
    <template v-else>
      <RouterLink class="hover:underline font-medium" to="/register">Join Us</RouterLink>
      <RouterLink class="hover:underline font-medium border-l mr-10 border-gray-400 pl-3" to="/login">Sign In</RouterLink>
    </template>
  </div>

   <!-- Navbar -->
  <nav class="bg-white sticky top-0 shadow py-3 z-50">
    <div class="container mx-auto flex items-center px-4 md:px-8 relative">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center flex-shrink-0">
        <img src="@/assets/image/logo.png" alt="Logo" class="h-10 w-auto" />
      </RouterLink>

      <!-- Center links -->
      <div class="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-6 text-base font-medium text-gray-700">
        <RouterLink to="/" class="hover:text-blue-600">Trang chủ</RouterLink>
        <!-- 📚 Dropdown Thể loại -->
        <div class="relative" @mouseover="showGenres = true" @mouseleave="showGenres = false">
          <span class="cursor-pointer hover:text-blue-600 px-2 py-4">Thể loại</span>
          <transition name="fade">
            <div
              v-if="showGenres"
              class="absolute left-0 top-[25px] mt-2 w-48 bg-white shadow-lg border rounded z-50"
            >
              <ul class="p-2 space-y-1">
                <li
                  v-for="genre in genres"
                  :key="genre"
                  class="cursor-pointer hover:text-blue-600 px-2 py-1"
                  @click="goToGenre(genre)"
                >
                  {{ genre }}
                </li>
              </ul>
            </div>
          </transition>
        </div>
        <RouterLink to="/books" @click="toggleMenu" class="hover:text-blue-600">Sách</RouterLink>
      </div>

      <!-- Right section: Input + icons -->
      <div class="hidden md:flex items-center ml-auto mr-8 gap-4">
        <div class="flex-1 flex justify-center">
          <InputSearch />
        </div>
        <RouterLink to="/favorites" class="text-gray-700 hover:text-red-600 text-lg bigger">
          <font-awesome-icon :icon="['far', 'heart']" />
        </RouterLink>
        <RouterLink to="/cart" class="relative text-gray-700 hover:text-green-600 text-xl bigger">
          <font-awesome-icon :icon="['fas', 'bag-shopping']" />
          <span v-if="cartCount > 0" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
    <div class="md:hidden fixed top-0 right-0 h-full w-2/3 bg-white shadow-md z-40 transition-transform duration-300"
         :class="{ 'translate-x-0': menuOpen, 'translate-x-full': !menuOpen }">
      <div class="flex items-center justify-between p-4 border-b">
        <h5 class="font-bold">Menu</h5>
        <button @click="toggleMenu" class="text-gray-500">
          <font-awesome-icon :icon="['fas', 'xmark']" class="text-xl" />
        </button>
      </div>
      <ul class="flex flex-col gap-4 p-4">
        <li><RouterLink to="/" @click="toggleMenu">Trang chủ</RouterLink></li>
        <li><RouterLink to="/books" @click="toggleMenu">Sách</RouterLink></li>


        <li>
          <details>
            <summary class="cursor-pointer hover:underline">Thể loại</summary>
            <ul class="ml-4 mt-1 flex flex-col gap-2">
              <li v-for="genre in genres" :key="genre">
                <button @click="goToGenreMobile(genre)" class="text-left hover:underline">{{ genre }}</button>
              </li>
            </ul>
          </details>
        </li>
        <li><RouterLink to="/favorites" @click="toggleMenu">Yêu thích</RouterLink></li>
        <li><RouterLink to="/cart" @click="toggleMenu">Giỏ hàng</RouterLink></li>
        <li v-if="!user"><RouterLink to="/login" @click="toggleMenu">Đăng nhập</RouterLink></li>
        <li v-else><button @click="logout" class="text-left">Đăng xuất</button></li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { cartCount, setCartCount } from '@/composables/cartStore'
import axios from 'axios'
import InputSearch from '@/components/InputSearch.vue'

const router = useRouter()
const menuOpen = ref(false)
const user = ref(null)
const dropdownOpen = ref(false)
const genres = ref([])
const showGenres = ref(false)

const toggleMenu = () => (menuOpen.value = !menuOpen.value)
const toggleDropdown = () => (dropdownOpen.value = !dropdownOpen.value)
const closeDropdown = () => (dropdownOpen.value = false)

const avatarUrl = computed(() => {
  if (!user.value) return ''
  return `/${user.value.avatar || 'uploads/avatars/default-user.png'}?t=${Date.now()}`
})

const loadCartCount = async () => {
  const token = localStorage.getItem('token')
  if (!token) return setCartCount(0)

  try {
    const { data } = await axios.get('http://localhost:5000/api/cart', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const total = data.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
    setCartCount(total)
  } catch {
    setCartCount(0)
  }
}

const logout = () => {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  user.value = null
  dropdownOpen.value = false
  router.push('/')
}

const fetchGenres = async () => {
  try {
    const { data } = await axios.get('http://localhost:5000/api/books/genres')
    genres.value = data
  } catch (err) {
    console.error('Lỗi khi tải thể loại:', err)
  }
}

// ✅ Dùng query thay vì history.state
const goToGenre = (genre) => {
  router.push({ name: 'ViewAllBooks', query: { genre } })
  showGenres.value = false
}
const goToGenreMobile = (genre) => {
  router.push({ name: 'ViewAllBooks', query: { genre } })
  menuOpen.value = false
}

const handleClickOutside = (e) => {
  const dropdown = document.querySelector('.relative')
  if (dropdown && !dropdown.contains(e.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  const stored = localStorage.getItem('user')
  if (stored) user.value = JSON.parse(stored)

  document.addEventListener('click', handleClickOutside)
  loadCartCount()
  fetchGenres()
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>