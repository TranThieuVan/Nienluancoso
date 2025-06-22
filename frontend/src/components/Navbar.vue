<template>
  <nav class="bg-[#333333] text-[#FFFFFF] p-4 shadow-lg">
    <div class="container mx-auto flex justify-between items-center h-[4vh]">
      <!-- Logo -->
      <router-link to="/" class="text-[2rem] font-bold flex items-center space-x-2 hover:scale-105 transition-transform duration-300 langar-regular">
        📖 <span>Library</span>
      </router-link>

      <!-- Navigation -->
      <ul class="hidden md:flex space-x-6 text-[1.5rem] font-medium">
        <li>
          <router-link to="/" class="hover:text-[#D4A373] transition-colors duration-300 langar-regular ">
            Trang chủ
          </router-link>
        </li>
        <li>
          <router-link to="/books" class="hover:text-[#D4A373] transition-colors duration-300 langar-regular  ">
            Sách
          </router-link>
        </li>
      </ul>

      <!-- User Section -->
      <div v-if="user" class="relative">
        <button @click="toggleDropdown" class="flex items-center space-x-2 hover:scale-105 transition-transform duration-300 langar-regular">
          <span class="font-semibold text-[1.3rem]">{{ displayName }}</span>
        </button>

        <transition name="fade">
          <ul
            v-if="isDropdownOpen"
            ref="dropdownMenu"
            class="absolute right-0 mt-3 w-48 bg-[#F5E6C8] text-[#3E4E3A] shadow-lg rounded-lg border border-gray-300 z-10 overflow-hidden"
          >
            <li>
              <button
                @click="logout"
                class="block w-full text-left px-4 py-3 hover:bg-[#D4A373] hover:text-white transition-all duration-200 font-semibold"
              >
                Đăng xuất
              </button>
            </li>
          </ul>
        </transition>
      </div>

      <!-- Auth Links -->
      <div v-else class="flex space-x-4 text-[1.2rem] font-medium">
        <router-link to="/login" class="hover:text-[#D4A373] transition-colors duration-300">
           Đăng nhập
        </router-link>
        <router-link to="/register" class="hover:text-[#D4A373] transition-colors duration-300">
           Đăng ký
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { useRouter } from 'vue-router';

const user = ref(null);
const isDropdownOpen = ref(false);
const dropdownMenu = ref(null);
const router = useRouter();

const displayName = computed(() => {
  if (!user.value || !user.value.fullName) return "";
  const nameParts = user.value.fullName.split(" ");
  return nameParts.length > 1
    ? nameParts.slice(-2).join(" ")
    : user.value.fullName;
});

const toggleDropdown = (event) => {
  isDropdownOpen.value = !isDropdownOpen.value;
  event.stopPropagation();
};

const handleClickOutside = (event) => {
  if (dropdownMenu.value && !dropdownMenu.value.contains(event.target)) {
    isDropdownOpen.value = false;
  }
};

const updateUser = () => {
  const storedUser = localStorage.getItem('user');
  user.value = storedUser ? JSON.parse(storedUser) : null;
};

const logout = () => {
  localStorage.removeItem('user');
  user.value = null;
  isDropdownOpen.value = false;
  router.push('/');
};

watchEffect(updateUser);

onMounted(() => {
  updateUser();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
} 

@media (max-width: 768px) {
  .container {
    padding: 0 10px;
  }
  ul li a {
    font-size: 1.5rem;
  }
  button {
    font-size: 1.5rem;
  }
}

.langar-regular {
  font-family: "Langar", system-ui;
  font-weight: 400;
  font-style: normal;
}
</style>