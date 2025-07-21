<template>
  <aside
    class="fixed top-0 left-0 w-64 h-screen bg-white text-black 
           flex flex-col justify-between shadow-md transition duration-200 z-50"
  >
    <div>
      <div class="text-xl font-bold px-6 py-4 border-b border-gray-300">
        <router-link to="/admin" class="flex items-center gap-2">
          <font-awesome-icon :icon="['fas', 'book']" />
          <span>QUẢN LÝ</span>
        </router-link>
      </div>

      <nav class="flex flex-col gap-2 mt-4 px-4 text-base">
        <router-link
          to="/admin/books"
          :class="[
            'flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200',
            route.path === '/admin/books' ? 'bg-green-200' : ''
          ]"
        >
          <font-awesome-icon :icon="['fas', 'book']" />
          Sách
        </router-link>

        <router-link
          to="/admin/orders"
          :class="[
            'flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200',
            route.path === '/admin/orders' ? 'bg-green-200' : ''
          ]"
        >
          <font-awesome-icon :icon="['fas', 'box-open']" />
          Đơn hàng
        </router-link>

        <!-- ✅ Mục mới: Doanh thu -->
        <router-link
          to="/admin/revenue"
          :class="[
            'flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200',
            route.path === '/admin/revenue' ? 'bg-green-200' : ''
          ]"
        >
          <font-awesome-icon :icon="['fas', 'chart-line']" />
          Doanh thu
        </router-link>

        <router-link
          to="/admin/users"
          :class="[
            'flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200',
            route.path === '/admin/users' ? 'bg-green-200' : ''
          ]"
        >
          <font-awesome-icon :icon="['fas', 'user']" />
          Người dùng
        </router-link>

                <router-link
          to="/admin/comments"
          :class="[
            'flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200',
            route.path === '/admin/comments' ? 'bg-green-200' : ''
          ]"
        >
          <font-awesome-icon :icon="['fas', 'comments']" />
          Bình luận
        </router-link>

        <router-link
  to="/admin/messages"
  :class="[
    'flex items-center gap-2 py-2 px-3 rounded hover:bg-green-200',
    route.path === '/admin/messages' ? 'bg-green-200' : ''
  ]"
>
  <font-awesome-icon :icon="['fas', 'envelope']" />
  Tin nhắn
</router-link>
      </nav>
    </div>

    <div class="px-4 py-4 border-t border-gray-300">
      <p class="text-sm mb-2">Xin chào, <strong>Admin</strong></p>
      <button
        @click="logout"
        class="w-full bg-red-600 hover:bg-red-700 py-2 rounded text-sm flex items-center justify-center gap-2"
      >
        <font-awesome-icon :icon="['fas', 'right-from-bracket']" />
        Đăng xuất
      </button>
    </div>
  </aside>
</template>

<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()

const logout = () => {
  localStorage.removeItem('adminToken')
  window.location.href = '/login'
}
</script>
