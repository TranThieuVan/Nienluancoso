import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

/* ─── Helpers ──────────────────────────────────────────────────── */
const WEEK_LABELS = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'];
const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const formatShort = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(n);
};
const formatFull = (n) => (n ?? 0).toLocaleString('vi-VN') + '₫';

/* ─── Sub-component: % badge ───────────────────────────────────── */
const PctBadge = ({ value, label }) => {
  const up = value >= 0;
  const color = up ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50';
  const icon = up ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      <i className={`fa-solid ${icon} text-[10px]`} />
      {Math.abs(value)}% {label}
    </span>
  );
};

/* ─── Component ─────────────────────────────────────────────────── */
const AdminRevenue = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [weeklyProfit, setWeeklyProfit] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  /* Chart refs */
  const barCanvasRef = useRef(null);
  const lineCanvasRef = useRef(null);

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const qs = `month=${selectedMonth}&year=${selectedYear}`;

      const [wRes, cRes] = await Promise.all([
        axios.get(`/api/admin/revenue/weekly?${qs}`, cfg),
        axios.get(`/api/admin/revenue/comparison?${qs}`, cfg),
      ]);

      setWeeklyRevenue(wRes.data.weeklyRevenue || []);
      setWeeklyProfit(wRes.data.weeklyProfit || []);
      setComparison(cRes.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setWeeklyRevenue([]);
      setWeeklyProfit([]);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const totalRev = weeklyRevenue.reduce((s, v) => s + v, 0);
    const totalProf = weeklyProfit.reduce((s, v) => s + v, 0);
    const activeIdx = weeklyRevenue.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
    const peakRev = activeIdx.length ? Math.max(...activeIdx.map(i => weeklyRevenue[i])) : 0;
    const peakProf = activeIdx.length ? Math.max(...activeIdx.map(i => weeklyProfit[i])) : 0;
    const avgRev = activeIdx.length ? Math.round(totalRev / activeIdx.length) : 0;
    const avgProf = activeIdx.length ? Math.round(totalProf / activeIdx.length) : 0;
    const bestIdx = weeklyRevenue.indexOf(peakRev);
    const margin = totalRev > 0 ? Math.round((totalProf / totalRev) * 100) : 0;
    return {
      totalRev, totalProf, peakRev, peakProf, avgRev, avgProf, bestIdx, margin,
      bestWeek: peakRev > 0 ? WEEK_LABELS[bestIdx] : '—'
    };
  }, [weeklyRevenue, weeklyProfit]);

  const hasData = weeklyRevenue.some(v => v > 0);

  /* ── Bar chart: doanh thu + lợi nhuận theo tuần ── */
  useEffect(() => {
    if (!barCanvasRef.current || !hasData) return;

    const chart = new Chart(barCanvasRef.current, {
      type: 'bar',
      data: {
        labels: WEEK_LABELS,
        datasets: [
          {
            label: 'Doanh thu',
            data: weeklyRevenue,
            backgroundColor: weeklyRevenue.map((_, i) =>
              i === stats.bestIdx ? '#4f46e5' : '#c7d2fe'),
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 32,
            order: 2,
          },
          {
            label: 'Lợi nhuận',
            data: weeklyProfit,
            backgroundColor: weeklyProfit.map((_, i) =>
              i === stats.bestIdx ? '#10b981' : '#a7f3d0'),
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 32,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10, boxHeight: 10, borderRadius: 3, useBorderRadius: true,
              font: { size: 11 }, color: '#6b7280', padding: 12
            },
          },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatFull(ctx.raw)}` },
            bodyFont: { family: 'monospace', size: 13 },
            titleFont: { family: 'sans-serif', size: 12 },
            backgroundColor: '#1f2937',
            titleColor: '#9ca3af',
            bodyColor: '#f9fafb',
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false }, border: { display: false },
            ticks: { font: { size: 12 }, color: '#9ca3af' }
          },
          y: {
            grid: { color: '#f3f4f6' }, border: { display: false },
            ticks: {
              font: { size: 12 }, color: '#6b7280',
              callback: v => formatShort(v)
            }
          },
        },
      },
    });

    return () => chart.destroy();
  }, [weeklyRevenue, weeklyProfit, hasData, stats.bestIdx]);

  /* ── Line chart: trend 2 năm ── */
  useEffect(() => {
    if (!lineCanvasRef.current || !comparison?.trend) return;
    const { curYear, prevYear } = comparison.trend;
    if (!curYear.some(v => v > 0) && !prevYear.some(v => v > 0)) return;

    const chart = new Chart(lineCanvasRef.current, {
      type: 'line',
      data: {
        labels: MONTH_LABELS,
        datasets: [
          {
            label: String(selectedYear),
            data: curYear,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79,70,229,0.08)',
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#4f46e5',
            tension: 0.4,
            fill: true,
          },
          {
            label: String(selectedYear - 1),
            data: prevYear,
            borderColor: '#d1d5db',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 3,
            pointBackgroundColor: '#9ca3af',
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 24, boxHeight: 2, font: { size: 11 },
              color: '#6b7280', padding: 16
            },
          },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatFull(ctx.raw)}` },
            backgroundColor: '#1f2937',
            titleColor: '#9ca3af',
            bodyColor: '#f9fafb',
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false }, border: { display: false },
            ticks: { font: { size: 12 }, color: '#9ca3af' }
          },
          y: {
            grid: { color: '#f3f4f6' }, border: { display: false },
            ticks: {
              font: { size: 12 }, color: '#6b7280',
              callback: v => formatShort(v)
            }
          },
        },
      },
    });

    return () => chart.destroy();
  }, [comparison, selectedYear]);

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 p-8 md:p-10 font-sans">

      {/* ── Header ── */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 m-0">
          Thống kê Doanh thu
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          {[
            {
              label: 'Tháng', value: selectedMonth, set: setSelectedMonth,
              opts: Array.from({ length: 12 }, (_, i) => ({ val: i + 1, label: `Tháng ${i + 1}` }))
            },
            {
              label: 'Năm', value: selectedYear, set: setSelectedYear,
              opts: years.map(y => ({ val: y, label: String(y) }))
            },
          ].map(({ label, value, set, opts }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold">{label}</span>
              <select
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs cursor-pointer outline-none shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all"
                value={value}
                onChange={e => set(Number(e.target.value))}
              >
                {opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats: 6 cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {[
          {
            label: 'Doanh thu tháng', dot: 'bg-indigo-600', value: formatFull(stats.totalRev),
            badge: comparison ? <PctBadge value={comparison.mom.revenuePct} label="MoM" /> : null
          },
          {
            label: 'Lợi nhuận tháng', dot: 'bg-emerald-500', value: formatFull(stats.totalProf),
            badge: comparison ? <PctBadge value={comparison.mom.profitPct} label="MoM" /> : null
          },
          { label: 'Biên lợi nhuận', dot: 'bg-teal-400', value: `${stats.margin}%`, badge: null },
          { label: 'Doanh thu cao nhất', dot: 'bg-blue-500', value: formatFull(stats.peakRev), badge: null },
          { label: 'Lợi nhuận TB/tuần', dot: 'bg-green-400', value: formatFull(stats.avgProf), badge: null },
          { label: 'Tuần tốt nhất', dot: 'bg-indigo-400', value: stats.bestWeek, badge: null },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] uppercase tracking-[.12em] text-gray-400 font-bold flex items-center gap-1.5 mb-1.5">
              <span className={`w-2 h-2 rounded-full inline-block ${s.dot}`} />
              {s.label}
            </div>
            <div className="text-base md:text-lg font-bold text-gray-900 font-mono break-all leading-tight">
              {s.value}
            </div>
            {s.badge && <div className="mt-2">{s.badge}</div>}
          </div>
        ))}
      </div>

      {/* ── Bar Chart: doanh thu + lợi nhuận theo tuần ── */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-sm shadow-sm flex flex-col items-center justify-center min-h-[300px] mb-5">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500 mb-3" />
          Đang tải dữ liệu...
        </div>
      ) : !hasData ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-sm shadow-sm flex flex-col items-center justify-center min-h-[300px] mb-5">
          <i className="fa-regular fa-folder-open text-4xl text-gray-300 mb-3" />
          Không có dữ liệu doanh thu cho tháng {selectedMonth}/{selectedYear}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-5">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-gray-700 m-0">Doanh thu & Lợi nhuận theo tuần</p>
              <p className="text-xs text-gray-400 mt-1">Tháng {selectedMonth} · {selectedYear}</p>
            </div>
          </div>
          <div className="relative w-full h-[260px]">
            <canvas ref={barCanvasRef} />
          </div>
        </div>
      )}

      {/* ── Comparison section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* MoM card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            <i className="fa-solid fa-calendar-days mr-2 text-indigo-400" />
            So với tháng trước
          </p>
          {comparison ? (
            <div className="space-y-4">
              {[
                {
                  label: 'Doanh thu', pct: comparison.mom.revenuePct,
                  prev: comparison.mom.prevRevenue, cur: comparison.current.revenue,
                  color: 'indigo'
                },
                {
                  label: 'Lợi nhuận', pct: comparison.mom.profitPct,
                  prev: comparison.mom.prevProfit, cur: comparison.current.profit,
                  color: 'emerald'
                },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <PctBadge value={row.pct} label="" />
                  </div>
                  <div className="text-base font-bold text-gray-800 font-mono mb-1">
                    {formatFull(row.cur)}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Tháng trước: {formatFull(row.prev)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">—</p>
          )}
        </div>

        {/* YoY card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            <i className="fa-solid fa-rotate mr-2 text-blue-400" />
            So với cùng kỳ năm ngoái
          </p>
          {comparison ? (
            <div className="space-y-4">
              {[
                {
                  label: 'Doanh thu', pct: comparison.yoy.revenuePct,
                  prev: comparison.yoy.prevRevenue, cur: comparison.current.revenue
                },
                {
                  label: 'Lợi nhuận', pct: comparison.yoy.profitPct,
                  prev: comparison.yoy.prevProfit, cur: comparison.current.profit
                },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <PctBadge value={row.pct} label="" />
                  </div>
                  <div className="text-base font-bold text-gray-800 font-mono mb-1">
                    {formatFull(row.cur)}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Năm {selectedYear - 1}: {formatFull(row.prev)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">—</p>
          )}
        </div>

        {/* Mini trend bars */}
        {comparison?.trend && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              <i className="fa-solid fa-chart-simple mr-2 text-violet-400" />
              Tăng trưởng hàng tháng (so YoY)
            </p>
            <div className="flex flex-col gap-1.5">
              {MONTH_LABELS.map((m, i) => {
                const cur = comparison.trend.curYear[i] || 0;
                const prev = comparison.trend.prevYear[i] || 0;
                const p = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
                const w = Math.min(100, Math.abs(p));
                const up = p >= 0;
                return (
                  <div key={m} className="flex items-center gap-2">
                    <span className="w-5 text-[10px] text-gray-400 shrink-0">{m}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${up ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${w}%` }}
                      />
                    </div>
                    <span className={`w-12 text-[10px] font-mono text-right shrink-0 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                      {up ? '+' : ''}{p}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Line chart: xu hướng 2 năm ── */}
      {comparison?.trend && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-gray-700 m-0">Xu hướng Doanh thu theo năm</p>
              <p className="text-xs text-gray-400 mt-1">
                {selectedYear} so với {selectedYear - 1}
              </p>
            </div>
          </div>
          <div className="relative w-full h-[220px]">
            <canvas ref={lineCanvasRef} />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation text-lg" />
          {error}
        </div>
      )}
    </div>
  );
};

export default AdminRevenue;