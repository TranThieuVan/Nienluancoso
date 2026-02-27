<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-6">Thống kê doanh thu theo tuần</h1>

    <!-- Bộ chọn tháng và năm -->
    <div class="mb-6 flex items-center gap-4">
      <label class="font-medium">Chọn tháng:</label>
      <select v-model="selectedMonth" @change="fetchRevenue" class="border rounded px-3 py-1">
        <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
      </select>

      <label class="font-medium">Chọn năm:</label>
      <select v-model="selectedYear" @change="fetchRevenue" class="border rounded px-3 py-1">
        <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
      </select>
    </div>

    <!-- Biểu đồ và thống kê -->
    <div v-if="weeklyRevenue.length" class="bg-white shadow rounded-xl p-4">
      <BarChart :data="weeklyRevenue" :labels="weekLabels" />

      <div class="mt-6 text-sm text-gray-700">
        <p><strong>Tổng doanh thu:</strong> {{ formatCurrency(total) }}</p>
      </div>
    </div>

    <!-- Khi không có dữ liệu -->
    <div v-else class="text-gray-500">
      Không có dữ liệu doanh thu cho {{ selectedMonth }}/{{ selectedYear }}
    </div>
  </div>

  
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import BarChart from '@/components/BarChart.vue';

const now = new Date();
const selectedMonth = ref(now.getMonth() + 1); // 1-12
const selectedYear = ref(now.getFullYear());
const years = Array.from({ length: 5 }, (_, i) => selectedYear.value - i);

const weeklyRevenue = ref([]);
const total = ref(0);
const weekLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'];

const fetchRevenue = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    const res = await axios.get(
      `/api/admin/revenue/weekly?month=${selectedMonth.value}&year=${selectedYear.value}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    weeklyRevenue.value = res.data.weeklyRevenue;
    total.value = res.data.weeklyRevenue.reduce((sum, val) => sum + val, 0);
  } catch (err) {
    console.error('Lỗi lấy doanh thu tuần:', err);
    weeklyRevenue.value = [];
    total.value = 0;
  }
};

const formatCurrency = (num) => {
  return num.toLocaleString('vi-VN') + '₫';
};

onMounted(fetchRevenue);
</script>

<style scoped>
select {
  min-width: 100px;
}
</style>
