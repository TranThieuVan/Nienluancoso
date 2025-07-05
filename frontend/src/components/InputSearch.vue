<template>
    <div class="relative w-full md:w-64">
      <input
        v-model="searchQuery"
        @keyup.enter="emitSearch"
        type="text"
        placeholder="Tìm sách..."
        class="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
      <font-awesome-icon
        icon="magnifying-glass"
        class="absolute right-3 top-2.5 text-gray-500 cursor-pointer"
        @click="emitSearch"
      />
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useSearchStore } from '@/stores/useSearchStore'
  
  const searchQuery = ref('')
  const router = useRouter()
  const searchStore = useSearchStore()
  
  const emitSearch = () => {
    if (!searchQuery.value.trim()) return
    searchStore.setQuery(searchQuery.value.trim())
    router.push('/search')
  }
  </script>
  