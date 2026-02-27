<template>
  <div>
    <canvas ref="canvas" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const props = defineProps({
  data: Array,
  labels: { type: Array, default: () => ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'] }
});

const canvas = ref();
let chart;

const renderChart = () => {
  if (chart) chart.destroy();

  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: [{
        label: 'Doanh thu (VND)',
        data: props.data,
        backgroundColor: '#22c55e'
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          ticks: {
            callback: val => val.toLocaleString('vi-VN') + '₫'
          }
        }
      }
    }
  });
};

watch(() => props.data, renderChart);
onMounted(renderChart);
</script>
