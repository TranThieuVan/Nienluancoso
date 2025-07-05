<template>
    <div class="p-6">  
      <BookSlider
  v-if="filteredBooks.length"
  :key="query" 
  :books="filteredBooks"
  :title="`Kết quả tìm kiếm cho '${query}'`"/>
  
      <div v-else class="text-gray-500">Không tìm thấy kết quả nào.</div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, onMounted } from 'vue'
  import axios from 'axios'
  import { useSearchStore } from '@/stores/useSearchStore'
  import BookSlider from '@/components/BookSlider.vue'
  
  const searchStore = useSearchStore()
  const query = ref(searchStore.query) // phản ứng theo pinia
  
  const allBooks = ref([])
  const filteredBooks = ref([])
  
  const fetchBooks = async () => {
    try {
      const res = await axios.get('/api/books')
      allBooks.value = res.data
      filterBooks()
    } catch (err) {
      console.error('Lỗi khi tìm kiếm:', err)
    }
  }
  
  const filterBooks = () => {
    const q = searchStore.query.trim().toLowerCase()
    filteredBooks.value = allBooks.value.filter(book =>
      book.title.toLowerCase().includes(q) ||
      book.author?.toLowerCase().includes(q) ||
      book.genre?.toLowerCase().includes(q)
    )
    query.value = searchStore.query
  }
  
  onMounted(fetchBooks)
  watch(() => searchStore.query, () => {
    filterBooks()
  })
  </script>
  