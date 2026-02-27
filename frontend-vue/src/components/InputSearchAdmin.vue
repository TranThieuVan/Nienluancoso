<template>
    <div class="relative w-full">
      <!-- Icon bên trong input -->
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
        <font-awesome-icon icon="magnifying-glass" class="w-4 h-4" />
      </div>
  
      <!-- Input có padding trái để tránh đè icon -->
      <input
        type="text"
        :placeholder="placeholder"
        v-model="input"
        @keydown.enter.prevent="emitSearch"
        class="pl-10 py-2 border rounded w-full"
      />
    </div>
  </template>
  <script setup>
  import { ref, watch } from 'vue'
  
  const props = defineProps({
    modelValue: String,
    placeholder: { type: String, default: 'Tìm kiếm...' }
  })
  
  const emit = defineEmits(['update:modelValue', 'search'])
  
  const input = ref(props.modelValue || '')
  
  watch(() => props.modelValue, val => input.value = val)
  watch(input, val => emit('update:modelValue', val))
  
  const emitSearch = () => {
    emit('search', input.value)
  }
  </script>
  