<template>
  <div class="p-6">
    <!-- Slider hiển thị sách -->
    <BookSlider
      title="Tất cả sách nè"
      :books="filteredBooks"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useSearchStore } from '@/stores/useSearchStore'
import BookSlider from '@/components/BookSlider.vue'
import InputSearch from '@/components/InputSearch.vue'

const books = ref([])
const searchStore = useSearchStore()

// Lấy danh sách sách từ backend
const fetchBooks = async () => {
  try {
    const res = await axios.get('/api/books')
    books.value = res.data
  } catch (err) {
    console.error('Lỗi khi tải sách:', err)
  }
}

// Lọc sách theo từ khóa
const filteredBooks = computed(() => {
  const keyword = searchStore.query.trim().toLowerCase()
  if (!keyword) return books.value
  return books.value.filter(b =>
    b.title.toLowerCase().includes(keyword) ||
    b.author?.toLowerCase().includes(keyword)
  )
})

onMounted(fetchBooks)
</script>
