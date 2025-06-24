<template>
  <div>
    <!-- Loading Screen -->
    <div v-if="isLoading" class="w-full h-screen flex items-center justify-center bg-white">
      <span class="text-2xl font-bold text-green-600 animate-pulse">Đang tải trang...</span>
    </div>

    <!-- Main content -->
    <div v-else>
      <!-- Banner toàn màn hình -->
      <div class="relative top-[-10] w-full h-[93vh] overflow-hidden">
        <!-- Slideshow wrapper -->
        <div
          class="flex h-full"
          :class="isTransitioning ? 'transition-transform duration-[2000ms] ease-in-out' : ''"
          :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
          @transitionend="handleTransitionEnd"
        >
          <div
            v-for="(image, index) in duplicatedImages"
            :key="index"
            class="w-full h-screen bg-cover bg-center flex-shrink-0"
            :style="{ backgroundImage: `url(${image})` }"
          ></div>
        </div>

        <!-- Overlay content -->
        <div class="absolute bottom-5 left-10 flex flex-col items-start justify-start p-6">
          <h1 class="text-black bg-white text-2xl font-bold p-2">Chào mừng đến với Thư viện</h1>
          <p class="text-black bg-white text-lg mt-1 p-2">Khám phá hàng ngàn cuốn sách thú vị</p>
          <router-link to="/books" class="mt-6 bg-white-500 text-black px-6 py-3 bg-white rounded hover:bg-gray-300 hover:scale-105 transition">
            Xem sách ngay ->
          </router-link>
        </div>
      </div>

      <!-- Section sách mới cập nhật -->
      <section class="py-12 px-6">
        <h2 class="text-2xl font-semibold mb-6 text-center">Sách mới cập nhật</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <div class="bg-white shadow-md rounded p-4 hover:shadow-lg transition">
            <img src="http://localhost:5000/images/miles.jpg" alt="Bìa sách" class="w-full h-48 object-cover rounded" />
            <h3 class="mt-4 text-lg font-bold">Tên sách</h3>
            <p class="text-gray-600">Tác giả: Nguyễn Văn A</p>
            <span class="text-green-600 font-semibold">Còn sẵn</span>
          </div>
          <!-- Thêm các card sách khác -->
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-gray-800 text-white py-4 mt-8">
        <p class="text-center">&copy; 2025 Quản lý Mượn Sách. Tất cả các quyền được bảo vệ.</p>
        <p class="text-center">
          <a href="#" class="hover:text-green-500">Liên hệ</a> |
          <a href="#" class="hover:text-green-500">Điều khoản sử dụng</a>
        </p>
      </footer>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import miles1 from '../assets/image/miles1.jpg'
import miles2 from '../assets/image/miles2.jpg'
import peter1 from '../assets/image/peter1.jpg'
import peter2 from '../assets/image/peter2.jpg'
import peter3 from '../assets/image/peter3.jpg'
import gwen1 from '../assets/image/gwen1.jpg'
import together1 from '../assets/image/together1.jpg'
import together2 from '../assets/image/together2.jpg'

export default {
  setup() {
    const isLoading = ref(true)

    const images = [
      'http://localhost:5000/images/245.jpg.webp',
      together1,
      together2,
    ]

    const reviews = [
      { image: miles1, text: 'If you love books, and love people who love books, LibraryThing is for you.' },
      { image: miles2, text: 'There are also suggestions of related books to read; it\'s a virtual feast of information.' },
      { image: peter1, text: 'And it’s all free, with no membership fees, download limits, or ads–how awesome is that?' },
      { image: peter2, text: 'Creating a catalog on the website is easy.' },
      { image: peter3, text: 'Not surprisingly, librarians love LibraryThing.' },
      { image: gwen1, text: 'LibraryThing has evolved into more than just a handy tool; it has become a thriving community.' },
    ]

    const preloadImages = (urls) => {
      return Promise.all(
        urls.map(url => {
          return new Promise(resolve => {
            const img = new Image()
            img.src = url
            img.onload = img.onerror = resolve
          })
        })
      )
    }

    const currentIndex = ref(0)
    const isTransitioning = ref(true)
    const duplicatedImages = computed(() => [...images, images[0]])

    let slideInterval = null

    const startSlide = () => {
      stopSlide()
      slideInterval = setInterval(() => {
        isTransitioning.value = true
        currentIndex.value++
      }, 5000)
    }

    const stopSlide = () => {
      if (slideInterval) clearInterval(slideInterval)
    }

    const handleTransitionEnd = () => {
      if (currentIndex.value === images.length) {
        isTransitioning.value = false
        currentIndex.value = 0
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startSlide()
      } else {
        stopSlide()
      }
    }

    onMounted(async () => {
      document.addEventListener('visibilitychange', handleVisibilityChange)

      const bannerImageUrls = images
      const reviewImageUrls = reviews.map(r => r.image)

      await preloadImages([...bannerImageUrls, ...reviewImageUrls])
      isLoading.value = false
      startSlide()
    })

    onBeforeUnmount(() => {
      stopSlide()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })

    return {
      isLoading,
      images,
      reviews,
      currentIndex,
      isTransitioning,
      duplicatedImages,
      handleTransitionEnd,
    }
  },
}
</script>

<style scoped>
/* Thêm hiệu ứng loading nhẹ nếu muốn */
</style>