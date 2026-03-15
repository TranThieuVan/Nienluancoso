import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

/* ─── Styles ────────────────────────────────────────────────────── */
const S = {
  page: {
    fontFamily: "'Sora', 'Inter', sans-serif",
    background: '#f9fafb',
    minHeight: '100vh',
    padding: '2rem 2.5rem',
  },
  header: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem',
  },
  eyebrow: {
    fontSize: '10px', letterSpacing: '.18em', textTransform: 'uppercase',
    color: '#4f46e5', fontWeight: 600, marginBottom: '3px',
  },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 },
  controls: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  selWrap: { display: 'flex', alignItems: 'center', gap: '7px' },
  selLabel: { fontSize: '11px', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' },
  select: {
    padding: '6px 10px', borderRadius: '8px',
    border: '1px solid #e5e7eb', background: '#fff',
    color: '#374151', fontSize: '12px', fontFamily: 'inherit',
    cursor: 'pointer', outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,.04)',
  },
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
    gap: '10px', marginBottom: '1.25rem',
  },
  statCard: {
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: '12px', padding: '12px 16px',
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  },
  statLabel: {
    fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '.12em', color: '#9ca3af', fontWeight: 700,
  },
  statDot: { width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block', marginRight: '5px' },
  statValue: {
    fontSize: '1.05rem', fontWeight: 700, color: '#111827',
    marginTop: '4px', fontFamily: "'JetBrains Mono', monospace",
    wordBreak: 'break-all',
  },
  chartCard: {
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: '14px', padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  },
  chartHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: '1.5rem', flexWrap: 'wrap', gap: '8px',
  },
  chartTitle: { fontSize: '13px', fontWeight: 700, color: '#374151', margin: 0 },
  chartSub: { fontSize: '11px', color: '#9ca3af', marginTop: '2px' },
  legend: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6b7280' },
  legendDot: { width: '10px', height: '10px', borderRadius: '2px', background: '#4f46e5', display: 'inline-block' },
  weekGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
    gap: '8px', marginTop: '1.25rem',
    paddingTop: '1rem', borderTop: '1px solid #f3f4f6',
  },
  weekCell: { textAlign: 'center' },
  weekLabel: { fontSize: '10px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' },
  weekVal: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 700, marginTop: '3px' },
  emptyBox: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px',
    padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  },
  error: {
    marginTop: '1rem', padding: '12px 16px',
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '10px', color: '#991b1b', fontSize: '13px',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
};

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
  const chartRef = useRef(null);

  const fetchRevenue = async () => {
    setError(null); setLoading(true);
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

  useEffect(() => { fetchRevenue(); }, [selectedMonth, selectedYear]);

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

  /* ── Chart.js: khởi tạo / cập nhật ── */
  useEffect(() => {
    if (!canvasRef.current || !hasData) return;

    const colors = weeklyRevenue.map((_, i) =>
      i === stats.bestIdx ? '#4f46e5' : '#c7d2fe'
    );

    if (chartRef.current) {
      chartRef.current.data.datasets[0].data = weeklyRevenue;
      chartRef.current.data.datasets[0].backgroundColor = colors;
      chartRef.current.update();
      return;
    }

    chartRef.current = new Chart(canvasRef.current, {
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
            bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
            titleFont: { family: 'Sora, sans-serif', size: 11 },
            backgroundColor: '#fff',
            titleColor: '#6b7280',
            bodyColor: '#111827',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            padding: 10,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Sora, sans-serif', size: 11 }, color: '#9ca3af' },
          },
          y: {
            grid: { color: '#f3f4f6' },
            border: { display: false },
            ticks: {
              font: { family: 'Sora, sans-serif', size: 11 },
              color: '#9ca3af',
              callback: v => formatShort(v),
            },
          },
        },
      },
    });
  }, [weeklyRevenue, hasData, stats.bestIdx]);

  /* Hủy chart khi unmount */
  useEffect(() => {
    return () => { chartRef.current?.destroy(); };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .ar-select:focus { border-color: #a5b4fc !important; box-shadow: 0 0 0 3px rgba(165,180,252,.3); }
      `}</style>

      <div style={S.page}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div>
            <p style={S.eyebrow}>Admin · Bookstore</p>
            <h1 style={S.title}>Thống kê Doanh thu</h1>
          </div>
          <div style={S.controls}>
            <div style={S.selWrap}>
              <span style={S.selLabel}>Tháng</span>
              <select className="ar-select" style={S.select}
                value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>
            <div style={S.selWrap}>
              <span style={S.selLabel}>Năm</span>
              <select className="ar-select" style={S.select}
                value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={S.stats}>
          {[
            { label: 'Tổng tháng', dot: '#4f46e5', value: formatFull(stats.total) },
            { label: 'Tuần cao nhất', dot: '#16a34a', value: formatFull(stats.peak) },
            { label: 'Trung bình / tuần', dot: '#ca8a04', value: formatFull(stats.avg) },
            { label: 'Tuần tốt nhất', dot: '#6366f1', value: stats.bestWeek },
          ].map(s => (
            <div key={s.label} style={S.statCard}>
              <div style={S.statLabel}>
                <span style={{ ...S.statDot, background: s.dot }} />
                {s.label}
              </div>
              <div style={S.statValue}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        {loading ? (
          <div style={S.emptyBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
              style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Đang tải dữ liệu...
          </div>
        ) : !hasData ? (
          <div style={S.emptyBox}>
            Không có dữ liệu doanh thu cho tháng {selectedMonth}/{selectedYear}
          </div>
        ) : (
          <div style={S.chartCard}>
            <div style={S.chartHeader}>
              <div>
                <p style={S.chartTitle}>Doanh thu theo tuần</p>
                <p style={S.chartSub}>Tháng {selectedMonth} · {selectedYear}</p>
              </div>
              <div style={S.legend}>
                <span style={S.legendDot} />
                Doanh thu (VNĐ)
              </div>
            </div>

            {/* Canvas */}
            <div style={{ position: 'relative', width: '100%', height: '260px' }}>
              <canvas ref={canvasRef} />
            </div>


          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={S.error}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminRevenue;