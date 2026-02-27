<!-- src/layouts/AdminLayout.vue -->
<template>
  <div class="flex min-h-screen">
    <AdminNavbar />
    <main class="ml-64 flex-1 bg-gray-100 p-6 overflow-auto min-h-screen">
            <router-view />
    </main>
  </div>
</template>

<script setup>
import AdminNavbar from '@/components/AdminNavbar.vue'
</script>
