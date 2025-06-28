<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div v-if="book" class="flex flex-col md:flex-row gap-6">
      <!-- 📘 PHẦN TRÁI (60%) -->
      <div class="md:w-3/5 space-y-6">
        <!-- Ảnh sách -->
        <img :src="book.image" alt="Book Cover" class="w-full h-auto rounded-xl shadow-lg" />

        <!-- Chi tiết sản phẩm -->
        <div>
          <h2 class="text-xl font-semibold mb-2">Chi tiết sản phẩm</h2>
          <p><strong>Thể loại:</strong> {{ book.genre }}</p>
          <p><strong>Tác giả:</strong> {{ book.author }}</p>
        </div>

        <!-- Mô tả -->
        <div>
          <h2 class="text-xl font-semibold mb-2">Mô tả</h2>
          <p class="text-sm text-gray-700 whitespace-pre-line">{{ book.description }}</p>
        </div>

        <!-- Đánh giá -->
        <div>
          <h2 class="text-xl font-semibold mb-2">Đánh giá của bạn</h2>
          <div class="flex gap-1 text-yellow-500 text-xl">
            <span v-for="star in 5" :key="star" class="cursor-pointer" @click="setRating(star)">
              <font-awesome-icon :icon="[rating >= star ? 'fas' : 'far', 'star']" />
            </span>
          </div>
        </div>

        <!-- Trung bình đánh giá -->
        <div class="text-gray-700">
          ⭐ <strong>{{ averageRating }}/5</strong> ({{ totalRatings }} lượt đánh giá)
        </div>

        <!-- Bình luận -->
        <div>
          <h2 class="text-xl font-semibold mb-2 mt-6">Bình luận</h2>

          <!-- Gửi bình luận -->
          <div v-if="isLoggedIn" class="mb-4">
            <textarea
              v-model="newComment"
              rows="3"
              placeholder="Nhập bình luận của bạn..."
              class="w-full border rounded-md p-2"
            ></textarea>
            <button
              @click="submitComment"
              class="mt-2 bg-[#8B4513] text-white px-4 py-2 rounded hover:bg-[#6B3510]"
            >
              Gửi bình luận
            </button>
          </div>

          <div v-else class="text-gray-500 italic mb-4">
            Vui lòng đăng nhập để bình luận.
          </div>

          <!-- Danh sách bình luận -->
          <div v-if="comments.length === 0" class="text-gray-500">Chưa có bình luận nào.</div>
          <div v-else class="space-y-4">
            <div
              v-for="cmt in comments"
              :key="cmt._id"
              class="flex items-start gap-3 border-b pb-3 relative"
            >
              <img
                :src="getAvatarUrl(cmt.userId.avatar)"
                class="w-10 h-10 rounded-full object-cover"
                @error="onImageError"
              />
              <div>
                <p class="font-semibold">{{ cmt.userId.name }}</p>
                <p class="text-sm text-gray-700">{{ cmt.content }}</p>
              </div>
              <button
                v-if="isLoggedIn && (cmt.userId._id === userId || isAdmin)"
                @click="deleteComment(cmt._id)"
                class="absolute top-0 right-0 text-red-500 hover:underline text-sm"
              >
                ✖
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 🛒 PHẦN PHẢI (40%) -->
      <div class="md:w-2/5 space-y-4 border p-6 rounded-xl shadow-md h-fit">
        <h1 class="text-2xl font-bold">{{ book.title }}</h1>
        <p class="text-gray-600 text-sm">Tác giả: {{ book.author }}</p>
        <div class="text-yellow-500 text-lg">
          ⭐ {{ averageRating }}/5 ({{ totalRatings }} đánh giá)
        </div>
        <p class="text-green-600 text-2xl font-bold">
          {{ formatPrice(book.price) }}₫
        </p>

        <div class="flex flex-col gap-3 mt-4">
          <button
            @click="addToCart(book)"
            class="bg-[#8B4513] hover:bg-[#6B3510] text-white py-2 rounded"
          >
            🛒 Thêm vào giỏ hàng
          </button>
          <button class="bg-green-600 hover:bg-green-700 text-white py-2 rounded">
            💳 Thanh toán
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-gray-500">Đang tải sách...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

// Biến chính
const route = useRoute();
const book = ref(null);
const rating = ref(0);
const averageRating = ref(0);
const totalRatings = ref(0);
const comments = ref([]);
const newComment = ref('');

// Auth
const token = localStorage.getItem('token');
const isLoggedIn = !!token;
const userId = localStorage.getItem('userId');
const isAdmin = localStorage.getItem('role') === 'admin';

// Lấy sách, đánh giá, bình luận
onMounted(async () => {
  const { id } = route.params;

  const res = await axios.get(`/api/books/${id}`);
  book.value = res.data;

  const ratingRes = await axios.get(`/api/rating/${id}/rating`);
  averageRating.value = ratingRes.data.average;
  totalRatings.value = ratingRes.data.total;

  const cmtRes = await axios.get(`/api/comments/${id}/comments`);
  comments.value = cmtRes.data;
  if (isLoggedIn) {
  const myRatingRes = await axios.get(`/api/rating/${id}/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  rating.value = myRatingRes.data.value || 0;
}
});

// Gửi rating
const setRating = async (value) => {
  if (!isLoggedIn) return alert('Vui lòng đăng nhập để đánh giá!');
  rating.value = value;

  try {
    await axios.post(
      '/api/rating',
      { bookId: book.value._id, value },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const res = await axios.get(`/api/rating/${book.value._id}/rating`);
    averageRating.value = res.data.average;
    totalRatings.value = res.data.total;
  } catch (err) {
    console.error(err);
    alert('Lỗi khi gửi đánh giá');
  }
};

// Gửi bình luận
const submitComment = async () => {
  if (!newComment.value.trim()) return;

  try {
    await axios.post(
      '/api/comments',
      { bookId: book.value._id, content: newComment.value },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    newComment.value = '';
    const res = await axios.get(`/api/comments/${book.value._id}/comments`);
    comments.value = res.data;
  } catch (err) {
    console.error(err);
    alert('Lỗi khi gửi bình luận');
  }
};

// Xoá bình luận
const deleteComment = async (id) => {
  if (!confirm('Xác nhận xoá bình luận?')) return;

  try {
    await axios.delete(`/api/comments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    comments.value = comments.value.filter((c) => c._id !== id);
  } catch (err) {
    console.error(err);
    alert('Lỗi khi xoá bình luận');
  }
};

// Xử lý ảnh avatar
const getAvatarUrl = (avatar) => {
  if (!avatar || avatar.includes('default-user.png')) {
    return 'http://localhost:5000/uploads/avatars/default-user.png';
  }
  return `http://localhost:5000/${avatar}`;
};

const onImageError = (e) => {
  e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png';
};

// Giỏ hàng demo
const addToCart = (book) => {
  console.log('Thêm vào giỏ hàng:', book.title);
};

const formatPrice = (price) => price.toLocaleString();
</script>
