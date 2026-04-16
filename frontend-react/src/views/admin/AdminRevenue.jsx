import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LabelList
} from 'recharts';

/* ─── FORMATTERS & CONSTANTS ─── */
const formatPrice = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`;
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const DATE_PRESETS = [
  { key: 'today', label: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua' },
  { key: 'last7', label: '7 ngày' },
  { key: 'last30', label: '30 ngày' },
  { key: 'thisMonth', label: 'Tháng này' },
  { key: 'custom', label: 'Tuỳ chọn' },
];

/* ========================================================================
   COMPONENT ĐỘC LẬP: KHỐI SO SÁNH TĂNG TRƯỞNG
======================================================================== */
const ComparisonCard = () => {
  const [compData, setCompData] = useState(null);
  const [isCompLoading, setIsCompLoading] = useState(true);
  const [compareBy, setCompareBy] = useState('week');

  const fetchComparison = useCallback(async () => {
    setIsCompLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`/api/admin/revenue/dashboard?target=comparison&compareBy=${compareBy}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompData(res.data.comparison);
    } catch (error) {
      console.error('Lỗi tải dữ liệu so sánh:', error);
    } finally {
      setIsCompLoading(false);
    }
  }, [compareBy]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const comparisonChartData = useMemo(() => {
    if (!compData) return [];
    return [
      {
        name: 'Doanh thu',
        'Kỳ này': compData.revenue.current,
        'Kỳ trước': compData.revenue.previous,
        change: compData.revenue.percentChange
      },
      {
        name: 'Lợi nhuận',
        'Kỳ này': compData.profit.current,
        'Kỳ trước': compData.profit.previous,
        change: compData.profit.percentChange
      }
    ];
  }, [compData]);

  const renderCustomBarLabel = (props) => {
    const { x, y, width, value } = props;
    const isPositive = value >= 0;
    const color = isPositive ? '#10b981' : '#ef4444';
    const text = `${isPositive ? '+' : ''}${value.toFixed(1)}%`;
    return (
      <text x={x + width / 2} y={y - 10} fill={color} textAnchor="middle" fontSize={11} fontWeight="black">
        {text}
      </text>
    );
  };

  const ComparisonTooltip = ({ active, payload, label }) => {
    if (active && payload?.length === 2) {
      const current = payload[0].value;
      const previous = payload[1].value;
      return (
        <div className="bg-white p-3 border shadow-sm rounded-lg text-sm min-w-[200px]">
          <p className="font-bold text-gray-800 mb-2 uppercase tracking-wide border-b pb-1">{label}</p>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-500">Kỳ này:</span>
            <span className="font-bold text-indigo-600">{formatPrice(current)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-gray-500">Kỳ trước:</span>
            <span className="font-bold text-gray-400">{formatPrice(previous)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-gray-900">Tốc độ tăng trưởng</h3>
        <select
          value={compareBy}
          onChange={e => setCompareBy(e.target.value)}
          className="px-2 py-1 text-[11px] font-bold border rounded bg-gray-50 outline-none cursor-pointer"
        >
          <option value="week">Tuần trước vs Tuần này</option>
          <option value="month">Tháng trước vs Tháng này</option>
          <option value="year">Năm trước vs Năm nay</option>
        </select>
      </div>

      {isCompLoading ? (
        <div className="h-[250px] flex items-center justify-center">
          <i className="fa-solid fa-circle-notch fa-spin text-gray-300 text-3xl"></i>
        </div>
      ) : (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} barGap={0} barCategoryGap="25%" margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 'bold', fill: '#475569' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(val) => `${val / 1000000}M`} />
              <RechartsTooltip content={<ComparisonTooltip />} cursor={{ fill: 'transparent' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Bar dataKey="Kỳ này" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50}>
                <LabelList dataKey="change" content={renderCustomBarLabel} />
              </Bar>
              <Bar dataKey="Kỳ trước" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/* ========================================================================
   MAIN DASHBOARD COMPONENT
======================================================================== */
const AdminRevenue = () => {
  const [mainData, setMainData] = useState(null);
  const [isMainLoading, setIsMainLoading] = useState(true);

  const [preset, setPreset] = useState('last30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMainDashboard = useCallback(async () => {
    setIsMainLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ preset });
      if (preset === 'custom') {
        params.set('from', from);
        params.set('to', to);
      }
      const res = await axios.get(`/api/admin/revenue/dashboard?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMainData(res.data);
    } catch (error) {
      console.error('Lỗi tải dữ liệu chính:', error);
    } finally {
      setIsMainLoading(false);
    }
  }, [preset, from, to]);

  useEffect(() => {
    if (preset !== 'custom') {
      fetchMainDashboard();
    }
  }, [preset, fetchMainDashboard]);

  const handleApplyCustom = () => {
    setErrorMsg('');
    if (!from || !to) return setErrorMsg('Vui lòng chọn đầy đủ ngày.');
    if (new Date(from) > new Date(to)) return setErrorMsg('Ngày bắt đầu không hợp lệ.');
    fetchMainDashboard();
  };

  const handleExportCSV = () => {
    if (!mainData?.trend?.length) return alert('Không có dữ liệu');
    const header = ['Ngày', 'Doanh thu', 'Lợi nhuận'];
    const rows = mainData.trend.map(row => [row.date, row.revenue, row.profit]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Doanh_Thu_${new Date().getTime()}.csv`;
    link.click();
  };

  const renderCustomPieLabel = ({ percent }) => {
    return `${(percent * 100).toFixed(1)}%`;
  };

  const TrendTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white p-3 border shadow-sm rounded text-sm">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          <p className="text-indigo-600 font-semibold">Doanh thu: {formatPrice(payload[0]?.value)}</p>
          <p className="text-emerald-600 font-semibold">Lợi nhuận: {formatPrice(payload[1]?.value)}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltipCount = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-gray-900 text-white p-2 rounded text-xs shadow-lg">
          <p className="font-bold">{payload[0].name}</p>
          <p>{payload[0].value} đơn hàng</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltipRevenue = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-gray-900 text-white p-2 rounded text-xs shadow-lg">
          <p className="font-bold">{payload[0].name}</p>
          <p className="text-indigo-300">{formatPrice(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-5 md:p-7 font-sans">
      {/* HEADER */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Báo cáo Doanh thu</h1>
          <p className="text-xs text-gray-500 mt-1">Quản lý dòng tiền và lợi nhuận bán hàng</p>
        </div>
        <button onClick={handleExportCSV} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition">
          <i className="fa-solid fa-file-csv mr-2"></i>Xuất Excel
        </button>
      </div>

      {/* FILTER BAR CHO TỔNG QUAN */}
      <div className="bg-white border rounded-xl shadow-sm px-4 py-3 mb-6 sticky top-0 z-10 flex flex-wrap gap-2 items-center">
        <i className="fa-regular fa-calendar text-gray-400 mr-1" />
        {DATE_PRESETS.map(p => (
          <button key={p.key} onClick={() => setPreset(p.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${preset === p.key ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-2 border-l pl-3">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-2 py-1 text-xs border rounded" />
            <span className="text-gray-300">-</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-2 py-1 text-xs border rounded" />
            <button onClick={handleApplyCustom} className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded">Lọc</button>
          </div>
        )}
      </div>

      {/* LOADING CHÍNH */}
      {isMainLoading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-500 mb-3"></i>
          <p className="text-sm font-medium text-gray-500">Đang đồng bộ dữ liệu...</p>
        </div>
      ) : !mainData?.summary ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border">Chưa có dữ liệu</div>
      ) : (
        <>
          {/* ✨ KPI CARDS (Đã thêm màu nền tone-sur-tone) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            <div className="bg-blue-200 border border-blue-100 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-bold text-blue-500 uppercase">Tổng Doanh Thu</p>
              <h3 className="text-2xl font-black text-blue-900 mt-1">{formatPrice(mainData.summary.revenue)}</h3>
            </div>
            <div className="bg-green-200 border border-emerald-100 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-bold text-emerald-600 uppercase">Lợi Nhuận Gộp</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">{formatPrice(mainData.summary.profit)}</h3>
              <p className="text-[11px] text-emerald-600/80 mt-1">Biên LN: <span className="font-bold">{formatPercent(mainData.summary.profitMargin)}</span></p>
            </div>
            <div className="bg-indigo-200 border border-indigo-100 rounded-xl p-5 shadow-sm">
              <p className="text-xs font-bold text-indigo-500 uppercase">Đơn Hàng Hoàn Tất</p>
              <h3 className="text-2xl font-black text-indigo-700 mt-1">{mainData.summary.totalCompleted}</h3>
              <p className="text-[11px] text-indigo-500/80 mt-1">Giá trị trung bình/đơn: <span className="font-bold text-indigo-700/80">{formatPrice(mainData.summary.aov)}</span></p>
            </div>
          </div>

          {/* MAIN TREND CHART */}
          <div className="bg-white border rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-6">Xu hướng Doanh thu & Lợi nhuận</h3>
            <div className="h-[350px] w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
              <div style={{
                minWidth: `${Math.max(100, (mainData?.trend?.length || 0) * 50)}px`,
                height: '100%'
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mainData.trend} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      dy={10}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickFormatter={(val) => `${val / 1000000}M`}
                    />
                    <RechartsTooltip content={<TrendTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingBottom: '20px' }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      name="Doanh thu"
                      dataKey="revenue"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      name="Lợi nhuận"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PAYMENT BREAKDOWN */}
            <div className="bg-white border rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-6">Phân tích Phương thức thanh toán</h3>
              <div className="grid grid-cols-2 gap-4 h-[250px]">

                {/* Pie 1: Số lượng */}
                <div className="flex flex-col items-center justify-center">
                  <p className="text-[11px] font-bold text-gray-500 mb-2">Theo số lượng đơn</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mainData.paymentBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                        dataKey="count" nameKey="name" paddingAngle={2}
                        label={renderCustomPieLabel} labelLine={false}
                      >
                        {mainData.paymentBreakdown.map((e, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip content={<PieTooltipCount />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie 2: Doanh thu */}
                <div className="flex flex-col items-center justify-center">
                  <p className="text-[11px] font-bold text-gray-500 mb-2">Theo doanh thu</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mainData.paymentBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                        dataKey="revenue" nameKey="name" paddingAngle={2}
                        label={renderCustomPieLabel} labelLine={false}
                      >
                        {mainData.paymentBreakdown.map((e, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip content={<PieTooltipRevenue />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

              </div>

              {/* Legend Pie */}
              <div className="flex justify-center gap-4 mt-2">
                {mainData.paymentBreakdown.map((p, idx) => (
                  <div key={idx} className="flex items-center text-[10px] font-bold text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full mr-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>

            <ComparisonCard />

          </div>
        </>
      )}
    </div>
  );
};

export default AdminRevenue;