<template>
    <div class="flex justify-center mt-6 items-center gap-1 text-sm select-none">
      <!-- Prev -->
      <button
        @click="$emit('page-change', currentPage - 1)"
        :disabled="currentPage === 1"
        class="px-2 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
      >
        <font-awesome-icon icon="angle-left" />
      </button>
  
      <!-- Pages -->
      <template v-for="page in visiblePages" :key="page">
        <span
          v-if="page === '...'"
          class="px-2 py-1 text-gray-500"
        >
          ...
        </span>
        <button
          v-else
          @click="$emit('page-change', page)"
          class="px-2 py-1 border rounded hover:bg-gray-100"
          :class="{ 'bg-blue-500 text-white': currentPage === page }"
        >
          {{ page }}
        </button>
      </template>
  
      <!-- Next -->
      <button
        @click="$emit('page-change', currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="px-2 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
      >
        <font-awesome-icon icon="angle-right" />
      </button>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  
  const props = defineProps({
    currentPage: { type: Number, required: true },
    totalPages: { type: Number, required: true },
  })
  defineEmits(['page-change'])
  
  const visiblePages = computed(() => {
    const pages = []
    const total = props.totalPages
    const current = props.currentPage
  
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i)
    } else {
      pages.push(1)
  
      if (current > 4) pages.push('...')
  
      const start = Math.max(2, current - 1)
      const end = Math.min(total - 1, current + 1)
  
      for (let i = start; i <= end; i++) pages.push(i)
  
      if (current < total - 3) pages.push('...')
  
      pages.push(total)
    }
  
    return pages
  })
  </script>