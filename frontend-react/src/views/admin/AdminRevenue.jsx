import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

/* ─── Helpers ───────────────────────────────────────────────────── */
const WEEK_LABELS = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'];

const formatShort = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(n);
};

const formatFull = (n) => (n ?? 0).toLocaleString('vi-VN') + '₫';

/* ─── Component ─────────────────────────────────────────────────── */
const AdminRevenue = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  /* Chart.js refs */
  const canvasRef = useRef(null);

  const fetchRevenue = async () => {
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(
        `/api/admin/revenue/weekly?month=${selectedMonth}&year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWeeklyRevenue(res.data.weeklyRevenue || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setWeeklyRevenue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, [selectedMonth, selectedYear]);

  /* Stats */
  const stats = useMemo(() => {
    const total = weeklyRevenue.reduce((s, v) => s + v, 0);
    const active = weeklyRevenue.filter(v => v > 0);
    const peak = active.length ? Math.max(...active) : 0;
    const avg = active.length ? Math.round(total / active.length) : 0;
    const bestIdx = weeklyRevenue.indexOf(peak);
    return { total, peak, avg, bestWeek: peak > 0 ? WEEK_LABELS[bestIdx] : '—', bestIdx };
  }, [weeklyRevenue]);

  const hasData = weeklyRevenue.some(v => v > 0);

  /* ── Chart.js: Khởi tạo & Tự động dọn dẹp (Fix bug mất biểu đồ) ── */
  useEffect(() => {
    if (!canvasRef.current || !hasData) return;

    const colors = weeklyRevenue.map((_, i) =>
      i === stats.bestIdx ? '#4f46e5' : '#c7d2fe'
    );

    const chartInstance = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: WEEK_LABELS,
        datasets: [{
          data: weeklyRevenue,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 44,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' ' + formatFull(ctx.raw),
            },
            bodyFont: { family: "monospace", size: 13 },
            titleFont: { family: "sans-serif", size: 12 },
            backgroundColor: '#1f2937',
            titleColor: '#9ca3af',
            bodyColor: '#f9fafb',
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { size: 12 }, color: '#9ca3af' },
          },
          y: {
            grid: { color: '#f3f4f6' },
            border: { display: false },
            ticks: {
              font: { size: 12 },
              color: '#6b7280',
              callback: v => formatShort(v),
            },
          },
        },
      },
    });

    // Cleanup function: Hủy biểu đồ cũ khi Component re-render hoặc unmount
    return () => {
      chartInstance.destroy();
    };
  }, [weeklyRevenue, hasData, stats.bestIdx]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 md:p-10 font-sans">

      {/* ── Header ── */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-[10px] tracking-[.18em] uppercase text-indigo-600 font-bold mb-1">
            Admin · Bookstore
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 m-0">
            Thống kê Doanh thu
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold whitespace-nowrap">Tháng</span>
            <select
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs cursor-pointer outline-none shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold whitespace-nowrap">Năm</span>
            <select
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs cursor-pointer outline-none shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Tổng tháng', dot: 'bg-indigo-600', value: formatFull(stats.total) },
          { label: 'Tuần cao nhất', dot: 'bg-green-600', value: formatFull(stats.peak) },
          { label: 'Trung bình / tuần', dot: 'bg-yellow-500', value: formatFull(stats.avg) },
          { label: 'Tuần tốt nhất', dot: 'bg-indigo-400', value: stats.bestWeek },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] uppercase tracking-[.12em] text-gray-400 font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full inline-block ${s.dot}`} />
              {s.label}
            </div>
            <div className="text-lg md:text-xl font-bold text-gray-900 mt-1.5 font-mono break-all">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-sm shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500 mb-3"></i>
          Đang tải dữ liệu...
        </div>
      ) : !hasData ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-sm shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <i className="fa-regular fa-folder-open text-4xl text-gray-300 mb-3"></i>
          Không có dữ liệu doanh thu cho tháng {selectedMonth}/{selectedYear}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-gray-700 m-0">Doanh thu theo tuần</p>
              <p className="text-xs text-gray-400 mt-1">Tháng {selectedMonth} · {selectedYear}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" />
              Doanh thu (VNĐ)
            </div>
          </div>

          {/* Canvas */}
          <div className="relative w-full h-[260px]">
            <canvas ref={canvasRef} />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation text-lg"></i>
          {error}
        </div>
      )}
    </div>
  );
};

export default AdminRevenue;