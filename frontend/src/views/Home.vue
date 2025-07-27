<template>
<div class="flex justify-center items-center mx-auto w-fit p-6">
    <div class="flex w-full">
      <!-- Cột trái -->
      <div class="w-[40%] flex flex-col justify-center bg-yellow-100 p-6 rounded-l-2xl">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">
          Bạn đã mua được gì chưa?
        </h2>
      <button
        @click="goToFilteredBooks('highest-rated')"
        class="hover-flip-btn px-4 py-2 border border-gray-800 w-max rounded"
      >
        Xem ngay
      </button>
      </div>

      <!-- Cột phải -->
      <div class="w-[60%]">
        <img
          src="@/assets/image/banner.png"
          alt="Banner"
          class="h-full object-cover rounded-r-2xl"
        />
      </div>
    </div>
</div>


  <div class="p-6 mb-20  mx-auto mt-10">
    <TopSellingBooks :books="topBooks" />
  </div>
  

  <div class="p-6">
    <BookSlider genre="Comics" title="Bạn yêu thích truyện tranh (Comics)" />
  </div>

  <div class="p-6">
    <BookSlider genre="Viễn Tưởng" title="Sách Viễn Tưởng hay không tưởng" />
  </div>


     <div class="p-6">
    <BookSlider genre="Tiểu thuyết" title="Tuyển tập các tiểu thuyết lôi cuốn" />
  </div>


  <div class="p-6">
    <BookSlider genre="Lãng mạn" title="Bạn thích một chút lãng mạn?" />
  </div>

  <div class="p-6">
    <BookSlider genre="Khoa học" title="Nội dung khoa học cho bạn" />
  </div>

    <div class="p-6">
    <BookSlider genre="Tài chính" title="Bạn muốn có nền tảng cho việc kinh doanh?" />
  </div>

</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import BookSlider from '@/components/BookSlider.vue'
import TopSellingBooks from '@/components/TopSellingBooks.vue'

import { useRouter } from 'vue-router'
const topBooks = ref([])

const router = useRouter()
const goToFilteredBooks = (filterType) => {
  router.push({ name: 'BookList', query: { filter: filterType } })
}
const fetchTopSellingBooks = async () => {
  try {
    const res = await axios.get('/api/books/top-selling')
    topBooks.value = res.data
  } catch (err) {
    console.error('Lỗi khi lấy sách bán chạy:', err)
  }
}

onMounted(() => {
  fetchTopSellingBooks()
})
</script>
