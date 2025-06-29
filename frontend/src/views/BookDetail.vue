<template>
  <div class="p-6 max-w-6xl mx-auto mt-10">
    <div v-if="book" class="flex flex-col md:flex-row gap-6">
      <!-- 📘 PHẦN TRÁI (60%) -->
      <div class="md:w-3/5 space-y-6">
        <div class="rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.15)] bg-white overflow-hidden">
  <!-- Ảnh sách tràn viền -->
  <img :src="book.image" alt="Book Cover" class="w-full h-full object-cover rounded-b-xl" />

  <!-- Phần nội dung bên dưới có padding -->
  <div class="p-4">
    <!-- Chi tiết sản phẩm -->
    <div>
      <h2 class="text-xl font-semibold mb-2">Chi tiết sản phẩm</h2>
      <p><strong>Thể loại:</strong> {{ book.genre }}</p>
      <p><strong>Tác giả:</strong> {{ book.author }}</p>
    </div>

    <!-- Mô tả -->
    <div class="mt-4">
      <h2 class="text-xl font-semibold mb-2">Mô tả</h2>
      <p class="text-sm text-gray-700 whitespace-pre-line">{{ book.description }}</p>
    </div>
  </div>
</div>

        <!-- Đánh giá -->
        <div class="p-4 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.15)] bg-white flex justify-between">
          <h2 class="text-xl font-semibold mb-2">Đánh giá sách</h2>
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
          <div v-if="isLoggedIn" class="mb-4 flex items-center gap-3">
            <!-- Avatar -->
            <img :src="getAvatarUrl(user.avatar)" class="w-10 h-10 rounded-full object-cover" alt="Avatar" @error="onImageError" />

            <!-- Textarea -->
            <div class="flex-1 flex items-center border rounded-md px-2">
              <textarea ref="ta" v-model="msg" class="flex-1 resize-none overflow-hidden leading-relaxed focus:outline-none p-2" rows="1" placeholder="Nhập nội dung..." @input="onInput"></textarea>
            </div>

            <!-- Icon gửi -->
            <button @click="submitComment" class="text-[#8B4513] hover:text-[#6B3510] text-2xl" title="Gửi">
              <font-awesome-icon :icon="['fas', 'paper-plane']" />
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
      <div class="md:w-2/5 space-y-4 border p-6 rounded-xl shadow-md h-fit" style="position: sticky; right: 20px; top: 80px;">
        <h1 class="text-2xl font-bold">{{ book.title }}</h1>
        <p class="text-gray-600 text-sm">{{ book.author }}</p>
        <div class="text-yellow-500 text-lg">
          ⭐ {{ averageRating }}/5 ({{ totalRatings }} đánh giá)
        </div>
        <p class="text-green-600 text-2xl font-bold">
          {{ formatPrice(book.price) }}₫
        </p>

        <div class="flex flex-col gap-3 mt-4">
          <button 
            @click="addToCart(book)"
            class="bg-[#8B4513] hover:bg-[#6B3510] text-white py-2 rounded-xl"
          >
            🛒 Thêm vào giỏ hàng
          </button>
          <button class="bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl">
            💳 Thanh toán
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-gray-500">Đang tải sách...</div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import autosize from 'autosize';
import { useCart } from '@/composables/useCart';
const { addToCart } = useCart();


const route = useRoute();
const book = ref(null);
const rating = ref(0);
const averageRating = ref(0);
const totalRatings = ref(0);
const comments = ref([]);
const msg = ref('');
const ta = ref(null);
const user = ref({});
const onInput = () => {
  if (ta.value) autosize.update(ta.value);
};
const token = localStorage.getItem('token');
const isLoggedIn = !!token;
const userId = localStorage.getItem('userId');
const isAdmin = localStorage.getItem('role') === 'admin';

// Khi component mount
onMounted(async () => {
  const { id } = route.params;

  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    user.value = JSON.parse(storedUser);
  }

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

  // Gắn autosize cho textarea
  await nextTick();
  if (ta.value) autosize(ta.value);
});

// Theo dõi msg và resize lại textarea khi nội dung thay đổi
watch(msg, () => {
  if (ta.value) autosize.update(ta.value);
});

// Gửi đánh giá
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
  if (!msg.value.trim()) return;

  try {
    await axios.post(
      '/api/comments',
      { bookId: book.value._id, content: msg.value },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    msg.value = '';

    const res = await axios.get(`/api/comments/${book.value._id}/comments`);
    comments.value = res.data;

    if (ta.value) {
      autosize.update(ta.value);
    }
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

// Avatar helper
const getAvatarUrl = (avatar) => {
  if (!avatar || avatar.includes('default-user.png')) {
    return 'http://localhost:5000/uploads/avatars/default-user.png';
  }
  return `http://localhost:5000/${avatar}`;
};

const onImageError = (e) => {
  e.target.src = 'http://localhost:5000/uploads/avatars/default-user.png';
};

const formatPrice = (price) => price.toLocaleString();
</script>
