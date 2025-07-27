<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">

    <div class="bg-white shadow-lg rounded-lg p-8 w-full max-w-2xl border border-gray-300 mt-4">
      <h1 class="text-3xl font-bold mb-6 text-center text-gray-800">Chỉnh Sửa Sách</h1>

      <div v-if="book">
        <form @submit.prevent="confirmEditBook" class="space-y-5">
          <div>
            <label class="block text-gray-700 font-medium">Tiêu đề</label>
            <input v-model="book.title" type="text" required class="input" />
          </div>

          <div>
            <label class="block text-gray-700 font-medium">Tác giả</label>
            <input v-model="book.author" type="text" required class="input" />
          </div>

          <div>
            <label class="block text-gray-700 font-medium">Thể loại</label>
            <input v-model="book.genre" type="text" required class="input" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-700 font-medium">Giá (VNĐ)</label>
              <input v-model.number="book.price" type="number"  min="0" required class="input" />
            </div>

            <div>
              <label class="block text-gray-700 font-medium">Số lượng</label>
              <input v-model.number="book.stock" type="number" min="0" required class="input" />
            </div>
          </div>

          <div>
            <label class="block text-gray-700 font-medium">Mô tả</label>
            <textarea v-model="book.description" rows="4" class="input" placeholder="Nhập mô tả ngắn về sách"></textarea>
          </div>

          <!-- Chọn ảnh mới -->
          <div>
            <label class="block text-gray-700 font-medium">Chọn ảnh mới (nếu muốn đổi)</label>
            <input type="file" @change="handleFileChange" accept="image/*" class="input" />
            <div v-if="imageFile" class="mt-2">
              <span class="text-sm text-gray-600">Ảnh mới được chọn:</span>
              <img :src="imagePreview" class="w-32 mt-1 border rounded" />
            </div>
          </div>

          <div class="flex gap-4">
            <button type="submit" class="w-3/4 bg-blue-600 text-white px-4 py-3 rounded font-semibold hover:bg-blue-700">
              Lưu Thay Đổi
            </button>
            <button type="button" @click="goBack" class="w-1/4 bg-gray-400 text-white px-4 py-3 rounded font-semibold hover:bg-red-500">
              Hủy
            </button>
          </div>
        </form>
      </div>

      <div v-else class="text-center text-gray-500 mt-4">Đang tải dữ liệu...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import Swal from "sweetalert2";

const route = useRoute();
const router = useRouter();
const book = ref(null);
const bookId = route.params.id;
const imageFile = ref(null);
const imagePreview = ref("");

const fetchBook = async () => {
  try {
    const res = await axios.get(`http://localhost:5000/api/books/${bookId}`);
    book.value = res.data;
  } catch (err) {
    console.error("❌ Lỗi khi tải thông tin sách:", err);
    book.value = null;
  }
};

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    imageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

const confirmEditBook = async () => {
  if (!book.value) return;

  const result = await Swal.fire({
    title: 'Xác nhận chỉnh sửa',
    text: 'Bạn có chắc muốn lưu thay đổi?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Lưu',
    cancelButtonText: 'Hủy',
    customClass: {
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 mr-2 rounded',
      cancelButton: 'bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-4 rounded',
    },
    buttonsStyling: false,
  });

  if (!result.isConfirmed) return;

  try {
    const formData = new FormData();
    formData.append("title", book.value.title);
    formData.append("author", book.value.author);
    formData.append("genre", book.value.genre);
    formData.append("price", book.value.price);
    formData.append("stock", book.value.stock);
    formData.append("description", book.value.description);

    if (imageFile.value) {
      formData.append("image", imageFile.value);
    }

    await axios.put(`http://localhost:5000/api/books/${bookId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    await Swal.fire({
      icon: 'success',
      title: 'Đã cập nhật!',
      text: 'Thông tin sách đã được lưu thành công.',
      confirmButtonText: 'OK',
      customClass: {
        confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded',
      },
      buttonsStyling: false,
    });

    router.push("/admin/books");
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật sách:", error);
    await Swal.fire({
      icon: 'error',
      title: 'Lỗi!',
      text: 'Cập nhật sách thất bại. Vui lòng thử lại.',
      confirmButtonText: 'Đóng',
      customClass: {
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded',
      },
      buttonsStyling: false,
    });
  }
};


const goBack = () => {
  router.back();
};

onMounted(fetchBook);
</script>

<style scoped>
.input {
  @apply w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500;
}
</style>
