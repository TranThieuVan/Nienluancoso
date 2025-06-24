<template>
  <!-- Top bar -->
  <div class="hidden md:flex bg-gray-100 justify-end  px-5 py-2 gap-3 text-sm">
    <RouterLink class="hover:underline font-medium" to="/register">Join Us</RouterLink>
    <RouterLink class="hover:underline font-medium border-l mr-10 border-gray-400 pl-3" to="/login">Sign In</RouterLink>
  </div>

  <!-- Navbar -->
  <nav class="bg-white sticky top-0 shadow py-3 z-50">
    <div class="container mx-auto flex items-center px-4 md:px-8 relative">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center flex-shrink-0">
        <img src="@/assets/image/iron1.jpg" alt="Logo" class="h-8" />
      </RouterLink>

      <!-- Center navigation links -->
      <div class="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-6 text-base font-medium text-gray-700">
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
        <RouterLink to="/cart" class="text-gray-700 hover:text-blue-600 text-lg">
          <font-awesome-icon :icon="['fas', 'bag-shopping']" />
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
        <li>
          <RouterLink to="/login" class="flex items-center text-black hover:underline" @click="toggleMenu">
            <font-awesome-icon :icon="['far', 'user']" class="mr-2" />
            Đăng nhập
          </RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const menuOpen = ref(false)
function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
</script>
