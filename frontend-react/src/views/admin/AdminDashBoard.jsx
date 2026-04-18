import React, { useState, useEffect, useRef, useMemo } from 'react';
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
const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

// Hàm xử lý link ảnh chuẩn, chống lỗi double slash (//)
const getImageUrl = (path, fallbackStr = 'Book') => {
  if (!path) return `https://placehold.co/40x60?text=${fallbackStr}`;
  if (path.startsWith('http')) return path;
  return `http://localhost:5000${path.startsWith('/') ? '' : '/'}${path}`;
};

/* ── ATOMS ── */
const KpiCard = ({ label, value, sub, bgCls, icon }) => (
  <div className={`${bgCls} rounded-2xl p-5 shadow-sm flex flex-col gap-3 text-white border border-white/10 relative overflow-hidden`}>
    <div className="flex items-center justify-between relative z-10">
      <div className="flex items-center gap-2">
        <p className="text-xs uppercase tracking-widest text-white/80 font-bold">{label}</p>
      </div>
      <i className={`${icon} text-2xl text-white/40`} />
    </div>
    <p className="font-mono font-bold text-3xl leading-none relative z-10">{value}</p>
    {sub && <p className="text-xs text-white/80 relative z-10">{sub}</p>}
  </div>
);

const SectionTitle = ({ children, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-base font-bold text-gray-700">{children}</h2>
    {action}
  </div>
);

/* ── CHART COMPONENTS (Đã bọc React.memo để chống load lại) ── */
const RevenueChart = React.memo(({ data, year }) => {
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
});

const OrderDonut = React.memo(({ counts }) => {
  const ref = useRef(null); const chartRef = useRef(null);
  const labels = ['Đang xử lý', 'Đang giao', 'Hoàn tất', 'Hủy/Thất bại'];
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#f43f5e'];

  // Memoize values để tránh render lại chart khi state cha đổi
  const values = useMemo(() => [
    counts.pending || 0,
    (counts.delivering || 0) + (counts.delivered || 0),
    counts.completed || 0,
    (counts.cancelled || 0) + (counts.failed_delivery || 0) + (counts.needRefund || 0)
  ], [counts]);

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
  }, [values]); // Chỉ render lại khi array values đổi

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
});

const LimitSelect = ({ value, onChange, colorClass }) => (
  <select
    value={value}
    onChange={e => onChange(Number(e.target.value))}
    className={`text-[11px] font-bold border rounded-lg px-2.5 py-1 outline-none cursor-pointer ${colorClass}`}
  >
    <option value={1}>Top 1</option>
    <option value={5}>Top 5</option>
    <option value={10}>Top 10</option>
  </select>
);

/* ════════════════════════════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════════════════════════════ */
const AdminDashBoard = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const year = new Date().getFullYear();

  /* ── TOP SECTION STATE ── */
  const [topPeriod, setTopPeriod] = useState('all');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [topLimits, setTopLimits] = useState({ books: 5, users: 5, vouchers: 5 });
  const [topData, setTopData] = useState(null);
  const [topLoading, setTopLoading] = useState(false);

  /* ── FETCH OVERVIEW ── */
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

  /* ── FETCH TOP DATA ── */
  useEffect(() => {
    const fetchTopData = async () => {
      if (topPeriod === 'custom' && (!customDates.start || !customDates.end)) return;

      setTopLoading(true);
      try {
        const token = localStorage.getItem('adminToken');
        const url = `/api/admin/dashboard/top?period=${topPeriod}&limit=10` +
          (topPeriod === 'custom' ? `&startDate=${customDates.start}&endDate=${customDates.end}` : '');

        const { data } = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTopData(data);
      } catch (err) {
        console.error('Top data error:', err);
      } finally {
        setTopLoading(false);
      }
    };
    fetchTopData();
  }, [topPeriod, customDates]);

  if (loading || !overview) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-gray-400">
        <i className="fa-solid fa-circle-notch fa-spin text-5xl text-indigo-400" />
        <p className="text-base font-medium">Đang tải dữ liệu thực tế...</p>
      </div>
    </div>
  );

  const { kpi } = overview;
  const totalRevenue = kpi.monthlyRevenue.reduce((s, v) => s + v, 0);
  const maxMonthVal = Math.max(...kpi.monthlyRevenue);
  const topMonth = maxMonthVal > 0 ? MONTH_LABELS[kpi.monthlyRevenue.indexOf(maxMonthVal)] : '—';

  const completedRate = kpi.orderCounts.total > 0
    ? ((kpi.orderCounts.completed / kpi.orderCounts.total) * 100).toFixed(1)
    : 0;

  const PERIOD_LABELS = { today: 'Hôm nay', '3days': '3 ngày', '7days': '7 ngày', '30days': '30 ngày', all: 'Tất cả', custom: 'Tùy chỉnh' };

  return (
    <div className="min-h-screen bg-gray-50 p-7 font-sans">

      {/* ── HEADER ── */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-sm text-gray-400 mt-1.5">
            <i className="fa-regular fa-clock mr-1.5" />
            Cập nhật lúc {new Date().toLocaleTimeString('vi-VN')}
          </p>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        <KpiCard label="Thực thu năm" value={fmtShort(totalRevenue)} sub={`Tháng cao nhất: ${topMonth}`} bgCls="bg-indigo-500" icon="fa-solid fa-sack-dollar" />
        <KpiCard label="Tỷ lệ mua lại" value={`${kpi.returningRate || 0}%`} sub="Khách mua hàng trên 1 lần" bgCls="bg-emerald-500" icon="fa-solid fa-users-rotate" />
        <KpiCard label="Tỷ lệ thành công" value={`${completedRate}%`} sub={`Đã hoàn tất ${kpi.orderCounts.completed || 0} đơn`} bgCls="bg-violet-500" icon="fa-solid fa-circle-check" />
        <KpiCard label="Người dùng" value={kpi.totalUsers.toString()} sub={`${kpi.lockedUsers} bị khóa`} bgCls="bg-sky-500" icon="fa-solid fa-users" />
        <KpiCard label="Tổng đầu sách" value={kpi.totalBooks.toString()} sub={`${kpi.outOfStockBooks} hết hàng`} bgCls="bg-amber-500" icon="fa-solid fa-book" />
        <KpiCard label="Cần hoàn tiền" value={kpi.orderCounts.needRefund.toString()} sub="Đơn huỷ chờ xử lý" bgCls="bg-rose-500" icon="fa-solid fa-rotate-left" />
      </div>

      {/* ── CHARTS (Sẽ không load lại khi bấm filter nhờ React.memo) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
        <div className="xl:col-span-2"><RevenueChart data={kpi.monthlyRevenue} year={year} /></div>
        <OrderDonut counts={kpi.orderCounts} />
      </div>

      {/* ── SHARED TIME FILTER ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fa-solid fa-ranking-star text-indigo-500" />
            Bảng xếp hạng
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Bộ lọc thời gian áp dụng cho tất cả bảng xếp hạng bên dưới</p>
        </div>

        <div className="flex items-center gap-3">
          {topPeriod === 'custom' && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
              <input type="date" className="text-xs outline-none text-gray-600" value={customDates.start} onChange={e => setCustomDates(p => ({ ...p, start: e.target.value }))} />
              <span className="text-gray-400">-</span>
              <input type="date" className="text-xs outline-none text-gray-600" value={customDates.end} onChange={e => setCustomDates(p => ({ ...p, end: e.target.value }))} />
            </div>
          )}

          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTopPeriod(key)}
                disabled={topLoading && topPeriod !== 'custom'}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${topPeriod === key
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  } ${(topLoading && topPeriod !== 'custom') ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOP 3 COLUMNS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ══ CỘT 1: #30A0E0 ══ */}
        <div className="bg-[#A2D2FF] border border-black/10 rounded-2xl shadow-sm overflow-hidden flex flex-col text-gray-900">
          <div className="px-5 py-4 bg-white/30 border-b border-black/5 flex items-center justify-between">
            <span className="text-sm font-bold">Sách bán chạy nhất</span>
            <LimitSelect value={topLimits.books} onChange={v => setTopLimits(p => ({ ...p, books: v }))} colorClass="bg-white/50 text-gray-900 border-white/30 hover:bg-white/70" />
          </div>
          <div className={`overflow-y-auto custom-scrollbar relative transition-opacity duration-300 ${topLoading ? 'opacity-50 pointer-events-none' : ''}`} style={{ maxHeight: '450px' }}>
            {topLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-white/80" />
              </div>
            )}

            {!topData?.topBooks?.length && !topLoading ? (
              <div className="py-14 text-center text-gray-700 text-xs">Không có dữ liệu</div>
            ) : (
              <div className="divide-y divide-[#2b90c9]/40">
                {topData?.topBooks?.slice(0, topLimits.books).map((b, i) => (
                  <div key={b._id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#2792cf]/60 transition-colors">
                    <span className="text-xs font-bold text-gray-800 w-4 text-center">{i + 1}</span>
                    <img
                      src={getImageUrl(b.info?.image)}
                      alt={b.info?.title}
                      className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0 border border-[#2b90c9]"
                      onError={(e) => { e.target.src = 'https://placehold.co/40x60?text=Book'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-gray-900">{b.info?.title}</p>
                      <p className="text-[11px] text-gray-800 truncate mt-0.5">{b.info?.author}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-mono font-black text-gray-900 text-sm">{b.totalQty}</p>
                      <p className="text-[9px] text-gray-800 uppercase">đã bán</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ CỘT 2: #FFC872 ══ */}
        <div className="bg-[#FFC872] border border-black/10 rounded-2xl shadow-sm overflow-hidden flex flex-col text-gray-900">
          <div className="px-5 py-4 bg-white/40 border-b border-black/5 flex items-center justify-between">
            <span className="text-sm font-bold">Khách hàng xuất sắc</span>
            <LimitSelect value={topLimits.users} onChange={v => setTopLimits(p => ({ ...p, users: v }))} colorClass="bg-white/50 text-gray-900 border-white/30 hover:bg-white/70" />
          </div>

          <div className={`flex flex-col flex-1 relative transition-opacity duration-300 ${topLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            {topLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-white/80" />
              </div>
            )}

            {!topData?.topUsersByOrders?.length && !topLoading ? (
              <div className="py-14 text-center text-gray-700 text-xs">Không có dữ liệu</div>
            ) : (
              <>
                <div>
                  <div className="px-5 py-2 bg-[#f0bb66]/60 border-b border-[#e6b463] flex items-center gap-2">
                    <i className="fa-solid fa-cart-shopping text-gray-800 text-[10px]" />
                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Đặt nhiều đơn nhất</span>
                  </div>

                  <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '200px' }}>
                    <div className="divide-y divide-[#e6b463]/40">
                      {topData?.topUsersByOrders?.slice(0, topLimits.users).map((u, i) => (
                        <div key={u._id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#f0bb66]/60 transition-colors">
                          <span className="text-xs font-bold text-gray-800 w-4 text-center">{i + 1}</span>
                          <img
                            src={getImageUrl(u.u?.avatar, u.u?.name)}
                            alt={u.u?.name}
                            className="w-8 h-8 rounded-full border border-[#e6b463] object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-gray-900">{u.u?.name}</p>
                            <p className="text-[11px] text-gray-800 truncate mt-0.5">{u.u?.email}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="font-mono font-black text-gray-900 text-sm">{u.count}</p>
                            <p className="text-[9px] text-gray-800 uppercase">đơn</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e6b463]">
                  <div className="px-5 py-2 bg-[#f0bb66]/60 border-b border-[#e6b463] flex items-center gap-2">
                    <i className="fa-solid fa-money-bill-wave text-gray-800 text-[10px]" />
                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Chi tiêu cao nhất</span>
                  </div>

                  <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '200px' }}>
                    <div className="divide-y divide-[#e6b463]/40">
                      {topData?.topUsersBySpending?.slice(0, topLimits.users).map((u, i) => (
                        <div key={u._id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#f0bb66]/60 transition-colors">
                          <span className="text-xs font-bold text-gray-800 w-4 text-center">{i + 1}</span>
                          <img
                            src={getImageUrl(u.u?.avatar, u.u?.name)}
                            alt={u.u?.name}
                            className="w-8 h-8 rounded-full border border-[#e6b463] object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-gray-900">{u.u?.name}</p>
                            <p className="text-[11px] text-gray-800 truncate mt-0.5">{u.u?.email}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="font-mono font-black text-gray-900 text-sm">{fmtShort(u.spent)}</p>
                            <p className="text-[9px] text-gray-800 uppercase">đã chi</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══ CỘT 3: #FFE3B3 ══ */}
        <div className="bg-[#FFE3B3] border border-black/10 rounded-2xl shadow-sm overflow-hidden flex flex-col text-gray-900">
          <div className="px-5 py-4 bg-white/50 border-b border-black/5 flex items-center justify-between">
            <span className="text-sm font-bold">Voucher hiệu quả nhất</span>
            <LimitSelect value={topLimits.vouchers} onChange={v => setTopLimits(p => ({ ...p, vouchers: v }))} colorClass="bg-white/60 text-gray-900 border-white/40 hover:bg-white/80" />
          </div>

          <div className={`overflow-y-auto custom-scrollbar relative transition-opacity duration-300 ${topLoading ? 'opacity-50 pointer-events-none' : ''}`} style={{ maxHeight: '450px' }}>
            {topLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-white/80" />
              </div>
            )}

            {!topData?.topVouchers?.length && !topLoading ? (
              <div className="py-14 text-center text-gray-700 text-xs">Không có dữ liệu voucher</div>
            ) : (
              <div className="divide-y divide-[#e6cfa1]/40">
                {topData?.topVouchers?.slice(0, topLimits.vouchers).map((v, i) => (
                  <div key={v._id} className="px-5 py-4 hover:bg-[#f5d9a5]/60 transition-colors">
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className="text-xs font-bold text-gray-800 w-4 text-center">{i + 1}</span>
                      <span className="font-mono font-bold text-gray-900 bg-[#f5d9a5] px-2.5 py-1 rounded text-xs border border-[#e6cfa1]">
                        {v.v?.code || v._id}
                      </span>
                      <span className="ml-auto text-[10px] font-bold text-gray-900 bg-[#f5d9a5] px-2 py-0.5 rounded-full">
                        {v.useCount} lượt
                      </span>
                    </div>
                    <div className="flex items-center justify-between pl-11">
                      <span className="text-[11px] text-gray-800">Doanh thu mang lại</span>
                      <span className="font-mono text-sm font-black text-gray-900">{fmtShort(v.rev)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashBoard;