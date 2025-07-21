<template>
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-4">Quản lý Người dùng</h1>
  
      <table class="min-w-full border border-gray-300">
        <thead>
          <tr class="bg-gray-100">
            <th class="p-2 border border-gray-300">Avatar</th>
            <th class="p-2 border border-gray-300">Tên</th>
            <th class="p-2 border border-gray-300">Email</th>
            <th class="p-2 border border-gray-300">Trạng thái</th>
            <th class="p-2 border border-gray-300">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user._id" class="hover:bg-gray-50">
            <td class="p-2 border border-gray-300 text-center align-middle">
              <div class="flex justify-center items-center gap-2">
                <img
                  :src="getAvatarUrl(user.avatar)"
                  @error="onImageError"
                  alt="avatar"
                  class="w-8 h-8 rounded-full object-cover border"
                />
              </div>
            </td>
            <td class="p-2 border border-gray-300 text-center align-middle">
              {{ user.name }}
            </td>
            <td class="p-2 border border-gray-300 text-center align-middle">
              {{ user.email }}
            </td>
            <td class="p-2 border border-gray-300 text-center align-middle">
              <span
                :class="user.isLocked ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'">
                {{ user.isLocked ? 'Đã khóa' : 'Hoạt động' }}
              </span>
            </td>
            <td class="p-2 border border-gray-300 text-center align-middle">
              <button
                @click="toggleLock(user)"
                class="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                {{ user.isLocked ? 'Mở khóa' : 'Khóa' }}
              </button>
            </td>

          </tr>
        </tbody>
      </table>
  
      <div v-if="error" class="mt-4 text-red-600 font-semibold">{{ error }}</div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  
  const users = ref([])
  const error = ref(null)
  
  const getAvatarUrl = (avatar) => {
  if (!avatar || avatar.includes('default-user.png')) {
    return 'http://localhost:5000/uploads/avatars/default-user.png';
  }
  return `http://localhost:5000/${avatar}`;
};

const onImageError = (e) => {
  e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png';
};


  // Hàm lấy danh sách user từ API
  async function fetchUsers() {
    error.value = null
    try {
      const token = localStorage.getItem('adminToken') // ✅ sửa chỗ này
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (!res.ok) throw new Error('Lỗi khi lấy danh sách người dùng')
      users.value = await res.json()
    } catch (err) {
      error.value = err.message
    }
  }
  
  // Hàm khoá/mở khoá user
  async function toggleLock(user) {
    error.value = null
    try {
      const token = localStorage.getItem('adminToken') // ✅ sửa chỗ này
      const res = await fetch(`/api/admin/users/${user._id}/toggle-lock`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error('Lỗi khi thay đổi trạng thái người dùng')
      const data = await res.json()
      alert(data.message)
      // Cập nhật lại danh sách user
      await fetchUsers()
    } catch (err) {
      error.value = err.message
    }
  }
  
  onMounted(fetchUsers)
  </script>
  
  
  <style scoped>
  table {
    border-collapse: collapse;
  }
  </style>
  