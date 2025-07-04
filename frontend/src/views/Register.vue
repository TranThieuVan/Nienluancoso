<template>
  <div class="min-h-screen flex items-center justify-center relative bg-cover bg-center"
       :style="{ backgroundImage: 'url(' + backgroundImage + ')' }">
    <div class="bg-white bg-opacity-50 p-8 rounded-lg shadow-lg w-full max-w-4xl border-2 border-[#8B4513] z-10">
      <h2 class="text-3xl font-bold text-center text-[#8B4513] mb-2">Chào mừng bạn!</h2>
      <p class="text-center text-gray-600 mb-6">Đăng ký để bắt đầu hành trình của bạn</p>

      <form @submit.prevent="register" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Cột bên trái -->
        <div class="space-y-4">
          <div>
            <label class="block text-gray-700 font-medium">Email</label>
            <input v-model="form.email" type="email" required
              class="w-full p-3 border border-[#8B4513] rounded focus:outline-none focus:ring-2 focus:ring-[#8B4513]">
          </div>

          <div>
            <label class="block text-gray-700 font-medium">Mật Khẩu</label>
            <input v-model="form.password" type="password" required
              class="w-full p-3 border border-[#8B4513] rounded focus:outline-none focus:ring-2 focus:ring-[#8B4513]">
          </div>

          <div>
            <label class="block text-gray-700 font-medium">Nhập Lại Mật Khẩu</label>
            <input v-model="form.confirmPassword" type="password" required
              class="w-full p-3 border border-[#8B4513] rounded focus:outline-none focus:ring-2 focus:ring-[#8B4513]">
            <p v-if="passwordMismatch" class="text-red-500 text-sm mt-1">⚠️ Mật khẩu không khớp</p>
          </div>
        </div>

        <!-- Cột bên phải -->
        <div class="space-y-4">
          <div class="mb-10">
            <label class="block text-gray-700 font-medium">Họ và Tên</label>
            <input v-model="form.name" type="text" required
              class="w-full p-3 border border-[#8B4513] rounded focus:outline-none focus:ring-2 focus:ring-[#8B4513]">
          </div>
          <div class="flex flex-col items-start gap-4 overflow-hidden rounded-md p-6 shadow-sm shadow-[#00000050]">
            <span class="text-center font-mono text-base font-black uppercase text-neutral-600">
              Hãy chọn giới tính của bạn
            </span>

            <div class="flex items-center gap-4">
              <!-- Nam -->
              <div class="relative flex h-[50px] w-[50px] items-center justify-center">
                <input v-model="form.gender" required type="radio" name="gender" value="male"
                  class="peer z-10 h-full w-full cursor-pointer opacity-0" />
                <div class="absolute h-full w-full rounded-full bg-blue-100 p-4 shadow-sm shadow-[#00000050] ring-blue-400 duration-300 peer-checked:scale-110 peer-checked:ring-2"></div>
              </div>

              <!-- Nữ -->
              <div class="relative flex h-[50px] w-[50px] items-center justify-center">
                <input v-model="form.gender" required type="radio" name="gender" value="female"
                  class="peer z-10 h-full w-full cursor-pointer opacity-0" />
                <div class="absolute h-full w-full rounded-full bg-pink-100 p-2 shadow-sm shadow-[#00000050] ring-pink-400 duration-300 peer-checked:scale-110 peer-checked:ring-2"></div>
              </div>
            </div>
          </div>

        </div>

        <button type="submit"
          class="col-span-2 w-full bg-[#8B4513] text-white font-bold py-3 rounded hover:bg-[#A0522D] transition duration-300 mb-4"
          :disabled="passwordMismatch">
          Đăng Ký
        </button>
      </form>

      <p class="text-center text-gray-600 mt-4">
        Đã có tài khoản?
        <router-link to="/login" class="text-[#8B4513] hover:underline">Đăng nhập ngay</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import backgroundImage from '../assets/image/register1.jpg';

const router = useRouter();

const form = ref({
  name: "",
  email: "",
  gender: "",
  password: "",
  confirmPassword: "",
});

const passwordMismatch = computed(() => form.value.password !== form.value.confirmPassword);

const register = async () => {
  if (passwordMismatch.value) {
    alert("Mật khẩu không khớp, vui lòng nhập lại!");
    return;
  }

  try {
    const res = await axios.post("http://localhost:5000/api/auth/register", form.value);
    alert("Đăng ký thành công!");
    router.push("/login");
  } catch (error) {
    console.error(error);
    alert("Lỗi: " + (error.response?.data?.msg || "Đăng ký thất bại"));
  }
};
</script>
