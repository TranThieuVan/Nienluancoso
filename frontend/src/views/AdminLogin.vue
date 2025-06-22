<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white p-10 rounded-lg shadow-lg w-[35rem] border-2 border-blue-400">
      <!-- Tiêu đề chào mừng -->
      <h1 class="text-3xl font-bold text-blue-600 text-center mb-4">
        Chào mừng quản trị viên!
      </h1>

      <h2 class="text-2xl font-bold text-center mb-6">Đăng nhập</h2>
      
      <form @submit.prevent="handleLogin">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium">Mã số nhân viên</label>
          <input 
            v-model="employeeId" 
            type="text" 
            class="w-full p-3 border border-gray-300 rounded mt-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            required 
          />
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 font-medium">Mật khẩu</label>
          <input 
            v-model="password" 
            type="password" 
            class="w-full p-3 border border-gray-300 rounded mt-1 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            required 
          />
        </div>

        <button 
          type="submit" 
          class="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition font-semibold"
        >
          Đăng nhập
        </button>
        
        <!-- Thông báo đăng nhập thành công -->
        <p v-if="success" class="text-green-500 text-center mt-4 font-semibold">
          Đăng nhập thành công!
        </p>
        
        <!-- Hiển thị lỗi nếu có -->
        <p v-if="error" class="text-red-500 text-center mt-4">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      employeeId: "",
      password: "",
      error: "",
      success: false, // ✅ Thêm trạng thái thông báo thành công
    };
  },
  methods: {
    async handleLogin() {
      try {
        const response = await axios.post("http://localhost:5000/api/admin/login", 
          {
            employeeId: this.employeeId,
            password: this.password
          },
          {
            headers: { "Content-Type": "application/json" }
          }
        );

        if (response.data.token) {
          localStorage.setItem("adminToken", response.data.token);
          
          // ✅ Hiển thị thông báo thành công
          this.success = true;
          this.error = "";
          
          // ✅ Chờ 1 giây rồi chuyển hướng
          setTimeout(() => {
            this.$router.push("/admin/home");
          }, 1000);
        } else {
          this.error = "Sai mã số nhân viên hoặc mật khẩu";
        }
      } catch (err) {
        this.error = err.response?.data?.message || "Đăng nhập thất bại, thử lại!";
      }
    }
  }
};
</script>