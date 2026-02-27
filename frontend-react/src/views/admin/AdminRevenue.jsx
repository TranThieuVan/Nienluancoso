import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BarChart from '@/components/BarChart'; // Hãy đảm bảo component này đã được chuyển sang React

const AdminRevenue = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [total, setTotal] = useState(0);
  const weekLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'];

  const fetchRevenue = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(
        `/api/admin/revenue/weekly?month=${selectedMonth}&year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWeeklyRevenue(res.data.weeklyRevenue);
      setTotal(res.data.weeklyRevenue.reduce((sum, val) => sum + val, 0));
    } catch (err) {
      console.error('Lỗi lấy doanh thu tuần:', err);
      setWeeklyRevenue([]);
      setTotal(0);
    }
  };

  useEffect(() => {
    fetchRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const formatCurrency = (num) => {
    return num.toLocaleString('vi-VN') + '₫';
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Thống kê doanh thu theo tuần</h1>

      <div className="mb-6 flex items-center gap-4">
        <label className="font-medium">Chọn tháng:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="border rounded px-3 py-1 min-w-[100px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <label className="font-medium">Chọn năm:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border rounded px-3 py-1 min-w-[100px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {weeklyRevenue.length > 0 ? (
        <div className="bg-white shadow rounded-xl p-4">
          {/* Component BarChart từ Chart.js hoặc Recharts */}
          <BarChart data={weeklyRevenue} labels={weekLabels} />

          <div className="mt-6 text-sm text-gray-700">
            <p className="text-lg"><strong>Tổng doanh thu:</strong> <span className="text-green-600">{formatCurrency(total)}</span></p>
          </div>
        </div>
      ) : (
        <div className="text-gray-500">
          Không có dữ liệu doanh thu cho {selectedMonth}/{selectedYear}
        </div>
      )}
    </div>
  );
};

export default AdminRevenue;