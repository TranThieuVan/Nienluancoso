import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

/* ─── Formatters ─── */
const DATE_PRESETS = [
  { key: 'today', label: 'Hôm nay' }, { key: 'yesterday', label: 'Hôm qua' },
  { key: 'last7', label: '7 ngày' }, { key: 'last30', label: '30 ngày' },
  { key: 'thisMonth', label: 'Tháng này' }, { key: 'custom', label: 'Tuỳ chọn' }
];

const fmt = (n) => {
  const num = Number(n); if (isNaN(num) || num === 0) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr';
  if (num >= 1_000) return Math.round(num / 1_000) + 'k';
  return String(num);
};

const fmtFull = (n) => (isNaN(Number(n)) ? '0₫' : Number(n).toLocaleString('vi-VN') + '₫');

const fmtDate = (dStr) => {
  if (!dStr) return '';
  const d = new Date(dStr);
  return isNaN(d) ? dStr : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/* ════════════════════════════════════════════════════════════
  MAIN COMPONENT
════════════════════════════════════════════════════════════ */
const AdminRevenue = () => {
  // Global Filters
  const [datePreset, setDatePreset] = useState('last30');
  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Local Selectors
  const [groupBy, setGroupBy] = useState('day_of_week');
  const [compareBy, setCompareBy] = useState('week');

  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Chart Refs
  const trendCanvasRef = useRef(null);
  const perfCanvasRef = useRef(null);
  const compCanvasRef = useRef(null);
  const charts = useRef({ trend: null, perf: null, comp: null });

  // Xây dựng Query String
  const buildQS = useCallback(() => {
    const p = new URLSearchParams();
    if (datePreset !== 'custom') p.set('preset', datePreset);
    else { if (fromDate) p.set('from', fromDate); if (toDate) p.set('to', toDate); }

    p.set('groupBy', groupBy);
    p.set('compareBy', compareBy);

    return p.toString();
  }, [datePreset, fromDate, toDate, groupBy, compareBy]);

  // Gọi API duy nhất
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const qs = buildQS();
      const res = await axios.get(`/api/admin/revenue/dashboard?${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDbData(res.data);
    } catch (err) {
      console.error('Dashboard Error:', err);
    } finally {
      setLoading(false);
    }
  }, [buildQS]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  /* ── 1. TREND CHART (Biểu đồ chính) ── */
  useEffect(() => {
    if (!dbData?.trend || !trendCanvasRef.current) return;
    if (charts.current.trend) charts.current.trend.destroy();

    charts.current.trend = new Chart(trendCanvasRef.current, {
      type: 'line',
      data: {
        labels: dbData.trend.map(d => fmtDate(d.date)),
        datasets: [
          { label: 'Doanh thu', data: dbData.trend.map(d => d.revenue), borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.05)', borderWidth: 3, fill: true, tension: 0.3 },
          { label: 'Lợi nhuận', data: dbData.trend.map(d => d.profit), borderColor: '#10b981', borderDash: [5, 3], borderWidth: 2, tension: 0.3 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmtFull(c.raw)}` } } },
        scales: { y: { ticks: { callback: v => fmt(v) }, beginAtZero: true }, x: { grid: { display: false } } }
      }
    });
  }, [dbData]);

  /* ── 2. PERFORMANCE CHART (Hiệu suất) ── */
  useEffect(() => {
    if (!dbData?.performance || !perfCanvasRef.current) return;
    if (charts.current.perf) charts.current.perf.destroy();

    charts.current.perf = new Chart(perfCanvasRef.current, {
      type: 'bar',
      data: {
        labels: dbData.performance.map(d => d.label),
        datasets: [
          { label: 'Doanh thu', data: dbData.performance.map(d => d.revenue), backgroundColor: '#c7d2fe', borderRadius: 4 },
          { label: 'Lợi nhuận', data: dbData.performance.map(d => d.profit), backgroundColor: '#a7f3d0', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmtFull(c.raw)}` } } },
        scales: { x: { grid: { display: false } }, y: { display: false } }
      }
    });
  }, [dbData]);

  /* ── 3. COMPARISON CHART (So sánh lợi nhuận) ── */
  useEffect(() => {
    if (!dbData?.comparison || !compCanvasRef.current) return;
    if (charts.current.comp) charts.current.comp.destroy();

    charts.current.comp = new Chart(compCanvasRef.current, {
      type: 'line',
      data: {
        labels: dbData.comparison.labels,
        datasets: [
          { label: 'Kỳ này', data: dbData.comparison.current, borderColor: '#10b981', borderWidth: 2, tension: 0.3 },
          { label: 'Kỳ trước', data: dbData.comparison.previous, borderColor: '#d1d5db', borderDash: [5, 4], borderWidth: 2, pointRadius: 0, tension: 0.3 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmtFull(c.raw)}` } } },
        scales: { x: { grid: { display: false } }, y: { display: false } }
      }
    });
  }, [dbData]);

  // Cleanup
  useEffect(() => () => Object.values(charts.current).forEach(c => c?.destroy()), []);

  /* ── Export CSV ── */
  const exportCSV = () => {
    if (!dbData?.trend?.length) return;
    const header = ['Ngày', 'Doanh thu (₫)', 'Lợi nhuận (₫)'];
    const rows = dbData.trend.map(d => [d.date, d.revenue, d.profit]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `Bao_cao_doanh_thu_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-5 md:p-7 font-sans">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">Báo cáo Tài chính</h1>
          <p className="text-xs text-gray-400 mt-0.5">Phân tích Doanh thu & Lợi nhuận chuyên sâu</p>
        </div>
        <button onClick={exportCSV} disabled={!dbData?.trend?.length}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 text-gray-700 disabled:opacity-40">
          <i className="fa-solid fa-file-arrow-down text-indigo-500" />Xuất CSV
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 mb-6 flex flex-wrap items-center gap-2 sticky top-0 z-10">
        <i className="fa-regular fa-calendar text-gray-400 mr-1 text-sm" />
        {DATE_PRESETS.map(p => (
          <button key={p.key} onClick={() => { setDatePreset(p.key); if (p.key !== 'custom') { setFromDate(''); setToDate(''); } }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${datePreset === p.key ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            {p.label}
          </button>
        ))}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)} className="px-3 py-1 text-xs border border-gray-200 rounded-lg outline-none" />
            <span className="text-gray-300 text-sm"><i className="fa-solid fa-arrow-right text-xs" /></span>
            <input type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)} className="px-3 py-1 text-xs border border-gray-200 rounded-lg outline-none" />
            <button onClick={() => { setFromDate(pendingFrom); setToDate(pendingTo); }} disabled={!pendingFrom || !pendingTo} className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-40">Áp dụng</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-indigo-400">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl" />
        </div>
      ) : (
        <>
          {/* ── KPI CARDS (Chỉ 3 Cards) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm border-l-4 border-l-indigo-500">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">Doanh thu</p>
              <p className="text-3xl font-black text-gray-900 font-mono leading-tight">{fmtFull(dbData?.summary?.revenue)}</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
              <p className="text-xs uppercase tracking-widest text-indigo-500 font-bold mb-1">Lợi nhuận</p>
              <p className="text-3xl font-black text-emerald-600 font-mono leading-tight">{fmtFull(dbData?.summary?.profit)}</p>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm border-l-4 border-l-amber-400">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">Biên lợi nhuận</p>
              <p className="text-3xl font-black text-amber-500 font-mono leading-tight">{dbData?.summary?.profitMargin || 0}%</p>
            </div>
          </div>

          {/* ── MAIN TREND CHART ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-5">Biến động Theo Ngày</h3>
            <div className="relative w-full h-[320px]">
              {dbData?.trend?.length > 0 ? <canvas ref={trendCanvasRef} /> : <div className="absolute inset-0 flex items-center justify-center text-gray-300">Không có dữ liệu</div>}
            </div>
          </div>

          {/* ── BOTTOM CHARTS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            {/* PERFORMANCE CHART */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Phân tích Hiệu suất</h3>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="text-[11px] border border-gray-200 text-gray-700 rounded-lg px-2 py-1 outline-none bg-gray-50 cursor-pointer font-medium hover:border-indigo-400 transition-colors">
                  <option value="day_of_week">Theo Thứ trong tuần</option>
                  <option value="month_of_year">Theo Tháng trong năm</option>
                </select>
              </div>
              <div className="relative w-full h-[240px]">
                {dbData?.performance ? <canvas ref={perfCanvasRef} /> : <div className="absolute inset-0 flex items-center justify-center text-gray-300">Không có dữ liệu</div>}
              </div>
            </div>

            {/* COMPARISON CHART */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">So sánh Lợi nhuận</h3>
                <select value={compareBy} onChange={e => setCompareBy(e.target.value)} className="text-[11px] border border-gray-200 text-gray-700 rounded-lg px-2 py-1 outline-none bg-gray-50 cursor-pointer font-medium hover:border-indigo-400 transition-colors">
                  <option value="week">7 ngày gần nhất</option>
                  <option value="month">Tháng này</option>
                  <option value="year">Năm nay</option>
                </select>
              </div>
              <div className="relative w-full h-[240px]">
                {dbData?.comparison ? <canvas ref={compCanvasRef} /> : <div className="absolute inset-0 flex items-center justify-center text-gray-300">Không có dữ liệu</div>}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default AdminRevenue;