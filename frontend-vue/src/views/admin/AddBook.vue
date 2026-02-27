<template>
  <div class="max-w-2xl mx-auto p-6 relative">
    <!-- Nút quay lại -->
    <button @click="router.push('/admin/books')" class="absolute top-4 left-4 text-gray-600 hover:text-black">
      <font-awesome-icon icon="arrow-left" class="text-xl" />
    </button>

    <h2 class="text-2xl font-bold mb-4 text-center">Thêm Sách Mới</h2>
    
    <form @submit.prevent="handleSubmit" enctype="multipart/form-data">
      <div class="grid grid-cols-1 gap-4">
        <input v-model="form.title" type="text" placeholder="Tiêu đề" class="input" required />
        <input v-model="form.author" type="text" placeholder="Tác giả" class="input" />
        <input v-model="form.genre" type="text" placeholder="Thể loại" class="input" />
        
        <div class="flex gap-4">
          <div class="w-1/2">
            <label class="block text-brown-700 font-medium">Giá (VNĐ)</label>
            <input v-model.number="form.price" type="number"
              class="w-full p-3 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          <div class="w-1/2">
            <label class="block text-brown-700 font-medium">Số lượng</label>
            <input v-model.number="form.stock" type="number" min="0"
              class="w-full p-3 border border-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
        </div>

        <textarea v-model="form.description" placeholder="Mô tả" class="input" rows="3"></textarea>
        <input type="file" @change="handleFileChange" accept="image/*" class="input" />

        <button type="submit" class="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
          ➕ Thêm sách
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import Swal from "sweetalert2";
import { useRouter } from "vue-router";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome"; // import icon component
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";

library.add(faArrowLeft);

const router = useRouter();

const form = ref({
  title: "",
  author: "",
  genre: "",
  price: 0,
  stock: 0,
  description: "",
});

const imageFile = ref(null);

const handleFileChange = (e) => {
  imageFile.value = e.target.files[0];
};

const handleSubmit = async () => {
  try {
    const formData = new FormData();
    Object.entries(form.value).forEach(([key, val]) => {
      if (key === "price" || key === "stock") {
        formData.append(key, Number(val));
      } else {
        formData.append(key, val);
      }
    });
    if (imageFile.value) {
      formData.append("image", imageFile.value);
    }

    await axios.post("http://localhost:5000/api/books", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    Swal.fire("Thành công", "Đã thêm sách", "success");
    router.push("/admin/books");
  } catch (err) {
    console.error(err);
    const message = err.response?.data?.msg || "Không thể thêm sách";
    Swal.fire("Lỗi", message, "error");
  }
};
</script>

<style scoped>
.input {
  @apply border rounded px-3 py-2 w-full;
}
</style>
