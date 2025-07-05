<template>

  <div class="p-6">
    <BookSlider genre="Comics" title="Truyện Tranh (Comics)" />
  </div>

  <div class="p-6">
    <BookSlider genre="Viễn Tưởng" title="Viễn Tưởng" />
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import BookSlider from '@/components/BookSlider.vue' // 👈 Import

const books = ref([])

const fetchBooks = async () => {
  try {
    const res = await axios.get('/api/books')
    books.value = res.data
  } catch (err) {
    console.error('Lỗi khi tải sách:', err)
  }
}

onMounted(fetchBooks)
</script>
