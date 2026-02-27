import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

// Đăng ký các thành phần của Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const BarChart = ({ data = [], labels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'] }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Doanh thu (VND)',
        data: data,
        backgroundColor: '#22c55e'
      }
    ]
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        ticks: {
          callback: (value) => value.toLocaleString('vi-VN') + '₫'
        }
      }
    }
  };

  return <Bar data={chartData} options={options} />;
};

export default BarChart;