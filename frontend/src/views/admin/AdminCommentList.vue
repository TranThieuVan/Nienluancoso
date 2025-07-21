<template>
  <div class="flex flex-col p-6 w-full">
    <!-- Tiêu đề -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold mb-1">Quản lý bình luận</h1>
        <p class="text-gray-500">Xem và quản lý toàn bộ bình luận của người dùng theo sách.</p>
      </div>
    </div>

    <!-- Thanh công cụ -->
    <div class="flex justify-between mb-4 items-end">
      <!-- Bộ lọc -->
      <div class="flex gap-3 items-center">
        <input
          v-model="filters.bookTitle"
          placeholder="Tìm theo tên sách"
          class="p-2 border border-gray-300 rounded w-64 shadow-sm focus:outline-none focus:ring"
        />
        <input
          v-model="filters.userName"
          placeholder="Tìm theo người dùng"
          class="p-2 border border-gray-300 rounded w-64 shadow-sm focus:outline-none focus:ring"
        />
        <button
          @click="fetchComments"
          class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Lọc
        </button>
      </div>
    </div>

    <!-- Bảng bình luận -->
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white border border-gray-200 rounded shadow-sm">
        <thead class="bg-gray-100 text-gray-700 text-left text-sm">
          <tr>
            <th class="p-3 border-b">No.</th>
            <th class="p-3 border-b">Sách</th>
            <th class="p-3 border-b">Người dùng</th>
            <th class="p-3 border-b">Nội dung</th>
            <th class="p-3 border-b">Ngày</th>
            <th class="p-3 border-b text-center">Trạng thái</th>
            <th class="p-3 border-b text-center">Ẩn</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(c, index) in comments"
            :key="c._id"
            class="hover:bg-gray-50"
          >
            <td class="p-3 border-b">{{ (page - 1) * limit + index + 1 }}</td>
            <td class="p-3 border-b">{{ c.bookId?.title || '—' }}</td>
            <td class="p-3 border-b">
              <div class="font-medium">{{ c.userId?.name }}</div>
              <div class="text-gray-500 text-xs">{{ c.userId?.email }}</div>
            </td>
            <td class="p-3 border-b">
              <div v-if="c.isHidden" class="text-red-600 italic flex items-center gap-2">
                <font-awesome-icon icon="triangle-exclamation" class="text-yellow-500" />
                Đã bị ẩn: {{ c.hiddenReason }}
              </div>
              <div v-else>
                {{ c.content }}
              </div>
            </td>
            <td class="p-3 border-b text-sm">{{ formatDate(c.createdAt) }}</td>
            <td class="p-3 border-b text-center">
              <span
                :class="c.isHidden ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'"
              >
                {{ c.isHidden ? 'Đã bị ẩn' : 'Hiển thị' }}
              </span>
            </td>
            <td class="p-3 border-b text-center">
              <button
                v-if="!c.isHidden"
                @click="confirmDelete(c._id)"
                class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                <font-awesome-icon icon="eye-slash" class="mr-1" />
                Ẩn
              </button>
              <span v-else class="text-gray-400 text-sm">Đã ẩn</span>
            </td>
          </tr>
          <tr v-if="comments.length === 0">
            <td colspan="7" class="text-center text-gray-500 py-4">Không có bình luận nào</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Phân trang -->
    <Pagination
      class="mt-6"
      :current-page="page"
      :total-pages="Math.ceil(total / limit)"
      @page-change="changePage"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import Swal from 'sweetalert2'
import Pagination from '@/components/Pagination.vue'

const comments = ref([])
const filters = ref({ bookTitle: '', userName: '' })
const page = ref(1)
const limit = 10
const total = ref(0)

const fetchComments = async () => {
  try {
    const token = localStorage.getItem('adminToken')
    const { data } = await axios.get('http://localhost:5000/api/admin/comments', {
      params: {
        ...filters.value,
        page: page.value,
        limit,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    comments.value = data.comments
    total.value = data.total
  } catch (err) {
    Swal.fire('Lỗi', err.response?.data?.message || 'Không thể tải bình luận', 'error')
  }
}

const confirmDelete = async (id) => {
  const { value: reason } = await Swal.fire({
    title: 'Ẩn bình luận?',
    input: 'select',
    inputOptions: {
      'Nội dung phản cảm': 'Nội dung phản cảm',
      'Ngôn từ thô tục': 'Ngôn từ thô tục',
      'Không liên quan đến sản phẩm': 'Không liên quan đến sản phẩm',
      'Spam hoặc quảng cáo': 'Spam hoặc quảng cáo',
      'Vi phạm chính sách': 'Vi phạm chính sách',
    },
    inputPlaceholder: 'Chọn lý do ẩn',
    showCancelButton: true,
    confirmButtonText: 'Ẩn',
    cancelButtonText: 'Huỷ',
    customClass: {
      confirmButton: 'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700',
      cancelButton: 'bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400',
    },
    buttonsStyling: false,
    inputValidator: (value) => {
      if (!value) return 'Bạn phải chọn lý do ẩn!'
    },
  })

  if (reason) {
    try {
      const token = localStorage.getItem('adminToken')
      await axios.put(`http://localhost:5000/api/admin/comments/${id}/hide`, {
        reason,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      await fetchComments()
      Swal.fire('Đã ẩn!', `Lý do: ${reason}`, 'success')
      console.log(`Đã ẩn bình luận ${id}, lý do: ${reason}`)
    } catch (err) {
      Swal.fire('Lỗi', err.response?.data?.message || 'Không thể ẩn bình luận', 'error')
    }
  }
}


const changePage = (newPage) => {
  page.value = newPage
  fetchComments()
}

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN')
}

// Tự fetch khi load
onMounted(fetchComments)

// Optional: nếu muốn tự động refetch khi thay đổi bộ lọc
watch(filters, () => {
  page.value = 1
  fetchComments()
})
</script>
