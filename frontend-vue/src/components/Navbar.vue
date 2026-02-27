<template>
  <!-- Top bar -->
  <div class="bg-gray-100 px-5 py-2 text-sm flex justify-between items-center md:justify-end gap-3 relative">
    <!-- Logo on small screen -->
    <RouterLink to="/" class="md:hidden font-semibold text-lg bigger"></RouterLink>

    <!-- User dropdown or login/register -->
    <div class="flex items-center gap-3 ml-auto">
      <template v-if="user">
        <div class="relative" @click="toggleDropdown">
          <img
            :src="avatarUrl"
            alt="User Avatar"
            class="w-8 h-8 rounded-full object-cover cursor-pointer border-2 border-gray-300 bigger"
          />
          <div
            v-if="dropdownOpen"
            class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-[999]"
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
        <RouterLink class="hover:underline font-medium border-l pl-3 border-gray-400" to="/login">Sign In</RouterLink>
      </template>
    </div>
  </div>

  <!-- Navbar -->
  <nav class="bg-white sticky top-0 shadow py-3 z-50">
    <div class="container mx-auto flex items-center justify-between px-4 md:px-8">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center flex-shrink-0">
        <img src="@/assets/image/logo.png" alt="Logo" class="h-10 w-auto bigger-small" />
      </RouterLink>

      <!-- Center links (desktop) -->
      <div class="hidden md:flex gap-6 text-base font-medium text-gray-700">
        <RouterLink to="/" class="hover:text-blue-600">Trang chủ</RouterLink>
        <div class="relative" @mouseover="showGenres = true" @mouseleave="showGenres = false">
          <span class="cursor-pointer hover:text-blue-600">Thể loại</span>
          <transition name="fade">
            <div
              v-if="showGenres"
              class="absolute left-0 top-full mt-2 w-48 bg-white shadow-lg border rounded z-50"
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
        <RouterLink to="/books" class="hover:text-blue-600">Sách</RouterLink>
      </div>

      <!-- Search & icons (desktop) -->
      <div class="hidden md:flex items-center gap-4">
        <InputSearch />
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
        <div class="md:hidden fixed top-0 right-0 h-full w-full bg-white shadow-md z-40 transition-transform duration-300"
            :class="{ 'translate-x-0': menuOpen, 'translate-x-full': !menuOpen }">
          <div class="flex items-center justify-between p-4 border-b">
            <img src="@/assets/image/logo.png" alt="Logo" class="h-8 w-auto" />
            <button @click="toggleMenu" class="text-gray-500 hover:text-black">
              <font-awesome-icon :icon="['fas', 'xmark']" class="text-2xl" />
            </button>
          </div>
          <ul class="flex flex-col gap-4 p-5 text-lg font-medium text-gray-800">
            <li>
              <RouterLink to="/" @click="toggleMenu" class="hover:text-blue-600 transition-colors">Trang chủ</RouterLink>
            </li>
            <li>
              <RouterLink to="/books" @click="toggleMenu" class="hover:text-blue-600 transition-colors">Sách</RouterLink>
            </li>

            <li>
              <details>
                <summary class="cursor-pointer hover:text-blue-600 transition-colors">Thể loại</summary>
                <ul class="ml-4 mt-2 flex flex-col gap-2 text-base font-normal">
                  <li v-for="genre in genres" :key="genre">
                    <button @click="goToGenreMobile(genre)" class="text-left hover:text-blue-500 transition-colors">
                      {{ genre }}
                    </button>
                  </li>
                </ul>
              </details>
            </li>

            <li>
              <RouterLink to="/favorites" @click="toggleMenu" class="hover:text-blue-600 transition-colors">Yêu thích</RouterLink>
            </li>
            <li>
              <RouterLink to="/cart" @click="toggleMenu" class="hover:text-blue-600 transition-colors">Giỏ hàng</RouterLink>
            </li>
            <li v-if="!user">
              <RouterLink to="/login" @click="toggleMenu" class="hover:text-blue-600 transition-colors">Đăng nhập</RouterLink>
            </li>
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