import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

/* ── UTILITIES ── */
const fmt = (n) => (n ?? 0).toLocaleString('vi-VN') + '₫';
const fmtShort = (n) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(n);
};
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');
const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const CHART_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16', '#fb923c', '#ec4899'];
const RANK_COLORS = { 'Khách hàng': '#94a3b8', 'Bạc': '#cbd5e1', 'Vàng': '#fbbf24', 'Bạch kim': '#818cf8', 'Kim cương': '#38bdf8' };

const STATUS_MAP = {
  pending: { label: 'Đang xử lý', cls: 'bg-amber-100 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  shipping: { label: 'Đang giao', cls: 'bg-violet-100 text-violet-700 border border-violet-200', dot: 'bg-violet-500' },
  delivered: { label: 'Đã giao', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-100 text-red-600 border border-red-200', dot: 'bg-red-500' },
};

const PERIOD_OPTIONS = [
  { key: 'week', label: 'Tuần này' }, { key: 'month', label: 'Tháng này' },
  { key: 'year', label: 'Năm này' }, { key: 'all', label: 'Tất cả' },
];

/* ── ATOMS ── */
const KpiCard = ({ label, value, sub, dotCls, icon, highlight }) => (
  <div className={`bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3 border ${highlight ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotCls}`} />
        <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">{label}</p>
      </div>
      <i className={`${icon} text-xl ${highlight ? 'text-indigo-400' : 'text-gray-300'}`} />
    </div>
    <p className="font-mono font-bold text-3xl text-gray-900 leading-none">{value}</p>
    {sub && <p className="text-xs text-gray-400">{sub}</p>}
  </div>
);

const SectionTitle = ({ children, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-base font-bold text-gray-700">{children}</h2>
    {action}
  </div>
);

const Badge = ({ status }) => {
  const b = STATUS_MAP[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${b.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
      {b.label}
    </span>
  );
};

const PeriodPicker = ({ value, onChange }) => (
  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
    {PERIOD_OPTIONS.map(o => (
      <button key={o.key} onClick={() => onChange(o.key)}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${value === o.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
        {o.label}
      </button>
    ))}
  </div>
);

const AnalyticsCard = ({ title, icon, iconColor, children, action }) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h3 className="text-base font-bold text-gray-700 flex items-center gap-2">
        <i className={`${icon} ${iconColor}`} />{title}
      </h3>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

/* ── CHART COMPONENTS ── */
const HBarChart = ({ labels, values, color = '#4f46e5', height = 220 }) => {
  const ref = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    if (!ref.current) return;
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 5, borderSkipped: false, barThickness: 18 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#f8fafc', padding: 10, cornerRadius: 8 } },
        scales: {
          x: { grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 }, callback: v => fmtShort(v) } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: '#374151', font: { size: 12, weight: '600' } } },
        },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [labels, values, color]);
  return <div style={{ height }}><canvas ref={ref} /></div>;
};

const DonutChart = ({ labels, values, colors, size = 160 }) => {
  const ref = useRef(null); const chartRef = useRef(null);
  const total = values.reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    if (!ref.current) return;
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 3, borderColor: '#fff', hoverOffset: 5 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw} (${total > 0 ? Math.round(ctx.raw / total * 100) : 0}%)` }, backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#f8fafc', padding: 10, cornerRadius: 8 } },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [labels, values, colors]);
  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <canvas ref={ref} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xl font-bold text-gray-900 font-mono leading-none">{total}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">tổng</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {labels.map((l, i) => {
          const pct = total > 0 ? Math.round(values[i] / total * 100) : 0;
          return (
            <div key={l}>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: colors[i] }} />{l}
                </span>
                <span className="font-mono text-xs text-gray-500 flex-shrink-0 ml-2">{values[i]} · {pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: colors[i] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LineChart = ({ labels, datasets, height = 200 }) => {
  const ref = useRef(null); const chartRef = useRef(null);
  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    if (!ref.current) return;
    chartRef.current = new Chart(ref.current, {
      type: 'line', data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: datasets.length > 1, labels: { font: { size: 11 }, color: '#6b7280', boxWidth: 10, boxHeight: 10 } },
          tooltip: { callbacks: { label: ctx => `  ${ctx.dataset.label}: ${fmtShort(ctx.raw)}` }, backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#f8fafc', padding: 10, cornerRadius: 8 },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: { grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 }, callback: v => fmtShort(v) } },
        },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [labels, datasets]);
  return <div style={{ height }}><canvas ref={ref} /></div>;
};

const RevenueChart = ({ data, year }) => {
  const ref = useRef(null); const chartRef = useRef(null);
  const total = data.reduce((s, v) => s + v, 0);
  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    if (!ref.current) return;
    const maxIdx = data.indexOf(Math.max(...data));
    const colors = data.map((_, i) => i === maxIdx ? '#4f46e5' : '#e0e7ff');
    const hoverColors = data.map((_, i) => i === maxIdx ? '#4338ca' : '#c7d2fe');
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: { labels: MONTH_LABELS, datasets: [{ data, backgroundColor: colors, hoverBackgroundColor: hoverColors, borderRadius: 7, borderSkipped: false, barThickness: 28 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => '  ' + fmt(ctx.raw) }, backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#f8fafc', bodyFont: { family: 'monospace', size: 13 }, padding: 12, cornerRadius: 8 } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 12 } } },
          y: { grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 }, callback: v => fmtShort(v) } },
        },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [data]);
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-full">
      <SectionTitle action={<div className="flex items-center gap-3"><span className="font-mono text-sm font-bold text-indigo-600">{fmt(total)}</span><span className="text-xs text-gray-400">Tổng năm {year}</span></div>}>
        <span className="flex items-center gap-2"><i className="fa-solid fa-chart-column text-indigo-500" />Doanh thu theo tháng — {year}</span>
      </SectionTitle>
      <div className="h-56"><canvas ref={ref} /></div>
    </div>
  );
};

const OrderDonut = ({ counts }) => {
  const ref = useRef(null); const chartRef = useRef(null);
  const labels = ['Đang xử lý', 'Đang giao', 'Đã giao', 'Đã hủy'];
  const colors = ['#f59e0b', '#8b5cf6', '#10b981', '#f43f5e'];
  const values = [counts.pending, counts.shipping, counts.delivered, counts.cancelled];
  const total = values.reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    if (!ref.current) return;
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 3, borderColor: '#fff', hoverOffset: 5 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw} đơn` }, backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#f8fafc', padding: 10, cornerRadius: 8 } } },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [counts]);
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <SectionTitle><span className="flex items-center gap-2"><i className="fa-solid fa-chart-pie text-violet-500" />Phân bổ đơn hàng</span></SectionTitle>
      <div className="flex-1 flex items-center justify-center gap-8">
        <div className="relative flex-shrink-0 w-36 h-36">
          <canvas ref={ref} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-2xl font-bold text-gray-900 font-mono leading-none">{total}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Tổng đơn</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {labels.map((l, i) => (
            <div key={l} className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: colors[i] }} />
              <span className="text-sm text-gray-500 w-24">{l}</span>
              <span className="font-mono text-sm font-bold text-gray-800">{values[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════════════════════════════ */
const AdminDashBoard = () => {
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  // State Overview
  const [overview, setOverview] = useState(null);

  // State Analytics Tab
  const [analyticsTab, setAnalyticsTab] = useState('author');
  const [periods, setPeriods] = useState({
    author: 'month', genre: 'month', retention: 'month', trend: 'month', behavior: 'month', voucher: 'month'
  });
  const [analyticsData, setAnalyticsData] = useState({});
  const [tabLoading, setTabLoading] = useState(false);

  // 1. Fetch Overview
  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const { data } = await axios.get('/api/admin/dashboard/overview', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOverview(data);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  // 2. Fetch Analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      setTabLoading(true);
      try {
        const token = localStorage.getItem('adminToken');
        const period = periods[analyticsTab];
        const { data } = await axios.get(`/api/admin/dashboard/analytics?tab=${analyticsTab}&period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAnalyticsData(prev => ({ ...prev, [analyticsTab]: data }));
      } catch (err) {
        console.error('Analytics error:', err);
      } finally {
        setTabLoading(false);
      }
    };
    fetchAnalytics();
  }, [analyticsTab, periods[analyticsTab]]);

  const handlePeriodChange = (tab, val) => {
    setPeriods(prev => ({ ...prev, [tab]: val }));
  };

  if (loading || !overview) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-gray-400">
        <i className="fa-solid fa-circle-notch fa-spin text-5xl text-indigo-400" />
        <p className="text-base font-medium">Đang tải dữ liệu thực tế...</p>
      </div>
    </div>
  );

  const { kpi, topBooks, recentOrders, lowStock, promotions, vouchers } = overview;
  const totalRevenue = kpi.monthlyRevenue.reduce((s, v) => s + v, 0);
  const maxMonthVal = Math.max(...kpi.monthlyRevenue);
  const topMonth = maxMonthVal > 0 ? MONTH_LABELS[kpi.monthlyRevenue.indexOf(maxMonthVal)] : '—';

  return (
    <div className="min-h-screen bg-gray-50 p-7 font-sans">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <p className="text-xs tracking-widest uppercase text-indigo-600 font-semibold mb-1">Admin · Bookstore</p>
          <h1 className="text-4xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-400 mt-1.5"><i className="fa-regular fa-clock mr-1.5" />Cập nhật lúc {new Date().toLocaleTimeString('vi-VN')}</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Doanh thu năm" value={fmtShort(totalRevenue)} sub={`Tháng cao nhất: ${topMonth}`} dotCls="bg-indigo-500" icon="fa-solid fa-sack-dollar" highlight />
        <KpiCard label="Tổng đơn hàng" value={kpi.orderCounts.total.toString()} sub={`${kpi.orderCounts.delivered} đã giao`} dotCls="bg-violet-500" icon="fa-solid fa-box" />
        <KpiCard label="Đang xử lý" value={kpi.orderCounts.pending.toString()} sub={`${kpi.orderCounts.shipping} đơn đang giao`} dotCls="bg-amber-500" icon="fa-solid fa-clock" />
        <KpiCard label="Người dùng" value={kpi.totalUsers.toString()} sub={`${kpi.lockedUsers} bị khóa`} dotCls="bg-sky-500" icon="fa-solid fa-users" />
        <KpiCard label="Tổng đầu sách" value={kpi.totalBooks.toString()} sub={`${kpi.outOfStockBooks} hết hàng`} dotCls="bg-emerald-500" icon="fa-solid fa-book" />
        <KpiCard label="Cần hoàn tiền" value={kpi.orderCounts.needRefund.toString()} sub="Đơn huỷ chờ xử lý" dotCls="bg-rose-500" icon="fa-solid fa-rotate-left" />
      </div>

      {/* Revenue + Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <div className="xl:col-span-2"><RevenueChart data={kpi.monthlyRevenue} year={year} /></div>
        <OrderDonut counts={kpi.orderCounts} />
      </div>

      {/* ── Khối 1: Top Books + Recent Orders ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">

        {/* Top 5 sách bán chạy (Nền vàng nhạt Amber) */}
        <div className="bg-amber-50/40 border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-amber-200/60">
            <SectionTitle><span className="flex items-center gap-2"><i className="fa-solid fa-trophy text-amber-600" />Top 5 sách bán chạy</span></SectionTitle>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-amber-100/50 border-b border-amber-200/60">
              <tr>{['#', 'Sách', 'Sold', 'Giá'].map((h, i) => (
                <th key={h} className={`px-5 py-3 text-xs uppercase tracking-widest text-amber-700 font-bold ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-amber-200/40">
              {topBooks.length === 0
                ? <tr><td colSpan="4" className="py-12 text-center text-gray-400 text-sm">Chưa có dữ liệu</td></tr>
                : topBooks.map((book, i) => (
                  <tr key={book._id} className="hover:bg-amber-100/30 transition-colors">
                    <td className="px-5 py-3.5"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-200 text-amber-800' : i === 1 ? 'bg-gray-200 text-gray-700' : 'bg-amber-100 text-amber-600'}`}>{i + 1}</span></td>
                    <td className="px-5 py-3.5"><div className="flex items-center gap-3"><img src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`} alt={book.title} className="w-8 h-11 object-cover border border-amber-100 rounded flex-shrink-0" /><div><p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1">{book.title}</p><p className="text-xs text-gray-500 mt-0.5">{book.author}</p></div></div></td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 text-sm">{book.totalSold ?? book.sold}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-gray-700 text-sm">{(book.discountedPrice || book.price)?.toLocaleString('vi-VN')}₫</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Đơn hàng gần đây (Nền xanh nhạt Sky) */}
        <div className="bg-sky-50/40 border border-sky-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-sky-200/60">
            <SectionTitle><span className="flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-sky-600" />Đơn hàng gần đây</span></SectionTitle>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-sky-100/50 border-b border-sky-200/60">
              <tr>{['Mã đơn', 'Khách hàng', 'Tổng tiền', 'Trạng thái'].map((h, i) => (
                <th key={h} className={`px-5 py-3 text-xs uppercase tracking-widest text-sky-700 font-bold ${i === 2 ? 'text-right' : (i === 3 ? 'text-center' : 'text-left')}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-sky-200/40">
              {recentOrders.length === 0
                ? <tr><td colSpan="4" className="py-12 text-center text-gray-400 text-sm">Chưa có đơn hàng</td></tr>
                : recentOrders.map(order => (
                  <tr key={order._id} className="hover:bg-sky-100/30 transition-colors">
                    <td className="px-5 py-3.5"><span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">#{order._id.slice(-6).toUpperCase()}</span></td>
                    <td className="px-5 py-3.5"><p className="font-semibold text-gray-800 text-sm leading-tight">{order.user?.name || order.shippingAddress?.fullName || 'N/A'}</p><p className="text-xs text-gray-500 mt-0.5">{fmtDate(order.createdAt)}</p></td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900 text-sm">{order.totalPrice?.toLocaleString('vi-VN')}₫</td>
                    <td className="px-5 py-3.5 text-center"><Badge status={order.status} /></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Khối 2: Low Stock + Rank + Promo ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        {/* Sắp hết hàng (Nền đỏ nhạt Rose) */}
        <div className="bg-rose-50/40 border border-rose-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-rose-200/60"><SectionTitle><span className="flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation text-rose-600" />Sắp hết hàng</span></SectionTitle></div>
          {lowStock.length === 0 ? <p className="px-6 py-10 text-center text-gray-400 text-sm">Không có sách nào sắp hết</p> : (
            <div className="divide-y divide-rose-200/40">
              {lowStock.map(book => (
                <div key={book._id} className="flex items-center gap-3 px-5 py-3 hover:bg-rose-100/30 transition-colors">
                  <img src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`} alt={book.title} className="w-9 h-12 object-cover border border-rose-100 rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 line-clamp-1">{book.title}</p><p className="text-xs text-gray-500 mt-0.5">{book.author}</p></div>
                  <span className={`font-mono text-sm font-bold flex-shrink-0 ${book.stock <= 3 ? 'text-rose-600' : 'text-amber-600'}`}>còn {book.stock}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phân hạng người dùng (Nền tím nhạt Purple) */}
        <div className="bg-purple-50/40 border border-purple-200 rounded-2xl p-6 shadow-sm">
          <SectionTitle><span className="flex items-center gap-2"><i className="fa-solid fa-ranking-star text-purple-600" />Phân hạng người dùng</span></SectionTitle>
          <div className="flex flex-col gap-4">
            {Object.entries(kpi.rankDist).map(([rank, count]) => {
              const pct = kpi.totalUsers > 0 ? Math.round((count / kpi.totalUsers) * 100) : 0;
              return (
                <div key={rank}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: RANK_COLORS[rank] }} />{rank}</span>
                    <span className="font-mono text-sm text-gray-500">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-purple-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: RANK_COLORS[rank] }} /></div>
                </div>
              );
            })}
            <p className="text-xs text-purple-500 text-right mt-1 font-semibold"><i className="fa-solid fa-users mr-1.5" />{kpi.totalUsers} tổng người dùng</p>
          </div>
        </div>

        {/* Khuyến mãi đang chạy (Nền xanh lá nhạt Emerald) */}
        <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-emerald-200/60">
            <div className="flex items-center justify-between"><p className="text-base font-bold text-gray-700 flex items-center gap-2"><i className="fa-solid fa-bullhorn text-emerald-600" />Khuyến mãi đang chạy</p><span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">{promotions.length}</span></div>
          </div>
          <div className="divide-y divide-emerald-200/40 flex-1">
            {promotions.length === 0 ? <p className="px-6 py-5 text-center text-gray-400 text-sm">Không có khuyến mãi nào</p>
              : promotions.slice(0, 3).map(p => (
                <div key={p._id} className="px-5 py-3 hover:bg-emerald-100/30 transition-colors">
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-gray-800 line-clamp-1">{p.name}</p><span className="flex-shrink-0 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-mono">-{p.discountValue}{p.discountType === 'percent' ? '%' : '₫'}</span></div>
                  <p className="text-xs text-gray-500 mt-1"><i className="fa-regular fa-calendar mr-1" />Đến {new Date(p.endDate).toLocaleDateString('vi-VN')}</p>
                </div>
              ))}
          </div>
          <div className="px-5 py-4 border-t border-emerald-200/60 bg-emerald-100/30">
            <div className="flex items-center justify-between mb-3"><p className="text-sm font-bold text-emerald-800 flex items-center gap-2"><i className="fa-solid fa-ticket text-emerald-600" />Voucher đang hoạt động</p><span className="font-mono text-sm font-bold text-emerald-700">{vouchers.length}</span></div>
            <div className="flex flex-wrap gap-2">
              {vouchers.length === 0 ? <p className="text-xs text-emerald-600">Không có voucher nào</p>
                : vouchers.slice(0, 5).map(v => (<span key={v._id} className="text-xs font-mono font-bold px-2.5 py-1 bg-white text-emerald-700 border border-emerald-300 rounded-full shadow-sm">{v.code}</span>))}
              {vouchers.length > 5 && <span className="text-xs text-emerald-600 self-center font-medium">+{vouchers.length - 5} khác</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ══ ADVANCED ANALYTICS SECTION ══ */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200">
            <i className="fa-solid fa-magnifying-glass-chart text-white" />
            <span className="text-sm font-bold text-white tracking-wide">Phân tích nâng cao</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">Dữ liệu thông minh giúp quản trị viên đưa ra quyết định kinh doanh hiệu quả hơn</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'author', label: 'Tác giả & Thể loại', icon: 'fa-solid fa-feather-pointed' },
          { key: 'retention', label: 'Khách hàng', icon: 'fa-solid fa-heart-pulse' },
          { key: 'behavior', label: 'Hành vi mua hàng', icon: 'fa-solid fa-chart-simple' },
          { key: 'voucher', label: 'Voucher & Khuyến mãi', icon: 'fa-solid fa-ticket' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setAnalyticsTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${analyticsTab === tab.key ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-indigo-600'}`}>
            <i className={tab.icon} />{tab.label}
          </button>
        ))}
      </div>

      {/* Spinner for Tabs */}
      {tabLoading && (
        <div className="flex justify-center items-center py-10">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500"></i>
        </div>
      )}

      {/* ── Tab: Tác giả & Thể loại ── */}
      {!tabLoading && analyticsTab === 'author' && analyticsData.author && analyticsData.genre && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnalyticsCard title="Top tác giả bán chạy" icon="fa-solid fa-pen-nib" iconColor="text-indigo-500" action={<PeriodPicker value={periods.author} onChange={(v) => handlePeriodChange('author', v)} />}>
            {analyticsData.author.length === 0
              ? <p className="text-center text-gray-400 text-sm py-8">Không có dữ liệu trong kỳ này</p>
              : <>
                <HBarChart labels={analyticsData.author.map(a => a.name.length > 18 ? a.name.slice(0, 18) + '…' : a.name)} values={analyticsData.author.map(a => a.units)} color="#4f46e5" height={Math.max(analyticsData.author.length * 42 + 20, 120)} />
                <div className="mt-4 divide-y divide-gray-50">
                  {analyticsData.author.slice(0, 5).map((a, i) => (
                    <div key={a.name} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-indigo-600'}`}>{i + 1}</span>
                        <span className="text-sm font-semibold text-gray-800">{a.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400"><span className="font-mono font-bold text-gray-700">{a.units}</span> cuốn</span>
                        <span className="text-xs text-emerald-600 font-mono font-bold">{fmtShort(a.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            }
          </AnalyticsCard>

          <AnalyticsCard title="Thể loại được mua nhiều nhất" icon="fa-solid fa-tags" iconColor="text-violet-500" action={<PeriodPicker value={periods.genre} onChange={(v) => handlePeriodChange('genre', v)} />}>
            {analyticsData.genre.length === 0
              ? <p className="text-center text-gray-400 text-sm py-8">Không có dữ liệu</p>
              : <>
                <DonutChart labels={analyticsData.genre.map(g => g.name)} values={analyticsData.genre.map(g => g.units)} colors={CHART_COLORS.slice(0, analyticsData.genre.length)} size={150} />
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {analyticsData.genre.slice(0, 4).map((g, i) => (
                    <div key={g.name} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex items-center gap-1.5 mb-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART_COLORS[i] }} /><span className="text-xs font-semibold text-gray-700 truncate">{g.name}</span></div>
                      <p className="font-mono text-xl font-bold text-gray-900">{g.units}</p>
                      <p className="text-xs text-gray-400">cuốn · {fmtShort(g.revenue)}</p>
                    </div>
                  ))}
                </div>
              </>
            }
          </AnalyticsCard>
        </div>
      )}

      {/* ── Tab: Khách hàng ── */}
      {!tabLoading && analyticsTab === 'retention' && analyticsData.retention && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnalyticsCard title="Tỷ lệ khách hàng quay lại" icon="fa-solid fa-heart-pulse" iconColor="text-rose-500" action={<PeriodPicker value={periods.retention} onChange={(v) => handlePeriodChange('retention', v)} />}>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Tổng KH đặt hàng', value: analyticsData.retention.total, icon: 'fa-solid fa-users', color: 'bg-sky-50 text-sky-700 border-sky-200' },
                { label: 'Mua lại ≥2 lần', value: analyticsData.retention.repeat, icon: 'fa-solid fa-repeat', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { label: 'Trung thành ≥4 lần', value: analyticsData.retention.loyal, icon: 'fa-solid fa-crown', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              ].map(m => (
                <div key={m.label} className={`rounded-xl p-3 border text-center ${m.color}`}>
                  <i className={`${m.icon} text-xl mb-1.5`} />
                  <p className="font-mono text-2xl font-bold leading-none">{m.value}</p>
                  <p className="text-xs font-semibold mt-1 leading-tight">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="mb-5">
              <div className="flex justify-between mb-2"><span className="text-sm font-semibold text-gray-700">Tỷ lệ mua lại</span><span className="font-mono text-sm font-bold text-emerald-600">{analyticsData.retention.total > 0 ? Math.round(analyticsData.retention.repeat / analyticsData.retention.total * 100) : 0}%</span></div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${analyticsData.retention.total > 0 ? Math.round(analyticsData.retention.repeat / analyticsData.retention.total * 100) : 0}%` }} /></div>
            </div>
            <DonutChart labels={['Mua 1 lần', 'Mua 2–3 lần', 'Trung thành ≥4 lần']} values={analyticsData.retention.dist} colors={['#94a3b8', '#0ea5e9', '#f59e0b']} size={130} />
            <div className="mt-4 flex items-center justify-between px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <span className="text-sm text-indigo-700 font-semibold"><i className="fa-solid fa-chart-line mr-1.5" />Trung bình đơn / khách</span>
              <span className="font-mono text-2xl font-bold text-indigo-600">{analyticsData.retention.avgOrders}</span>
            </div>
          </AnalyticsCard>
        </div>
      )}

      {/* ── Tab: Hành vi mua hàng ── */}
      {!tabLoading && analyticsTab === 'behavior' && analyticsData.behavior && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnalyticsCard title="Ngày trong tuần đặt hàng nhiều nhất" icon="fa-solid fa-calendar-days" iconColor="text-sky-500" action={<PeriodPicker value={periods.behavior} onChange={(v) => handlePeriodChange('behavior', v)} />}>
            <p className="text-xs text-gray-400 mb-5">Phân bổ số đơn theo ngày trong tuần</p>
            <div className="flex items-end gap-2 h-44 mb-4">
              {(() => {
                const max = Math.max(...analyticsData.behavior.dowStats, 1);
                return WEEKDAY_LABELS.map((day, i) => {
                  const pct = Math.round(analyticsData.behavior.dowStats[i] / max * 100);
                  const isMax = analyticsData.behavior.dowStats[i] === max && max > 0;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-gray-600">{analyticsData.behavior.dowStats[i]}</span>
                      <div className="w-full rounded-t-lg transition-all duration-700 relative" style={{ height: `${Math.max(pct, 4)}%`, background: isMax ? '#4f46e5' : (i === 0 || i === 6) ? '#e0e7ff' : '#c7d2fe' }}>
                        {isMax && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm">🔥</span>}
                      </div>
                      <span className={`text-sm font-bold ${isMax ? 'text-indigo-600' : 'text-gray-400'}`}>{day}</span>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl">
              <p className="text-xs text-sky-800 font-semibold flex items-center gap-1.5"><i className="fa-solid fa-lightbulb" />Gợi ý: Chạy flash sale vào {WEEKDAY_LABELS[analyticsData.behavior.dowStats.indexOf(Math.max(...analyticsData.behavior.dowStats))]} để tối đa đơn hàng</p>
            </div>
          </AnalyticsCard>

          <AnalyticsCard title="Phương thức thanh toán ưa chuộng" icon="fa-solid fa-credit-card" iconColor="text-emerald-500">
            <DonutChart labels={analyticsData.behavior.paymentStats.map(p => p.name)} values={analyticsData.behavior.paymentStats.map(p => p.value)} colors={analyticsData.behavior.paymentStats.map(p => p.color)} size={150} />
            <div className="mt-5 grid grid-cols-3 gap-2">
              {analyticsData.behavior.paymentStats.map(p => (
                <div key={p.name} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: p.color }} />
                  <p className="font-mono text-xl font-bold text-gray-900">{p.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{p.name}</p>
                </div>
              ))}
            </div>
          </AnalyticsCard>
        </div>
      )}

      {/* ── Tab: Voucher & Khuyến mãi ── */}
      {!tabLoading && analyticsTab === 'voucher' && analyticsData.voucher && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnalyticsCard title="Mức độ sử dụng Voucher" icon="fa-solid fa-ticket" iconColor="text-violet-500" action={<PeriodPicker value={periods.voucher} onChange={(v) => handlePeriodChange('voucher', v)} />}>
            <p className="text-xs text-gray-400 mb-5">Tỷ lệ đã dùng / giới hạn của từng mã đang hoạt động</p>
            {analyticsData.voucher.length === 0
              ? <p className="text-center text-gray-400 text-sm py-6">Không có voucher nào</p>
              : <div className="flex flex-col gap-4">
                {analyticsData.voucher.map(v => (
                  <div key={v.code}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-sm font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">{v.code}</span>
                      <span className="text-sm text-gray-500 font-mono"><span className="font-bold text-gray-800">{v.used}</span> / {v.limit} lượt · <span className={`font-bold ${v.pct >= 80 ? 'text-rose-600' : v.pct >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{v.pct}%</span></span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${v.pct}%`, background: v.pct >= 80 ? '#f43f5e' : v.pct >= 50 ? '#f59e0b' : '#10b981' }} /></div>
                  </div>
                ))}
              </div>
            }
          </AnalyticsCard>

          <AnalyticsCard title="Tổng quan khuyến mãi" icon="fa-solid fa-percent" iconColor="text-orange-500">
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50"><p className="text-xs font-bold uppercase tracking-widest text-gray-400">Khuyến mãi đang hoạt động</p></div>
              {promotions.length === 0
                ? <p className="px-4 py-4 text-center text-gray-400 text-sm">Không có khuyến mãi nào</p>
                : promotions.map(p => (
                  <div key={p._id} className="px-4 py-3 flex items-center justify-between">
                    <div><p className="text-sm font-semibold text-gray-800">{p.name}</p><p className="text-xs text-gray-400 mt-0.5">{p.targetType === 'all' ? 'Toàn shop' : p.targetType === 'genre' ? `Thể loại: ${p.targetValue}` : 'Sách cụ thể'} · Đến {new Date(p.endDate).toLocaleDateString('vi-VN')}</p></div>
                    <span className="font-mono text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">-{p.discountValue}{p.discountType === 'percent' ? '%' : '₫'}</span>
                  </div>
                ))
              }
            </div>
          </AnalyticsCard>
        </div>
      )}

    </div>
  );
};

export default AdminDashBoard;