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
const RANK_COLORS = { 'Khách hàng': '#94a3b8', 'Bạc': '#cbd5e1', 'Vàng': '#fbbf24', 'Bạch kim': '#818cf8', 'Kim cương': '#38bdf8' };

// ✅ ĐÃ SỬA: Cập nhật toàn bộ các trạng thái mới
const STATUS_MAP = {
  pending: { label: 'Đang xử lý', cls: 'bg-amber-100 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  delivering: { label: 'Đang giao', cls: 'bg-blue-100 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
  delivered: { label: 'Đã giao (Chờ)', cls: 'bg-violet-100 text-violet-700 border border-violet-200', dot: 'bg-violet-500' },
  completed: { label: 'Hoàn tất', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-100 text-red-600 border border-red-200', dot: 'bg-red-500' },
  failed_delivery: { label: 'Giao thất bại', cls: 'bg-orange-100 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  returned: { label: 'Đã trả hàng', cls: 'bg-stone-100 text-stone-700 border border-stone-300', dot: 'bg-stone-500' },
};

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

/* ── CHART COMPONENTS ── */
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
        <span className="flex items-center gap-2"><i className="fa-solid fa-chart-column text-indigo-500" />Doanh thu Thực Thu theo tháng — {year}</span>
      </SectionTitle>
      <div className="h-56"><canvas ref={ref} /></div>
    </div>
  );
};

const OrderDonut = ({ counts }) => {
  const ref = useRef(null); const chartRef = useRef(null);
  // ✅ ĐÃ SỬA: Gom nhóm chuẩn theo logic mới
  const labels = ['Đang xử lý', 'Đang giao', 'Hoàn tất', 'Hủy/Thất bại'];
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#f43f5e'];
  const values = [
    counts.pending || 0,
    (counts.delivering || 0) + (counts.delivered || 0),
    counts.completed || 0,
    (counts.cancelled || 0) + (counts.failed_delivery || 0) + (counts.needRefund || 0)
  ];
  const total = counts.total || 0;

  useEffect(() => {
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    if (!ref.current) return;
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 3, borderColor: '#fff', hoverOffset: 5 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `  ${ctx.label}: ${ctx.raw} đơn` }, backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#f8fafc', padding: 10, cornerRadius: 8 } } },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [counts, values]);

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
  const [overview, setOverview] = useState(null);
  const year = new Date().getFullYear();

  const [timeFilter, setTimeFilter] = useState('all');
  const [filteredTopBooks, setFilteredTopBooks] = useState([]);
  const [topLoading, setTopLoading] = useState(false);

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

  const getDateRange = (filterType) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (filterType === 'today') {
      start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
    } else if (filterType === 'week') {
      const first = now.getDate() - now.getDay() + 1;
      start = new Date(now.setDate(first)); start.setHours(0, 0, 0, 0); end = new Date();
    } else if (filterType === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1); start.setHours(0, 0, 0, 0); end = new Date();
    } else {
      return { startDate: null, endDate: null };
    }
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  };

  useEffect(() => {
    const fetchTopBooks = async () => {
      setTopLoading(true);
      try {
        const { startDate, endDate } = getDateRange(timeFilter);
        let url = 'http://localhost:5000/api/books/top-selling';
        if (startDate && endDate) url += `?startDate=${startDate}&endDate=${endDate}`;
        const res = await axios.get(url);
        setFilteredTopBooks(res.data);
      } catch (error) {
        console.error('Lỗi lấy sách bán chạy:', error);
      } finally {
        setTopLoading(false);
      }
    };
    fetchTopBooks();
  }, [timeFilter]);

  if (loading || !overview) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-gray-400">
        <i className="fa-solid fa-circle-notch fa-spin text-5xl text-indigo-400" />
        <p className="text-base font-medium">Đang tải dữ liệu thực tế...</p>
      </div>
    </div>
  );

  const { kpi, recentOrders, lowStock, promotions, vouchers } = overview;
  const totalRevenue = kpi.monthlyRevenue.reduce((s, v) => s + v, 0);
  const maxMonthVal = Math.max(...kpi.monthlyRevenue);
  const topMonth = maxMonthVal > 0 ? MONTH_LABELS[kpi.monthlyRevenue.indexOf(maxMonthVal)] : '—';

  const now = new Date();
  const activePromotions = (promotions || []).filter(p => new Date(p.endDate) >= now && p.isActive !== false);
  const activeVouchers = (vouchers || []).filter(v =>
    v.isActive !== false && new Date(v.expirationDate) >= now && (v.usedCount || 0) < (v.usageLimit || 999999)
  );

  return (
    <div className="min-h-screen bg-gray-50 p-7 font-sans">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-400 mt-1.5"><i className="fa-regular fa-clock mr-1.5" />Cập nhật lúc {new Date().toLocaleTimeString('vi-VN')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Thực thu năm" value={fmtShort(totalRevenue)} sub={`Tháng cao nhất: ${topMonth}`} dotCls="bg-indigo-500" icon="fa-solid fa-sack-dollar" highlight />
        <KpiCard label="Tổng đơn hàng" value={kpi.orderCounts.total.toString()} sub={`${kpi.orderCounts.completed || 0} đã hoàn tất`} dotCls="bg-violet-500" icon="fa-solid fa-box" />
        <KpiCard label="Đang xử lý" value={kpi.orderCounts.pending.toString()} sub={`${kpi.orderCounts.delivering || 0} đang giao`} dotCls="bg-amber-500" icon="fa-solid fa-clock" />
        <KpiCard label="Người dùng" value={kpi.totalUsers.toString()} sub={`${kpi.lockedUsers} bị khóa`} dotCls="bg-sky-500" icon="fa-solid fa-users" />
        <KpiCard label="Tổng đầu sách" value={kpi.totalBooks.toString()} sub={`${kpi.outOfStockBooks} hết hàng`} dotCls="bg-emerald-500" icon="fa-solid fa-book" />
        <KpiCard label="Cần hoàn tiền" value={kpi.orderCounts.needRefund.toString()} sub="Đơn huỷ chờ xử lý" dotCls="bg-rose-500" icon="fa-solid fa-rotate-left" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <div className="xl:col-span-2"><RevenueChart data={kpi.monthlyRevenue} year={year} /></div>
        <OrderDonut counts={kpi.orderCounts} />
      </div>

      {/* Block Top Books & Recent Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        <div className="bg-amber-50/40 border border-amber-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-amber-200/60">
            <SectionTitle
              action={
                <div className="flex bg-amber-100/50 p-1 rounded-lg border border-amber-200/50">
                  {['today', 'week', 'month', 'all'].map((filter) => {
                    const labels = { today: 'Hôm nay', week: 'Tuần này', month: 'Tháng này', all: 'Tất cả' };
                    return (
                      <button
                        key={filter} onClick={() => setTimeFilter(filter)} disabled={topLoading}
                        className={`px-2.5 py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all ${timeFilter === filter ? 'bg-white text-amber-700 shadow-sm border border-amber-200' : 'text-amber-600/70 hover:text-amber-800 hover:bg-amber-100/50'} ${topLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {labels[filter]}
                      </button>
                    );
                  })}
                </div>
              }
            >
              <span className="flex items-center gap-2"><i className="fa-solid fa-trophy text-amber-600" />Top 5 sách bán chạy</span>
            </SectionTitle>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-amber-100/50 border-b border-amber-200/60">
              <tr>{['#', 'Sách', 'Đã Bán', 'Giá'].map((h, i) => (
                <th key={h} className={`px-5 py-3 text-xs uppercase tracking-widest text-amber-700 font-bold ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-amber-200/40">
              {topLoading ? (
                <tr><td colSpan="4" className="py-12 text-center text-amber-600/80 text-sm"><i className="fa-solid fa-circle-notch fa-spin mr-2" />Đang lọc dữ liệu...</td></tr>
              ) : filteredTopBooks.length === 0 ? (
                <tr><td colSpan="4" className="py-12 text-center text-gray-400 text-sm">Không có dữ liệu bán hàng</td></tr>
              ) : filteredTopBooks.map((book, i) => (
                <tr key={book._id} className="hover:bg-amber-100/30 transition-colors">
                  <td className="px-5 py-3.5"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-200 text-amber-800' : i === 1 ? 'bg-gray-200 text-gray-700' : 'bg-amber-100 text-amber-600'}`}>{i + 1}</span></td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <img src={book.image?.startsWith('http') ? book.image : `http://localhost:5000${book.image}`} alt={book.title} className="w-8 h-11 object-cover border border-amber-100 rounded flex-shrink-0" />
                      <div><p className="font-semibold text-gray-800 text-sm line-clamp-1">{book.title}</p><p className="text-xs text-gray-500 mt-0.5">{book.author}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 text-sm">{book.totalSold ?? book.sold}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-gray-700 text-sm">{(book.discountedPrice || book.price)?.toLocaleString('vi-VN')}₫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

      {/* Block 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </div>

        <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-emerald-200/60">
            <div className="flex items-center justify-between"><p className="text-base font-bold text-gray-700 flex items-center gap-2"><i className="fa-solid fa-bullhorn text-emerald-600" />Khuyến mãi & Voucher</p></div>
          </div>
          <div className="divide-y divide-emerald-200/40 flex-1">
            {activePromotions.slice(0, 3).map(p => (
              <div key={p._id} className="px-5 py-3 hover:bg-emerald-100/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1">{p.name}</p>
                  <span className="flex-shrink-0 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-mono">-{fmt(p.discountValue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminDashBoard;