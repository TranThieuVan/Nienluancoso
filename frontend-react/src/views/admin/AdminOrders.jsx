import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* ─── Constants ─────────────────────────────────────────────────── */
// ✅ ĐÃ SỬA: Cập nhật biến trạng thái mới
const BADGES = {
  pending: { label: 'Đang xử lý', cls: 'bg-yellow-50 text-yellow-800 border border-yellow-200', dot: 'bg-yellow-500' },
  delivering: { label: 'Đang giao', cls: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
  delivered: { label: 'Đã giao (Chờ)', cls: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-500' },
  completed: { label: 'Hoàn tất', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  failed_delivery: { label: 'Giao thất bại', cls: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  returned: { label: 'Đã trả hàng', cls: 'bg-stone-100 text-stone-700 border border-stone-300', dot: 'bg-stone-500' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },
  pending_refund: { label: 'Cần hoàn tiền', cls: 'bg-rose-50 text-rose-700 border border-rose-200', dot: 'bg-rose-600' },
  done_refund: { label: 'Đã hoàn tiền', cls: 'bg-cyan-50 text-cyan-700 border border-cyan-200', dot: 'bg-cyan-500' },
};

const getBadgeKey = (order) => {
  if (order.status === 'cancelled') return 'cancelled';
  if (order.paymentStatus === 'Đã hoàn tiền') return 'done_refund';
  if (order.paymentStatus === 'Hoàn tiền') return 'pending_refund';
  return order.status;
};

// ✅ ĐÃ SỬA: Danh sách lọc
const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Đang xử lý' },
  { key: 'delivering', label: 'Đang giao' },
  { key: 'delivered', label: 'Đã giao' },
  { key: 'completed', label: 'Hoàn tất' },
  { key: 'failed_delivery', label: 'Thất bại' },
  { key: 'returned', label: 'Trả hàng' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const DATE_PRESETS = [
  { key: '', label: 'Toàn thời gian' },
  { key: 'last7', label: '7 ngày qua' },
  { key: 'last30', label: '30 ngày qua' },
  { key: 'year', label: 'Năm nay' },
  { key: 'custom', label: 'Tuỳ chọn' },
];

const TABLE_COLUMNS = [
  { label: 'Mã đơn', width: 'w-[12%]', align: 'text-left' },
  { label: 'Sản phẩm', width: 'w-[30%]', align: 'text-left' },
  { label: 'Khách hàng', width: 'w-[18%]', align: 'text-left' },
  { label: 'Tổng tiền', width: 'w-[14%]', align: 'text-right' },
  { label: 'Trạng thái', width: 'w-[16%]', align: 'text-left' },
  { label: 'Thao tác', width: 'w-[10%]', align: 'text-center' },
];

const getImageUrl = (p) => `http://localhost:5000${p}`;
const formatPrice = (n) => (n ?? 0).toLocaleString('vi-VN') + ' ₫';

const StatCard = ({ icon, label, value, sub, colorClass }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-center transition-all hover:border-gray-300">
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass.bg} ${colorClass.text}`}>
        <i className={`fa-solid ${icon} text-sm`} />
      </div>
      <span className="text-[11px] uppercase tracking-widest font-bold text-gray-500">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <div className="text-2xl font-black text-gray-900 font-mono tabular-nums">{value}</div>
      {sub && <div className="text-xs font-semibold text-gray-400">{sub}</div>}
    </div>
  </div>
);

const AdminOrders = () => {
  const navigate = useNavigate();

  const [filterStatus, setFilterStatus] = useState('all');
  const [datePreset, setDatePreset] = useState('last30');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const showCustom = datePreset === 'custom';

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const buildQS = useCallback((extra = '') => {
    const p = new URLSearchParams();
    if (filterStatus !== 'all') p.set('status', filterStatus);
    if (datePreset && datePreset !== 'custom') p.set('preset', datePreset);
    if (datePreset === 'custom' && fromDate) p.set('from', fromDate);
    if (datePreset === 'custom' && toDate) p.set('to', toDate);
    return p.toString() + (extra ? '&' + extra : '');
  }, [filterStatus, datePreset, fromDate, toDate]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.get(`/api/admin/orders/stats?${buildQS()}`, { headers: { Authorization: `Bearer ${token}` } });
      setStats(data);
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  }, [buildQS]);

  const fetchOrders = useCallback(async () => {
    setError(null); setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.get(`/api/admin/orders?${buildQS(`page=${currentPage}&limit=10`)}`, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setTotalOrders(data.totalOrders || 0);
    } catch (err) { setError(err.response?.data?.message || err.message); }
    finally { setLoading(false); }
  }, [buildQS, currentPage]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusClick = (key) => { if (filterStatus !== key) { setFilterStatus(key); setCurrentPage(1); } };
  const handleDatePresetClick = (key) => { if (datePreset !== key) { setDatePreset(key); setFromDate(''); setToDate(''); setCurrentPage(1); } };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 p-3 shadow-lg rounded-lg">
          <p className="text-xs font-bold text-gray-500 mb-2">{label}</p>
          <p className="text-sm font-black text-indigo-600 mb-1">Đơn hàng: {payload[0].value}</p>
          <p className="text-sm font-black text-emerald-600">Thực thu: {formatPrice(payload[1]?.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 font-sans overflow-y-scroll">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Hiệu suất kinh doanh</h1>
          <p className="text-sm text-gray-500 mt-1">Phân tích dữ liệu vận hành & doanh thu</p>
        </div>
        <button onClick={() => { fetchStats(); fetchOrders(); }} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border bg-white text-gray-700 font-bold shadow-sm hover:border-black transition">
          <i className={`fa-solid fa-rotate text-xs ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon="fa-box-check" label="Giao thành công"
          value={statsLoading ? '-' : `${stats?.rates?.deliverySuccessRate ?? 0}%`} sub="Delivery Success Rate"
          colorClass={{ bg: 'bg-emerald-100', text: 'text-emerald-700' }}
        />
        <StatCard
          icon="fa-users-arrows-retweet" label="Khách quay lại"
          value={statsLoading ? '-' : `${stats?.rates?.repeatRate ?? 0}%`} sub="Repeat Customer Rate"
          colorClass={{ bg: 'bg-blue-100', text: 'text-blue-700' }}
        />
        <StatCard
          icon="fa-truck-fast" label="Thời gian giao"
          value={statsLoading ? '-' : stats?.logistics?.avgDeliveryDays ?? 0} sub="Ngày (Trung bình)"
          colorClass={{ bg: 'bg-violet-100', text: 'text-violet-700' }}
        />
        <StatCard
          icon="fa-ban" label="Tỷ lệ hủy/Hoàn"
          value={statsLoading ? '-' : `${stats?.rates?.cancelRate ?? 0}%`} sub={`Refund Rate: ${stats?.rates?.refundRate ?? 0}%`}
          colorClass={{ bg: 'bg-red-100', text: 'text-red-700' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 lg:col-span-2 flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">Biểu đồ tăng trưởng</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm"></div>
                  <span className="text-[11px] font-bold text-gray-500">Đơn hàng (Trái)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
                  <span className="text-[11px] font-bold text-gray-500">Doanh thu Thực Thu (Phải)</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-gray-900 font-mono tabular-nums">{statsLoading ? '-' : formatPrice(stats?.summary?.revenue)}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Tổng doanh thu kỳ lọc</p>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[250px]">
            {stats?.chartData && stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                  <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">Chưa có dữ liệu biểu đồ</div>
            )}
          </div>
        </div>

        {/* ✅ ĐÃ SỬA: Cập nhật tổng kết phân bổ trạng thái logic mới */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 lg:col-span-1 flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-4">Trạng thái vận hành</p>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Hoàn tất (Thực thu)', color: 'bg-emerald-500', val: stats?.byStatus?.completed },
                { label: 'Đang giao / Chờ KH', color: 'bg-violet-500', val: (stats?.byStatus?.delivering ?? 0) + (stats?.byStatus?.delivered ?? 0) },
                { label: 'Giao thất bại / Trả hàng', color: 'bg-orange-500', val: (stats?.byStatus?.failed_delivery ?? 0) + (stats?.byStatus?.returned ?? 0) },
                { label: 'Đã hủy', color: 'bg-red-500', val: stats?.byStatus?.cancelled },
              ].map(s => {
                const total = stats?.summary?.total || 1;
                const pct = Math.round(((s.val || 0) / total) * 100);
                return (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-gray-600">{s.label}</span>
                      <span className="text-gray-900 tabular-nums">{s.val ?? 0} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${s.color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase">Cần hoàn tiền gấp</span>
              <span className="text-lg font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-lg tabular-nums">
                {stats?.byStatus?.pendingRefund ?? 0}
              </span>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-3 mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mr-2"><i className="fa-regular fa-calendar mr-1.5" />Thời gian</span>
        {DATE_PRESETS.map(p => (
          <button key={p.key} onClick={() => handleDatePresetClick(p.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${datePreset === p.key ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            {p.label}
          </button>
        ))}
        {showCustom && (
          <div className="flex items-center gap-2 ml-2 animate-in fade-in slide-in-from-left-4 duration-300">
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setCurrentPage(1); }} className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg outline-none focus:border-indigo-400" />
            <span className="text-gray-400 text-xs">→</span>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setCurrentPage(1); }} className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg outline-none focus:border-indigo-400" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => handleStatusClick(f.key)} className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${filterStatus === f.key ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col relative min-h-[500px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
          <span className="text-[11px] text-gray-500 font-medium">Tổng số: <strong className="text-gray-900 tabular-nums">{statsLoading ? '-' : totalOrders}</strong> đơn hàng</span>
        </div>

        {loading && (
          <div className="absolute inset-0 top-[45px] bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-b-2xl">
            <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-600 mb-3" />
            <p className="text-sm font-bold text-indigo-800 animate-pulse">Đang cập nhật...</p>
          </div>
        )}

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-[13px] border-collapse table-fixed min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {TABLE_COLUMNS.map((col) => <th key={col.label} className={`px-4 py-3 text-[10px] uppercase tracking-widest text-gray-400 font-bold ${col.width} ${col.align}`}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="h-[400px] text-center text-gray-400 text-sm align-middle">
                    <div className={`flex flex-col items-center justify-center transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                      <i className="fa-regular fa-folder-open text-4xl text-gray-300 mb-3" />
                      <p className="font-medium">Không tìm thấy đơn hàng nào.</p>
                    </div>
                  </td>
                </tr>
              ) : orders.map(order => {
                const badge = BADGES[getBadgeKey(order)] || { label: order.status, cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
                return (
                  <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors h-[60px]">
                    <td className="px-4 py-2 align-middle truncate">
                      <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
                        #{order._id.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="flex items-center gap-3">
                        <img src={getImageUrl(order.items[0]?.book?.image)} alt="book" className="w-10 h-12 object-cover rounded border border-gray-200 shadow-sm flex-shrink-0 bg-white" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-gray-800 line-clamp-2 leading-snug">{order.items[0]?.book?.title || 'N/A'}</p>
                          {order.items.length > 1 && <p className="text-[10px] text-gray-500 font-medium mt-0.5 truncate">+ {order.items.length - 1} sản phẩm khác</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 align-middle text-[12px] text-gray-700 font-semibold truncate" title={order.user?.name || order.shippingAddress?.fullName}>
                      {order.user?.name || order.shippingAddress?.fullName || 'N/A'}
                    </td>
                    <td className="px-4 py-2 align-middle text-right font-mono text-[13px] font-bold text-gray-900 truncate">
                      {formatPrice(order.totalPrice)}
                    </td>
                    <td className="px-4 py-2 align-middle truncate">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm ${badge.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} shadow-sm flex-shrink-0`} />
                        <span className="truncate">{badge.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-center">
                      <button onClick={() => navigate(`/admin/orders/${order._id}`)} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-indigo-600 hover:text-indigo-600 text-gray-600 text-[11px] font-bold transition-all shadow-sm">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-center bg-white rounded-b-2xl min-h-[65px]">
          {totalPages > 1 && !loading && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;