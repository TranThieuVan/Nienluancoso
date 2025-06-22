<template>
  <nav class="bg-black h-[12vh] p-4 text-white flex items-center justify-between">
    <!-- Left: Admin Panel -->
    <div class="flex-none text-[2rem] font-bold">
      Library
    </div>

    <!-- Center: 3 liên kết quản lý -->
    <div class="flex-grow flex justify-center space-x-6">
      <router-link to="/admin/users" class="text-2xl hover:text-gray-300 transition">
        Quản lý người dùng
      </router-link>
      <router-link to="/admin/books" class="text-2xl hover:text-gray-300 transition">
        Quản lý sách
      </router-link>
      <router-link to="/admin/approve-borrow" class="text-2xl hover:text-gray-300 transition">
        Danh sách đơn mượn sách
      </router-link>
    </div>

    <!-- Right: Admin Info -->
    <div class="relative">
      <button @click="toggleDropdown" class="flex items-center space-x-3 text-2xl hover:text-gray-300 transition">
        <span class="font-semibold">{{ adminName }}</span>
        <img
          src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
          alt="Admin Icon"
          class="w-10 h-10 rounded-full border border-white"
        />
      </button>

      <!-- Dropdown menu -->
      <transition name="fade">
        <ul
          v-if="isDropdownOpen"
          ref="dropdownMenu"
          class="absolute right-0 mt-3 w-48 bg-white text-black shadow-lg rounded-lg border border-gray-200 z-10"
        >
          <li>
            <button
              @click="logout"
              class="block w-full text-left px-4 py-3 hover:bg-red-100 font-semibold transition"
            >
              Đăng xuất
            </button>
          </li>
        </ul>
      </transition>
    </div>
  </nav>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";

export default {
  setup() {
    const router = useRouter();
    const adminName = ref("Admin");
    const isDropdownOpen = ref(false);

    onMounted(() => {
      const admin = JSON.parse(localStorage.getItem("admin"));
      if (admin && admin.fullName) {
        adminName.value = admin.fullName;
      }
      document.addEventListener("click", handleClickOutside);
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", handleClickOutside);
    });

    const toggleDropdown = (event) => {
      event.stopPropagation();
      isDropdownOpen.value = !isDropdownOpen.value;
    };

    const handleClickOutside = (event) => {
      if (!event.target.closest(".relative")) {
        isDropdownOpen.value = false;
      }
    };

    const logout = () => {
      localStorage.removeItem("admin");
      router.push("/admin/login");
    };

    return { adminName, isDropdownOpen, toggleDropdown, logout };
  },
};
</script>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
</style>