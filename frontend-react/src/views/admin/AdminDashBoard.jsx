import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

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
  pending: { label: 'Đang xử lý', cls: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  shipping: { label: 'Đang giao', cls: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-500' },
  delivered: { label: 'Đã giao', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-50 text-red-600 border border-red-200', dot: 'bg-red-500' },
};
const PERIOD_OPTIONS = [
  { key: 'week', label: 'Tuần này' }, { key: 'month', label: 'Tháng này' },
  { key: 'year', label: 'Năm này' }, { key: 'all', label: 'Tất cả' },
];

const filterByPeriod = (orders, period) => {
  if (period === 'all') return orders;
  const now = new Date(); const from = new Date();
  if (period === 'week') { from.setDate(now.getDate() - 7); }
  if (period === 'month') { from.setMonth(now.getMonth(), 1); from.setHours(0, 0, 0, 0); }
  if (period === 'year') { from.setMonth(0, 1); from.setHours(0, 0, 0, 0); }
  return orders.filter(o => new Date(o.createdAt) >= from);
};

/* ── Atoms ── */
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

/* ── Chart Components ── */
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

/* ── Existing Overview Charts ── */
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
   MAIN
════════════════════════════════════════════════════════════════ */
const AdminDashBoard = () => {
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(Array(12).fill(0));
  const [promotions, setPromotions] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  const [authorPeriod, setAuthorPeriod] = useState('month');
  const [genrePeriod, setGenrePeriod] = useState('month');
  const [retentionPeriod, setRetentionPeriod] = useState('month');
  const [trendPeriod, setTrendPeriod] = useState('month');
  const [payPeriod, setPayPeriod] = useState('month');
  const [analyticsTab, setAnalyticsTab] = useState('author');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const h = { Authorization: `Bearer ${token}` };
        const results = await Promise.allSettled([
          axios.get('/api/admin/users', { headers: h }),
          axios.get('/api/books'),
          axios.get('/api/admin/orders', { headers: h }),
          axios.get('/api/books/top-selling'),
          axios.get('/api/books/low-stock'),
          axios.get(`/api/admin/revenue/monthly?year=${year}`, { headers: h }),
          axios.get('/api/admin/promotions', { headers: h }),
          axios.get('/api/admin/vouchers', { headers: h }),
        ]);
        if (results[0].status === 'fulfilled') setUsers(results[0].value.data);
        if (results[1].status === 'fulfilled') setBooks(results[1].value.data);
        if (results[2].status === 'fulfilled') setOrders(results[2].value.data);
        if (results[3].status === 'fulfilled') setTopBooks(results[3].value.data.slice(0, 5));
        if (results[4].status === 'fulfilled') setLowStock(results[4].value.data.slice(0, 6));
        if (results[5].status === 'fulfilled') setMonthlyRevenue(results[5].value.data.monthlyRevenue || Array(12).fill(0));
        if (results[6].status === 'fulfilled') setPromotions(results[6].value.data.filter(p => p.isActive));
        if (results[7].status === 'fulfilled') setVouchers(results[7].value.data.filter(v => v.isActive));
      } catch (err) { console.error('Dashboard error:', err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const bookMap = useMemo(() => {
    const m = {}; books.forEach(b => { m[b._id] = b; }); return m;
  }, [books]);

  const totalRevenue = monthlyRevenue.reduce((s, v) => s + v, 0);

  const orderCounts = useMemo(() => ({
    pending: orders.filter(o => o.status === 'pending').length,
    shipping: orders.filter(o => o.status === 'shipping').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    needRefund: orders.filter(o => o.status === 'cancelled' && o.paymentStatus === 'Hoàn tiền').length,
  }), [orders]);

  const rankDist = useMemo(() => {
    const map = { 'Khách hàng': 0, 'Bạc': 0, 'Vàng': 0, 'Bạch kim': 0, 'Kim cương': 0 };
    users.forEach(u => { if (map[u.rank] !== undefined) map[u.rank]++; }); return map;
  }, [users]);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    [orders]
  );

  const topMonth = useMemo(() => {
    const max = Math.max(...monthlyRevenue);
    return max > 0 ? MONTH_LABELS[monthlyRevenue.indexOf(max)] : '—';
  }, [monthlyRevenue]);

  /* ── Advanced Analytics ── */

  /* 1. Author stats */
  const authorStats = useMemo(() => {
    const filtered = filterByPeriod(orders, authorPeriod);
    const map = {};
    filtered.forEach(o => {
      if (!['delivered', 'shipping', 'pending'].includes(o.status)) return;
      o.items?.forEach(item => {
        const book = bookMap[item.book?._id || item.book] || item.book;
        const author = book?.author || 'Không rõ';
        const price = book?.price || 0;
        if (!map[author]) map[author] = { revenue: 0, units: 0 };
        map[author].revenue += price * (item.quantity || 1);
        map[author].units += item.quantity || 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].units - a[1].units).slice(0, 8).map(([name, d]) => ({ name, ...d }));
  }, [orders, bookMap, authorPeriod]);

  /* 2. Genre stats */
  const genreStats = useMemo(() => {
    const filtered = filterByPeriod(orders, genrePeriod);
    const map = {};
    filtered.forEach(o => {
      if (!['delivered', 'shipping', 'pending'].includes(o.status)) return;
      o.items?.forEach(item => {
        const book = bookMap[item.book?._id || item.book] || item.book;
        const genre = book?.genre || 'Khác';
        if (!map[genre]) map[genre] = { units: 0, orders: 0, revenue: 0 };
        map[genre].units += item.quantity || 1;
        map[genre].orders += 1;
        map[genre].revenue += (book?.price || 0) * (item.quantity || 1);
      });
    });
    return Object.entries(map).sort((a, b) => b[1].units - a[1].units).slice(0, 8).map(([name, d]) => ({ name, ...d }));
  }, [orders, bookMap, genrePeriod]);

  /* 3. Retention */
  const retentionStats = useMemo(() => {
    const filtered = filterByPeriod(orders, retentionPeriod);
    const uc = {};
    filtered.forEach(o => { const uid = o.user?._id || o.user; if (!uid) return; uc[uid] = (uc[uid] || 0) + 1; });
    const total = Object.keys(uc).length;
    const oneTime = Object.values(uc).filter(c => c === 1).length;
    const repeat = Object.values(uc).filter(c => c >= 2).length;
    const loyal = Object.values(uc).filter(c => c >= 4).length;
    const avgOrders = total > 0 ? (Object.values(uc).reduce((s, v) => s + v, 0) / total).toFixed(1) : 0;
    return { total, oneTime, repeat, loyal, avgOrders, dist: [oneTime, repeat - loyal, loyal] };
  }, [orders, retentionPeriod]);

  /* 4. Revenue trend (current vs previous) */
  const trendData = useMemo(() => {
    const now = new Date();
    const getOrders = (p, current) => {
      if (p === 'week') {
        const offset = current ? 7 : 14;
        const limit = current ? 0 : 7;
        return orders.filter(o => {
          const d = new Date(o.createdAt);
          const diff = Math.floor((now - d) / 86400000);
          return diff >= (current ? 0 : 7) && diff < (current ? 7 : 14);
        });
      }
      if (p === 'month') {
        const m = current ? now.getMonth() : (now.getMonth() === 0 ? 11 : now.getMonth() - 1);
        const yr = current ? now.getFullYear() : (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
        return orders.filter(o => { const d = new Date(o.createdAt); return d.getMonth() === m && d.getFullYear() === yr; });
      }
      const yr = current ? now.getFullYear() : now.getFullYear() - 1;
      return orders.filter(o => new Date(o.createdAt).getFullYear() === yr);
    };
    if (trendPeriod === 'week') {
      const labels = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(now.getDate() - 6 + i); return `${d.getDate()}/${d.getMonth() + 1}`; });
      const curr = Array(7).fill(0); const prev = Array(7).fill(0);
      getOrders('week', true).forEach(o => { if (o.status !== 'cancelled') { const d = Math.floor((now - new Date(o.createdAt)) / 86400000); if (d >= 0 && d < 7) curr[6 - d] += o.totalPrice || 0; } });
      getOrders('week', false).forEach(o => { if (o.status !== 'cancelled') { const d = Math.floor((now - new Date(o.createdAt)) / 86400000) - 7; if (d >= 0 && d < 7) prev[6 - d] += o.totalPrice || 0; } });
      return { labels, current: curr, previous: prev };
    }
    if (trendPeriod === 'month') {
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const labels = Array.from({ length: days }, (_, i) => `${i + 1}`);
      const curr = Array(days).fill(0); const prev = Array(days).fill(0);
      getOrders('month', true).forEach(o => { if (o.status !== 'cancelled') curr[new Date(o.createdAt).getDate() - 1] += o.totalPrice || 0; });
      getOrders('month', false).forEach(o => { if (o.status !== 'cancelled') prev[new Date(o.createdAt).getDate() - 1] += o.totalPrice || 0; });
      return { labels, current: curr, previous: prev };
    }
    const curr = Array(12).fill(0); const prev = Array(12).fill(0);
    getOrders('year', true).forEach(o => { if (o.status !== 'cancelled') curr[new Date(o.createdAt).getMonth()] += o.totalPrice || 0; });
    getOrders('year', false).forEach(o => { if (o.status !== 'cancelled') prev[new Date(o.createdAt).getMonth()] += o.totalPrice || 0; });
    return { labels: MONTH_LABELS, current: curr, previous: prev };
  }, [orders, trendPeriod]);

  /* 5. Payment method */
  const paymentStats = useMemo(() => {
    const filtered = filterByPeriod(orders, payPeriod);
    const map = { cod: 0, vnpay: 0, transfer: 0 };
    filtered.forEach(o => { if (map[o.paymentMethod] !== undefined) map[o.paymentMethod]++; });
    return [
      { name: 'Tiền mặt (COD)', value: map.cod, color: '#10b981' },
      { name: 'VNPAY', value: map.vnpay, color: '#4f46e5' },
      { name: 'Chuyển khoản', value: map.transfer, color: '#f59e0b' },
    ];
  }, [orders, payPeriod]);

  /* 6. Day of week */
  const dowStats = useMemo(() => {
    const counts = Array(7).fill(0);
    orders.forEach(o => { if (o.status !== 'cancelled') counts[new Date(o.createdAt).getDay()]++; });
    return counts;
  }, [orders]);

  /* 7. Avg order value by rank */
  const rankAvgOrder = useMemo(() => {
    const urm = {}; users.forEach(u => { urm[u._id] = u.rank || 'Khách hàng'; });
    const rd = {};
    orders.forEach(o => {
      if (o.status === 'cancelled') return;
      const rank = urm[o.user?._id || o.user] || 'Khách hàng';
      if (!rd[rank]) rd[rank] = { total: 0, count: 0 };
      rd[rank].total += o.totalPrice || 0; rd[rank].count += 1;
    });
    return Object.entries(rd).map(([rank, d]) => ({ rank, avg: d.count > 0 ? Math.round(d.total / d.count) : 0, count: d.count, color: RANK_COLORS[rank] || '#94a3b8' })).sort((a, b) => b.avg - a.avg);
  }, [orders, users]);

  /* 8. Voucher usage */
  const voucherUsageStats = useMemo(() =>
    vouchers.filter(v => v.usageLimit > 0).map(v => ({
      code: v.code, used: v.usedCount || 0, limit: v.usageLimit,
      pct: Math.round(((v.usedCount || 0) / v.usageLimit) * 100),
    })).sort((a, b) => b.pct - a.pct).slice(0, 6)
    , [vouchers]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-gray-400">
        <i className="fa-solid fa-circle-notch fa-spin text-5xl text-indigo-400" />
        <p className="text-base font-medium">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-7 font-sans">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <p className="text-xs tracking-widest uppercase text-indigo-600 font-semibold mb-1">Admin · Bookstore</p>
          <h1 className="text-4xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-400 mt-1.5">
            <i className="fa-regular fa-clock mr-1.5" />
            Cập nhật lúc {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Doanh thu năm" value={fmtShort(totalRevenue)} sub={`Tháng cao nhất: ${topMonth}`} dotCls="bg-indigo-500" icon="fa-solid fa-sack-dollar" highlight />
        <KpiCard label="Tổng đơn hàng" value={orders.length.toString()} sub={`${orderCounts.delivered} đã giao thành công`} dotCls="bg-violet-500" icon="fa-solid fa-box" />
        <KpiCard label="Đang xử lý" value={orderCounts.pending.toString()} sub={`${orderCounts.shipping} đơn đang giao`} dotCls="bg-amber-500" icon="fa-solid fa-clock" />
        <KpiCard label="Người dùng" value={users.length.toString()} sub={`${users.filter(u => u.isLocked).length} bị khóa`} dotCls="bg-sky-500" icon="fa-solid fa-users" />
        <KpiCard label="Tổng đầu sách" value={books.length.toString()} sub={`${books.filter(b => b.stock === 0).length} hết hàng`} dotCls="bg-emerald-500" icon="fa-solid fa-book" />
        <KpiCard label="Cần hoàn tiền" value={orderCounts.needRefund.toString()} sub="Đơn huỷ chờ xử lý" dotCls="bg-rose-500" icon="fa-solid fa-rotate-left" />
      </div>

      {/* Revenue + Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <div className="xl:col-span-2"><RevenueChart data={monthlyRevenue} year={year} /></div>
        <OrderDonut counts={orderCounts} />
      </div>

      {/* Top Books + Recent Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <SectionTitle><span className="flex items-center gap-2"><i className="fa-solid fa-trophy text-amber-500" />Top 5 sách bán chạy</span></SectionTitle>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['#', 'Sách', 'Thể loại', 'Đã bán', 'Giá'].map((h, i) => (
                <th key={h} className={`px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-bold ${i >= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topBooks.length === 0
                ? <tr><td colSpan="5" className="py-12 text-center text-gray-400 text-sm">Chưa có dữ liệu</td></tr>
                : topBooks.map((book, i) => (
                  <tr key={book._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>{i + 1}</span></td>
                    <td className="px-5 py-3.5"><div className="flex items-center gap-3"><img src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`} alt={book.title} className="w-8 h-11 object-cover border border-gray-100 rounded flex-shrink-0" /><div><p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-1">{book.title}</p><p className="text-xs text-gray-400 mt-0.5">{book.author}</p></div></div></td>
                    <td className="px-5 py-3.5"><span className="px-2.5 py-0.5 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">{book.genre}</span></td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 text-sm">{book.totalSold ?? book.sold}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-gray-700 text-sm">{(book.discountedPrice || book.price)?.toLocaleString('vi-VN')}₫</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <SectionTitle><span className="flex items-center gap-2"><i className="fa-solid fa-clock-rotate-left text-sky-500" />Đơn hàng gần đây</span></SectionTitle>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Mã đơn', 'Khách hàng', 'Tổng tiền', 'Thanh toán', 'Trạng thái'].map((h, i) => (
                <th key={h} className={`px-5 py-3 text-xs uppercase tracking-widest text-gray-400 font-bold ${i === 2 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.length === 0
                ? <tr><td colSpan="5" className="py-12 text-center text-gray-400 text-sm">Chưa có đơn hàng</td></tr>
                : recentOrders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5"><span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">#{order._id.slice(-6).toUpperCase()}</span></td>
                    <td className="px-5 py-3.5"><p className="font-semibold text-gray-800 text-sm leading-tight">{order.user?.name || order.shippingAddress?.fullName || 'N/A'}</p><p className="text-xs text-gray-400 mt-0.5">{fmtDate(order.createdAt)}</p></td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900 text-sm">{order.totalPrice?.toLocaleString('vi-VN')}₫</td>
                    <td className="px-5 py-3.5"><span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${order.paymentStatus === 'Đã thanh toán' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : order.paymentStatus === 'Hoàn tiền' ? 'bg-rose-50 text-rose-600 border-rose-200' : order.paymentStatus === 'Đã hoàn tiền' ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{order.paymentStatus || 'Chờ TT'}</span></td>
                    <td className="px-5 py-3.5"><Badge status={order.status} /></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock + Rank + Promo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100"><SectionTitle><span className="flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation text-rose-500" />Sắp hết hàng</span></SectionTitle></div>
          {lowStock.length === 0 ? <p className="px-6 py-10 text-center text-gray-400 text-sm">Không có sách nào sắp hết</p> : (
            <div className="divide-y divide-gray-50">
              {lowStock.map(book => (
                <div key={book._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <img src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`} alt={book.title} className="w-9 h-12 object-cover border border-gray-100 rounded flex-shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 line-clamp-1">{book.title}</p><p className="text-xs text-gray-400 mt-0.5">{book.author}</p></div>
                  <span className={`font-mono text-sm font-bold flex-shrink-0 ${book.stock <= 3 ? 'text-rose-600' : 'text-amber-600'}`}>{book.stock} còn</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <SectionTitle><span className="flex items-center gap-2"><i className="fa-solid fa-ranking-star text-sky-500" />Phân hạng người dùng</span></SectionTitle>
          <div className="flex flex-col gap-4">
            {Object.entries(rankDist).map(([rank, count]) => {
              const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
              return (
                <div key={rank}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-600 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: RANK_COLORS[rank] }} />{rank}</span>
                    <span className="font-mono text-sm text-gray-500">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: RANK_COLORS[rank] }} /></div>
                </div>
              );
            })}
            <p className="text-xs text-gray-400 text-right mt-1"><i className="fa-solid fa-users mr-1.5" />{users.length} tổng người dùng</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between"><p className="text-base font-bold text-gray-700 flex items-center gap-2"><i className="fa-solid fa-bullhorn text-orange-500" />Khuyến mãi đang chạy</p><span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">{promotions.length}</span></div>
          </div>
          <div className="divide-y divide-gray-50 flex-1">
            {promotions.length === 0 ? <p className="px-6 py-5 text-center text-gray-400 text-sm">Không có khuyến mãi nào</p>
              : promotions.slice(0, 3).map(p => (
                <div key={p._id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-gray-800 line-clamp-1">{p.name}</p><span className="flex-shrink-0 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono">-{p.discountValue}{p.discountType === 'percent' ? '%' : '₫'}</span></div>
                  <p className="text-xs text-gray-400 mt-1"><i className="fa-regular fa-calendar mr-1" />Đến {new Date(p.endDate).toLocaleDateString('vi-VN')}</p>
                </div>
              ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/60">
            <div className="flex items-center justify-between mb-3"><p className="text-sm font-bold text-gray-600 flex items-center gap-2"><i className="fa-solid fa-ticket text-violet-500" />Voucher đang hoạt động</p><span className="font-mono text-sm font-bold text-violet-600">{vouchers.length}</span></div>
            <div className="flex flex-wrap gap-2">
              {vouchers.length === 0 ? <p className="text-xs text-gray-400">Không có voucher nào</p>
                : vouchers.slice(0, 5).map(v => (<span key={v._id} className="text-xs font-mono font-bold px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full">{v.code}</span>))}
              {vouchers.length > 5 && <span className="text-xs text-gray-400 self-center">+{vouchers.length - 5} khác</span>}
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
          { key: 'trend', label: 'Xu hướng doanh thu', icon: 'fa-solid fa-arrow-trend-up' },
          { key: 'behavior', label: 'Hành vi mua hàng', icon: 'fa-solid fa-chart-simple' },
          { key: 'voucher', label: 'Voucher & Khuyến mãi', icon: 'fa-solid fa-ticket' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setAnalyticsTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${analyticsTab === tab.key ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200 hover:text-indigo-600'}`}>
            <i className={tab.icon} />{tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Tác giả & Thể loại ── */}
      {analyticsTab === 'author' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnalyticsCard title="Top tác giả bán chạy" icon="fa-solid fa-pen-nib" iconColor="text-indigo-500" action={<PeriodPicker value={authorPeriod} onChange={setAuthorPeriod} />}>
            {authorStats.length === 0
              ? <p className="text-center text-gray-400 text-sm py-8">Không có dữ liệu trong kỳ này</p>
              : <>
                <HBarChart labels={authorStats.map(a => a.name.length > 18 ? a.name.slice(0, 18) + '…' : a.name)} values={authorStats.map(a => a.units)} color="#4f46e5" height={Math.max(authorStats.length * 42 + 20, 120)} />
                <div className="mt-4 divide-y divide-gray-50">
                  {authorStats.slice(0, 5).map((a, i) => (
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

          <AnalyticsCard title="Thể loại được mua nhiều nhất" icon="fa-solid fa-tags" iconColor="text-violet-500" action={<PeriodPicker value={genrePeriod} onChange={setGenrePeriod} />}>
            {genreStats.length === 0
              ? <p className="text-center text-gray-400 text-sm py-8">Không có dữ liệu</p>
              : <>
                <DonutChart labels={genreStats.map(g => g.name)} values={genreStats.map(g => g.units)} colors={CHART_COLORS.slice(0, genreStats.length)} size={150} />
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {genreStats.slice(0, 4).map((g, i) => (
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
      {analyticsTab === 'retention' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnalyticsCard title="Tỷ lệ khách hàng quay lại" icon="fa-solid fa-heart-pulse" iconColor="text-rose-500" action={<PeriodPicker value={retentionPeriod} onChange={setRetentionPeriod} />}>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Tổng KH đặt hàng', value: retentionStats.total, icon: 'fa-solid fa-users', color: 'bg-sky-50 text-sky-700 border-sky-200' },
                { label: 'Mua lại ≥2 lần', value: retentionStats.repeat, icon: 'fa-solid fa-repeat', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { label: 'Trung thành ≥4 lần', value: retentionStats.loyal, icon: 'fa-solid fa-crown', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              ].map(m => (
                <div key={m.label} className={`rounded-xl p-3 border text-center ${m.color}`}>
                  <i className={`${m.icon} text-xl mb-1.5`} />
                  <p className="font-mono text-2xl font-bold leading-none">{m.value}</p>
                  <p className="text-xs font-semibold mt-1 leading-tight">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="mb-5">
              <div className="flex justify-between mb-2"><span className="text-sm font-semibold text-gray-700">Tỷ lệ mua lại</span><span className="font-mono text-sm font-bold text-emerald-600">{retentionStats.total > 0 ? Math.round(retentionStats.repeat / retentionStats.total * 100) : 0}%</span></div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${retentionStats.total > 0 ? Math.round(retentionStats.repeat / retentionStats.total * 100) : 0}%` }} /></div>
            </div>
            <DonutChart labels={['Mua 1 lần', 'Mua 2–3 lần', 'Trung thành ≥4 lần']} values={retentionStats.dist} colors={['#94a3b8', '#0ea5e9', '#f59e0b']} size={130} />
            <div className="mt-4 flex items-center justify-between px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <span className="text-sm text-indigo-700 font-semibold"><i className="fa-solid fa-chart-line mr-1.5" />Trung bình đơn / khách</span>
              <span className="font-mono text-2xl font-bold text-indigo-600">{retentionStats.avgOrders}</span>
            </div>
          </AnalyticsCard>

          <AnalyticsCard title="Chi tiêu trung bình theo hạng" icon="fa-solid fa-ranking-star" iconColor="text-amber-500">
            <p className="text-xs text-gray-400 mb-5">Giá trị đơn hàng trung bình của từng hạng khách hàng</p>
            {rankAvgOrder.length === 0
              ? <p className="text-center text-gray-400 text-sm py-6">Chưa có dữ liệu</p>
              : <div className="flex flex-col gap-4">
                {rankAvgOrder.map(r => {
                  const maxAvg = Math.max(...rankAvgOrder.map(x => x.avg));
                  const pct = maxAvg > 0 ? Math.round(r.avg / maxAvg * 100) : 0;
                  return (
                    <div key={r.rank}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: r.color }} />{r.rank}<span className="text-xs text-gray-400 font-normal">({r.count} đơn)</span></span>
                        <span className="font-mono text-sm font-bold" style={{ color: r.color }}>{fmtShort(r.avg)}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: r.color }} /></div>
                    </div>
                  );
                })}
              </div>
            }
            <div className="mt-5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5"><i className="fa-solid fa-lightbulb" />Gợi ý: Tập trung ưu đãi cho hạng có chi tiêu cao để tối đa hoá doanh thu</p>
            </div>
          </AnalyticsCard>
        </div>
      )}

      {/* ── Tab: Xu hướng doanh thu ── */}
      {analyticsTab === 'trend' && (
        <div className="grid grid-cols-1 gap-4">
          <AnalyticsCard title="So sánh doanh thu kỳ này vs kỳ trước" icon="fa-solid fa-arrow-trend-up" iconColor="text-emerald-500" action={<PeriodPicker value={trendPeriod} onChange={setTrendPeriod} />}>
            {(() => {
              const currTotal = trendData.current.reduce((s, v) => s + v, 0);
              const prevTotal = trendData.previous.reduce((s, v) => s + v, 0);
              const change = prevTotal > 0 ? Math.round((currTotal - prevTotal) / prevTotal * 100) : null;
              return (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center"><p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mb-1">Kỳ này</p><p className="font-mono text-2xl font-bold text-indigo-700">{fmtShort(currTotal)}</p></div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center"><p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Kỳ trước</p><p className="font-mono text-2xl font-bold text-gray-600">{fmtShort(prevTotal)}</p></div>
                    <div className={`rounded-xl p-4 text-center border ${change === null ? 'bg-gray-50 border-gray-200' : change >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1 text-gray-500">Thay đổi</p>
                      <p className={`font-mono text-2xl font-bold ${change === null ? 'text-gray-400' : change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{change === null ? '—' : `${change >= 0 ? '+' : ''}${change}%`}</p>
                    </div>
                  </div>
                  <LineChart labels={trendData.labels} datasets={[
                    { label: 'Kỳ này', data: trendData.current, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,.08)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2 },
                    { label: 'Kỳ trước', data: trendData.previous, borderColor: '#d1d5db', backgroundColor: 'rgba(209,213,219,.04)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, borderDash: [5, 5] },
                  ]} height={280} />
                </>
              );
            })()}
          </AnalyticsCard>
        </div>
      )}

      {/* ── Tab: Hành vi mua hàng ── */}
      {analyticsTab === 'behavior' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnalyticsCard title="Ngày trong tuần đặt hàng nhiều nhất" icon="fa-solid fa-calendar-days" iconColor="text-sky-500">
            <p className="text-xs text-gray-400 mb-5">Phân bổ số đơn theo ngày trong tuần (tất cả thời gian)</p>
            <div className="flex items-end gap-2 h-44 mb-4">
              {(() => {
                const max = Math.max(...dowStats, 1);
                return WEEKDAY_LABELS.map((day, i) => {
                  const pct = Math.round(dowStats[i] / max * 100);
                  const isMax = dowStats[i] === max && max > 0;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-gray-600">{dowStats[i]}</span>
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
              <p className="text-xs text-sky-800 font-semibold flex items-center gap-1.5"><i className="fa-solid fa-lightbulb" />Gợi ý: Chạy flash sale vào {WEEKDAY_LABELS[dowStats.indexOf(Math.max(...dowStats))]} để tối đa đơn hàng</p>
            </div>
          </AnalyticsCard>

          <AnalyticsCard title="Phương thức thanh toán ưa chuộng" icon="fa-solid fa-credit-card" iconColor="text-emerald-500" action={<PeriodPicker value={payPeriod} onChange={setPayPeriod} />}>
            <DonutChart labels={paymentStats.map(p => p.name)} values={paymentStats.map(p => p.value)} colors={paymentStats.map(p => p.color)} size={150} />
            <div className="mt-5 grid grid-cols-3 gap-2">
              {paymentStats.map(p => (
                <div key={p.name} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: p.color }} />
                  <p className="font-mono text-xl font-bold text-gray-900">{p.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">{p.name}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5"><i className="fa-solid fa-lightbulb" />{[...paymentStats].sort((a, b) => b.value - a.value)[0]?.name || 'COD'} là phương thức thanh toán phổ biến nhất</p>
            </div>
          </AnalyticsCard>
        </div>
      )}

      {/* ── Tab: Voucher & Khuyến mãi ── */}
      {analyticsTab === 'voucher' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnalyticsCard title="Mức độ sử dụng Voucher" icon="fa-solid fa-ticket" iconColor="text-violet-500">
            <p className="text-xs text-gray-400 mb-5">Tỷ lệ đã dùng / giới hạn của từng mã đang hoạt động</p>
            {voucherUsageStats.length === 0
              ? <p className="text-center text-gray-400 text-sm py-6">Không có voucher nào</p>
              : <div className="flex flex-col gap-4">
                {voucherUsageStats.map(v => (
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
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Voucher đang chạy', value: vouchers.length, icon: 'fa-solid fa-ticket', color: 'bg-violet-50 text-violet-700 border-violet-200' },
                { label: 'Khuyến mãi đang chạy', value: promotions.length, icon: 'fa-solid fa-bullhorn', color: 'bg-orange-50 text-orange-700 border-orange-200' },
                { label: 'Tổng lượt dùng', value: vouchers.reduce((s, v) => s + (v.usedCount || 0), 0), icon: 'fa-solid fa-fire', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                { label: 'Voucher gần hết slot', value: voucherUsageStats.filter(v => v.pct >= 80).length, icon: 'fa-solid fa-triangle-exclamation', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              ].map(m => (
                <div key={m.label} className={`rounded-xl p-4 border text-center ${m.color}`}>
                  <i className={`${m.icon} text-2xl mb-2`} />
                  <p className="font-mono text-2xl font-bold leading-none">{m.value}</p>
                  <p className="text-xs font-semibold mt-1.5 leading-tight">{m.label}</p>
                </div>
              ))}
            </div>
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