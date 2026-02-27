<template>
  <footer class="bg-gray-900 text-white py-10 mt-10">
    <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Logo + Giới thiệu -->
      <div>
        <h2 class="text-2xl font-bold mb-4"> BookNest</h2>
        <p class="text-sm text-gray-300">
          Nền tảng mua sách trực tuyến với hàng ngàn đầu sách chất lượng, hỗ trợ người dùng 24/7.
        </p>
      </div>

      <!-- Liên kết -->
      <div>
        <h3 class="text-xl font-semibold mb-4">Liên kết</h3>
        <ul class="space-y-2 text-sm text-gray-300">
          <li><router-link to="/" class="hover:underline">Trang chủ</router-link></li>
          <li><router-link to="/books" class="hover:underline">Sách</router-link></li>
          <li><router-link to="/cart" class="hover:underline">Giỏ hàng</router-link></li>
          <li><router-link to="/profile" class="hover:underline">Tài khoản</router-link></li>
        </ul>
      </div>

      <!-- Liên hệ -->
      <div>
        <h3 class="text-xl font-semibold mb-4">Liên hệ</h3>
<ul class="text-sm text-gray-300 space-y-2">
  <li class="flex items-center gap-2">
    <i class="fas fa-phone-alt text-yellow-400"></i>
    Hotline: 0123 456 789
  </li>
  <li class="flex items-center gap-2">
    <i class="fas fa-envelope text-yellow-400"></i>
    Email: support@booknest.vn
  </li>
  <li class="flex items-center gap-2">
    <i class="fas fa-map-marker-alt text-yellow-400"></i>
    123 Nguyễn Văn Cừ, Q.5, TP.HCM
  </li>
</ul>
      </div>
    </div>

    <div class="mt-10 text-center text-gray-500 text-xs border-t border-gray-700 pt-4">
      © 2025 BookNest. All rights reserved.
    </div>
  </footer>
</template>
