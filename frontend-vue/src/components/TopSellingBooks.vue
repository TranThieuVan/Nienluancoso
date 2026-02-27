<template>
  <div class="mt-10" v-if="books.length">
    <h2 class="text-4xl mb-12 font-semibold mb-4 text-center">🔥 Top 5 Sách Bán Chạy Nhất</h2>
    
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <div
        v-for="(book, index) in books"
        :key="book._id"
        class="group bigger-small"  
      >
        <router-link :to="`/books/${book._id}`" class="block">
          <!-- Ảnh tràn viền, không có border hay radius -->
        <div class="overflow-hidden aspect-[3/4]">
          <img
            :src="book.image"
            alt="Book Image"
            class="w-full h-full rounded rounded-3xl object-cover transition-all duration-300 border-transparent group-hover:border-black border-[4px]"
          />
        </div>

          <!-- Thông tin sách -->
          <div class="flex gap-4 items-center px-3 mt-2">
            <div class="text-black text-6xl font-bold">
              {{ index + 1 }}
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-medium line-clamp-2 break-words">
                {{ book.title }}
              </h3>
              <p class="text-xs text-gray-500 truncate">Tác giả: {{ book.author }}</p>
              <p class="text-xs font-semibold text-gray-500">
                {{ Number(book.price).toLocaleString() }}₫
              </p>
              <p class="text-sm text-red-800">Đã bán: {{ book.totalSold }}</p>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>


<style scoped>
.hover-border-thick {
  transition: border 0.3s ease;
}
.hover-border-thick:hover {
  border: 10px solid black;
}
</style>


<script setup>
defineProps({
  books: {
    type: Array,
    required: true
  }
});
</script>
