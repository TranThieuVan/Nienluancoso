import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

/* ─── Helpers ──────────────────────────────────────────────────── */
const SEGMENT_LABELS = ['GĐ 1 (1-7)', 'GĐ 2 (8-14)', 'GĐ 3 (15-21)', 'GĐ 4 (22-28)', 'GĐ 5 (Cuối tháng)'];
const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const formatShort = (n) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(n);
};
const formatFull = (n) => (n ?? 0).toLocaleString('vi-VN') + '₫';
const formatDate = (dStr) => {
  const d = new Date(dStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const DATE_PRESETS = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'last7', label: '7 ngày qua' },
  { key: 'last30', label: '30 ngày qua' },
  { key: 'thisMonth', label: 'Tháng này' },
  { key: 'custom', label: 'Tuỳ chọn' },
];

const AdminRevenue = () => {
  const [datePreset, setDatePreset] = useState('last30');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const showCustom = datePreset === 'custom';

  const [dashboardData, setDashboardData] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  const dailyCanvasRef = useRef(null);
  const segmentCanvasRef = useRef(null);
  const lineCanvasRef = useRef(null);

  const buildQS = useCallback(() => {
    const p = new URLSearchParams();
    if (datePreset !== 'custom') p.set('preset', datePreset);
    if (datePreset === 'custom' && fromDate) p.set('from', fromDate);
    if (datePreset === 'custom' && toDate) p.set('to', toDate);
    return p.toString();
  }, [datePreset, fromDate, toDate]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const qs = buildQS();

      const [dRes, cRes] = await Promise.all([
        axios.get(`/api/admin/revenue/weekly?${qs}`, cfg),
        axios.get(`/api/admin/revenue/comparison?${qs}`, cfg),
      ]);

      setDashboardData(dRes.data);
      setComparison(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [buildQS]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePresetClick = (key) => {
    if (datePreset !== key) {
      setDatePreset(key); setFromDate(''); setToDate('');
    }
  };

  /* ─── AUTO INSIGHTS ENGINE ─── */
  const getInsights = () => {
    if (!dashboardData || !comparison) return [];
    const { summary, dailyData } = dashboardData;
    const insights = [];

    // 1. Order-level metrics
    insights.push({
      icon: 'fa-box-open', color: 'text-blue-600 bg-blue-100', title: 'Hiệu suất Bán hàng',
      desc: summary.totalOrders > 0
        ? `Tổng **${summary.totalOrders}** đơn hoàn tất. Trung bình mỗi đơn mang về (AOV) **${formatFull(summary.aov)}**.`
        : 'Chưa có đơn hàng nào được hoàn tất trong kỳ lọc này.'
    });

    // 2. Spike Detection (Tìm ngày bùng nổ)
    if (dailyData && dailyData.length > 0) {
      const peak = dailyData.reduce((max, cur) => cur.revenue > max.revenue ? cur : max, dailyData[0]);
      insights.push({
        icon: 'fa-fire', color: 'text-orange-600 bg-orange-100', title: 'Bùng nổ Doanh thu',
        desc: `Ngày **${formatDate(peak.date)}** đạt đỉnh với **${formatFull(peak.revenue)}** thực thu từ **${peak.orders}** đơn hàng.`
      });
    } else {
      insights.push({ icon: 'fa-chart-line', color: 'text-gray-500 bg-gray-100', title: 'Chưa có dữ liệu', desc: 'Không có biến động doanh thu đáng kể.' });
    }

    // 3. Conversion / Trend Correlation
    const revPct = comparison.mom?.revenuePct || 0;
    const up = revPct >= 0;
    insights.push({
      icon: up ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
      color: up ? 'text-emerald-600 bg-emerald-100' : 'text-red-600 bg-red-100', // Đã bổ sung vế false ở đây
      title: 'Biến động Kỳ trước',
      desc: `Doanh thu **${up ? 'tăng' : 'giảm'} ${Math.abs(revPct).toFixed(1)}%** so với kỳ trước. Biên lợi nhuận đạt **${summary.totalRevenue > 0 ? Math.round((summary.totalProfit / summary.totalRevenue) * 100) : 0}%**.`
    });

    return insights;
  };

  /* ─── CHARTS RENDER ─── */
  useEffect(() => {
    if (!dailyCanvasRef.current || !dashboardData?.dailyData?.length) return;
    const ctx = dailyCanvasRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

    const chart = new Chart(dailyCanvasRef.current, {
      type: 'line',
      data: {
        labels: dashboardData.dailyData.map(d => formatDate(d.date)),
        datasets: [
          {
            label: 'Doanh thu (₫)', data: dashboardData.dailyData.map(d => d.revenue),
            borderColor: '#4f46e5', backgroundColor: gradient, borderWidth: 3, pointRadius: 4, pointBackgroundColor: '#fff',
            tension: 0.4, fill: true
          }
          // ĐÃ XÓA: Dataset cột Đơn hàng (orders)
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: {
            backgroundColor: '#1e293b', padding: 12, titleFont: { size: 14 }, bodyFont: { size: 13 },
            callbacks: { label: c => ` ${c.dataset.label}: ${formatFull(c.raw)}` }
          }
        },
        scales: {
          x: { grid: { display: false } },
          // ĐÃ XÓA: Trục y1 dành cho Đơn hàng
          y: { type: 'linear', display: true, position: 'left', grid: { color: '#f3f4f6' }, ticks: { callback: v => formatShort(v) } }
        }
      }
    });
    return () => chart.destroy();
  }, [dashboardData]);

  useEffect(() => {
    if (!segmentCanvasRef.current || !dashboardData?.segments) return;
    const chart = new Chart(segmentCanvasRef.current, {
      type: 'bar',
      data: {
        labels: SEGMENT_LABELS,
        datasets: [
          { label: 'Doanh thu', data: dashboardData.segments.revenue, backgroundColor: '#c7d2fe', borderRadius: 4 },
          { label: 'Lợi nhuận', data: dashboardData.segments.profit, backgroundColor: '#a7f3d0', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${formatFull(c.raw)}` } } },
        scales: { x: { grid: { display: false } }, y: { display: false } }
      }
    });
    return () => chart.destroy();
  }, [dashboardData]);

  useEffect(() => {
    if (!lineCanvasRef.current || !comparison?.trend) return;
    const { curYear, prevYear } = comparison.trend;
    const chart = new Chart(lineCanvasRef.current, {
      type: 'line',
      data: {
        labels: MONTH_LABELS,
        datasets: [
          { label: 'Năm nay', data: curYear, borderColor: '#4f46e5', borderWidth: 2, pointRadius: 3, tension: 0.4 },
          { label: 'Năm trước', data: prevYear, borderColor: '#d1d5db', borderDash: [5, 5], borderWidth: 2, pointRadius: 0, tension: 0.4 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } }, y: { display: false } } }
    });
    return () => chart.destroy();
  }, [comparison]);

  const insights = getInsights();
  const summary = dashboardData?.summary || { totalRevenue: 0, totalProfit: 0, totalOrders: 0, aov: 0 };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 font-sans">

      {/* ─── 1. BỘ LỌC THỜI GIAN NẰM TRÊN CÙNG ─── */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 m-0">Báo cáo Tài chính</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-3 mb-6 flex flex-wrap items-center gap-3 sticky top-0 z-10">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mr-2"><i className="fa-regular fa-calendar mr-1.5" />Phân tích theo</span>
        {DATE_PRESETS.map(p => (
          <button key={p.key} onClick={() => handlePresetClick(p.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${datePreset === p.key ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            {p.label}
          </button>
        ))}
        {showCustom && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-lg outline-none focus:border-indigo-400" />
            <span className="text-gray-400 text-xs">→</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-1 text-xs font-medium border border-gray-200 rounded-lg outline-none focus:border-indigo-400" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-indigo-500"><i className="fa-solid fa-circle-notch fa-spin text-4xl mb-4" />Đang tổng hợp dữ liệu...</div>
      ) : (
        <>
          {/* ─── 2. KPI CARDS ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Thực thu', val: formatFull(summary.totalRevenue), dot: 'bg-indigo-600' },
              { label: 'Lợi nhuận ròng', val: formatFull(summary.totalProfit), dot: 'bg-emerald-500' },
              { label: 'Tổng đơn hoàn tất', val: summary.totalOrders.toLocaleString(), dot: 'bg-blue-500' },
              { label: 'Giá trị Đơn trung bình (AOV)', val: formatFull(summary.aov), dot: 'bg-amber-500' },
            ].map(k => (
              <div key={k.label} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${k.dot}`} />{k.label}</p>
                <p className="text-xl md:text-2xl font-black text-gray-900 font-mono">{k.val}</p>
              </div>
            ))}
          </div>

          {/* ─── 3. AUTO INSIGHTS ENGINE ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {insights.map((i, idx) => (
              <div key={idx} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg shrink-0 ${i.color}`}><i className={`fa-solid ${i.icon}`} /></div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{i.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: i.desc.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-black">$1</strong>') }} />
                </div>
              </div>
            ))}
          </div>

          {/* ─── 4. DAILY VIEW (CHART QUAN TRỌNG NHẤT) ─── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
            <div className="mb-6">
              <h3 className="text-base font-bold text-gray-900">Biến động Hàng ngày (Daily Trend)</h3>
              <p className="text-xs text-gray-500 mt-1">Theo dõi sự thay đổi của Doanh thu Thực thu theo từng ngày</p>
            </div>
            <div className="relative w-full h-[320px]">
              {dashboardData?.dailyData?.length > 0 ? <canvas ref={dailyCanvasRef} /> : <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Không có dữ liệu ngày</div>}
            </div>
          </div>

          {/* ─── 5. BREAKDOWN: SẢN PHẨM & XU HƯỚNG ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Top Products */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900"><i className="fa-solid fa-trophy text-amber-500 mr-2" />Sản phẩm Đóng góp Doanh thu Cao nhất</h3>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold tracking-widest">
                    <tr><th className="px-5 py-3">Sản phẩm</th><th className="px-5 py-3 text-right">Đã bán</th><th className="px-5 py-3 text-right">Mang về</th><th className="px-5 py-3 text-right">Tỷ trọng</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dashboardData?.topBooks?.map((b, i) => {
                      const pct = summary.totalRevenue > 0 ? ((b.revenue / summary.totalRevenue) * 100).toFixed(1) : 0;
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-semibold text-gray-800 line-clamp-1">{b.title}</td>
                          <td className="px-5 py-3 text-right font-mono text-gray-600">{b.units}</td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-emerald-600">{formatShort(b.revenue)}</td>
                          <td className="px-5 py-3 text-right font-mono text-gray-500">{pct}%</td>
                        </tr>
                      )
                    })}
                    {!dashboardData?.topBooks?.length && <tr><td colSpan="4" className="text-center py-8 text-gray-400">Chưa có sản phẩm nào được bán</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Các Giai Đoạn & Trend Năm */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Theo Giai đoạn (Trong tháng)</h3>
                <div className="relative w-full h-[140px]"><canvas ref={segmentCanvasRef} /></div>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Biến động theo Năm (YoY)</h3>
                <div className="relative w-full h-[140px]"><canvas ref={lineCanvasRef} /></div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default AdminRevenue;