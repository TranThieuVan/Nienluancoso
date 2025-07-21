<template>
  <div class="mt-10 mb-20" v-if="books.length">
    <h2 class="text-4xl mb-12 font-semibold mb-4 text-center">🔥 Top 5 Sách Bán Chạy Nhất</h2>
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div
        v-for="(book, index) in books"
        :key="book._id"

      >
        <!-- ICON TOP -->

        <router-link :to="`/books/${book._id}`">
          <img
            :src="book.image"
            alt="Book Image"
            class="w-full h-full object-cover mb-2 rounded rounded-3xl transition hover:border-thick hover:shadow-lg hover-border-thick"
          />

          <div class="flex gap-4 items-center px-3">
              <div
                class="text-black text-7xl px-4 py-1 font-bold"
              >
                {{ index + 1 }}
              </div>
              <div>
              <h3 class="text-sm font-medium line-clamp-2 break-words">
  {{ book.title }}
</h3>
                <p class="text-xs text-gray-500 truncate">Tác giả: {{ book.author }}</p>
                <p class="text-sm font-semibold text-red-600">
                  {{ Number(book.price).toLocaleString() }}₫
                </p>
            <p class="text-xs text-gray-500">Đã bán: {{ book.totalSold }}</p>

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
  border: 7px solid black;
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
