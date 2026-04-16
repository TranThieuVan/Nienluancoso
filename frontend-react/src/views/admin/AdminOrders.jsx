import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/* ─── Constants ─────────────────────────────────────────────────── */
const BADGES = {
  pending: { label: 'Đang xử lý', cls: 'bg-yellow-50 text-yellow-800 border border-yellow-200', dot: 'bg-yellow-500' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-indigo-50 text-indigo-800 border border-indigo-200', dot: 'bg-indigo-500' }, // ✅ ĐÃ THÊM
  delivering: { label: 'Đang giao', cls: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
  delivered: { label: 'Đã giao (Chờ)', cls: 'bg-violet-50 text-violet-700 border border-violet-200', dot: 'bg-violet-500' },
  completed: { label: 'Hoàn tất', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  failed_delivery: { label: 'Giao thất bại', cls: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  return_requested: { label: 'Yêu cầu trả hàng', cls: 'bg-pink-50 text-pink-700 border border-pink-200', dot: 'bg-pink-500' },
  return_approved: { label: 'Đang trả hàng', cls: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200', dot: 'bg-fuchsia-500' },
  returning: { label: 'Khách đang gửi', cls: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500' },
  returned: { label: 'Đã hoàn tiền', cls: 'bg-stone-50 text-stone-700 border border-stone-200', dot: 'bg-stone-500' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' }
};

const STATUS_COLORS = {
  pending: '#eab308', confirmed: '#6366f1', delivering: '#3b82f6', delivered: '#8b5cf6', completed: '#10b981',
  failed_delivery: '#f97316', return_requested: '#ec4899', return_approved: '#d946ef',
  returning: '#a855f7', returned: '#78716c', cancelled: '#ef4444'
};

const DATE_PRESETS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'today', label: 'Hôm nay' }, { key: 'yesterday', label: 'Hôm qua' },
  { key: 'last7', label: '7 ngày' }, { key: 'last30', label: '30 ngày' },
  { key: 'thisMonth', label: 'Tháng này' }, { key: 'custom', label: 'Tuỳ chọn' },
];

const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p || 0);
const formatDate = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const getAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
};

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [datePreset, setDatePreset] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [pendingFrom, setPendingFrom] = useState('');
  const [pendingTo, setPendingTo] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  const buildQS = useCallback(() => {
    const p = new URLSearchParams();
    p.set('page', currentPage);
    p.set('limit', limit);
    if (datePreset !== 'custom') p.set('preset', datePreset);
    else { if (fromDate) p.set('from', fromDate); if (toDate) p.set('to', toDate); }
    if (statusFilter !== 'all') p.set('status', statusFilter);
    return p.toString();
  }, [currentPage, datePreset, fromDate, toDate, statusFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const cfg = { headers: { Authorization: `Bearer ${token}` } };
      const qs = buildQS();
      const [statsRes, listRes] = await Promise.all([
        axios.get(`/api/admin/orders/stats?${qs}`, cfg).catch(() => ({ data: null })),
        axios.get(`/api/admin/orders?${qs}`, cfg).catch(() => ({ data: { orders: [], totalPages: 1 } }))
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (listRes.data) {
        setOrders(listRes.data.orders || []);
        setTotalPages(listRes.data.totalPages || 1);
      }
    } catch (error) { console.error('Fetch orders error', error); }
    finally { setLoading(false); }
  }, [buildQS]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApplyCustom = () => {
    if (!pendingFrom || !pendingTo) return;
    setFromDate(pendingFrom); setToDate(pendingTo);
    setCurrentPage(1);
  };

  const statusPieData = useMemo(() => {
    if (!stats || !stats.byStatus) return [];
    return Object.keys(stats.byStatus)
      .filter(key => stats.byStatus[key] > 0)
      .map(key => ({
        name: BADGES[key]?.label || key,
        value: stats.byStatus[key],
        color: STATUS_COLORS[key] || '#94a3b8'
      }));
  }, [stats]);

  const renderCustomPieLabel = ({ percent }) => percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : '';

  return (
    <div className="min-h-screen bg-gray-50/50 p-5 md:p-7 font-sans">
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Đơn hàng</h1>
          <p className="text-xs text-gray-400 mt-1 font-medium">Theo dõi, điều phối và xử lý vận đơn</p>
        </div>
      </div>

      {stats?.needRefundCount > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-circle-exclamation text-red-600 text-xl md:text-2xl"></i>
              <div>
                <p className="text-red-800 font-bold text-sm md:text-base">Cần xử lý hoàn tiền!</p>
                <p className="text-red-600 text-xs md:text-sm font-medium">
                  Hiện đang có <span className="font-black underline">{stats.needRefundCount} đơn hàng</span> đang chờ bạn xác nhận chuyển khoản hoàn tiền cho khách.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setStatusFilter('need_refund'); setDatePreset('all'); setCurrentPage(1); }}
              className="bg-red-600 text-white text-[10px] md:text-xs font-black uppercase px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shrink-0 shadow-sm"
            >
              Xem danh sách
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 mb-6 flex flex-wrap items-center gap-2 sticky top-0 z-10">
        <i className="fa-regular fa-calendar text-gray-400 mr-1 text-sm" />
        {DATE_PRESETS.map(p => (
          <button key={p.key} onClick={() => { setDatePreset(p.key); if (p.key !== 'custom') { setFromDate(''); setToDate(''); setCurrentPage(1); } }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${datePreset === p.key ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            {p.label}
          </button>
        ))}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <input type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)} className="px-3 py-1 text-xs border border-gray-200 rounded-lg outline-none" />
            <span className="text-gray-300 text-sm"><i className="fa-solid fa-arrow-right text-xs" /></span>
            <input type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)} className="px-3 py-1 text-xs border border-gray-200 rounded-lg outline-none" />
            <button onClick={handleApplyCustom} disabled={!pendingFrom || !pendingTo} className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-40">Áp dụng</button>
          </div>
        )}

        <div className="h-5 w-px bg-gray-200 mx-2 hidden sm:block"></div>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-filter text-gray-400 text-sm"></i>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-1.5 text-[11px] font-bold border border-gray-200 rounded-full outline-none bg-gray-50 text-gray-700 cursor-pointer hover:border-indigo-400 hover:bg-white transition-colors"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="need_refund" className="text-red-600 font-bold">⚠️ Cần hoàn tiền</option>
            <option value="pending">Đang xử lý (Chờ xác nhận)</option>
            <option value="confirmed">Đã xác nhận (Chờ giao)</option> {/* ✅ ĐÃ THÊM VÀO FILTER */}
            <option value="delivering">Đang giao hàng</option>
            <option value="delivered">Đã giao hàng</option>
            <option value="completed">Hoàn tất</option>
            <option value="cancelled">Đã hủy</option>
            <option value="failed_delivery">Giao thất bại</option>
            <option value="return_requested">Yêu cầu trả hàng</option>
            <option value="return_approved">Đang trả hàng</option>
            <option value="returning">Khách đang gửi</option>
            <option value="returned">Đã hoàn tiền</option>
          </select>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Ô bên trái: Biểu đồ tròn */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 mb-2 w-full text-left">Tỷ lệ trạng thái đơn</h3>
            {statusPieData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm font-bold text-gray-400">Không có dữ liệu</div>
            ) : (
              <>
                {/* Tăng chiều cao lên 300px để thoải mái hiển thị % */}
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90} // Tăng bán kính ngoài để nhãn % giãn ra
                        paddingAngle={2}
                        dataKey="value"
                        label={renderCustomPieLabel}
                        labelLine={false}
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value) => [`${value} đơn hàng`, 'Số lượng']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend danh sách trạng thái */}
                <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1.5 w-full max-h-24 overflow-y-auto custom-scrollbar">
                  {statusPieData.map((entry, idx) => (
                    <div key={idx} className="flex items-center text-[10px] font-bold text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: entry.color }}></span>
                      {entry.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Ô bên phải: Biểu đồ vùng (Area Chart) */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-900">Biến động Số lượng đơn</h3>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Tổng đơn phát sinh</p>
                <p className="text-2xl font-black text-indigo-600">{stats.totalOrders}</p>
              </div>
            </div>
            {/* Tăng chiều cao lên 300px đồng bộ với ô bên trái */}
            <div className="h-[300px] w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
              <div style={{ minWidth: `${Math.max(800, (stats.dailyData?.length || 0) * 40)}px`, height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                    />
                    <Area
                      type="monotone"
                      name="Số đơn hàng"
                      dataKey="orders"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                      activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900">Danh sách Đơn hàng</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base text-left">
            <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 font-bold tracking-wider">
              <tr>
                <th className="px-5 py-4 font-semibold">Ngày đặt</th>
                <th className="px-5 py-4 font-semibold">Khách hàng</th>
                <th className="px-5 py-4 font-semibold">Thanh toán</th>
                <th className="px-5 py-4 font-semibold text-right">Tổng tiền</th>
                <th className="px-5 py-4 font-semibold text-center">Trạng thái</th>
                <th className="px-5 py-4 font-semibold text-center w-24">Xem chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400"><i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 block text-indigo-400" />Đang tải dữ liệu...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400 text-sm"><i className="fa-solid fa-inbox text-3xl mb-2 block text-gray-300" />Không có đơn hàng nào</td></tr>
              ) : orders.map(order => {
                const badge = BADGES[order.status] || { label: order.status, cls: 'bg-gray-100 text-gray-800', dot: 'bg-gray-500' };
                const avatarUrl = getAvatarUrl(order.user?.avatar);
                return (
                  <tr key={order._id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-5 py-4 text-sm text-gray-500 font-medium whitespace-nowrap">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" onError={(e) => { e.target.onerror = null; e.target.outerHTML = '<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0"><i class="fa-solid fa-user text-gray-400 text-sm"></i></div>'; }} /> : <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0"><i class="fa-solid fa-user text-gray-400 text-sm" /></div>}
                        <div className="min-w-[120px]"><p className="text-sm font-bold text-gray-900 truncate">{order.shippingAddress?.fullName}</p><p className="text-xs text-gray-500 font-mono truncate">{order.shippingAddress?.phone}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${order.paymentStatus?.includes('Đã thanh toán') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : order.paymentStatus?.includes('Hoàn tiền') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{order.paymentMethod === 'vnpay' ? 'VNPAY' : order.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'COD'}<span className="mx-1.5 text-gray-300">•</span><span className="font-medium">{order.paymentStatus}</span></span></td>
                    <td className="px-5 py-4 text-right text-sm font-black text-gray-900 font-mono">{formatPrice(order.totalPrice)}</td>
                    <td className="px-5 py-4 text-center"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap ${badge.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${badge.dot} shrink-0`} />{badge.label}</span></td>
                    <td className="px-5 py-4 text-center"><button onClick={() => navigate(`/admin/orders/${order._id}`)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><i className="fa-solid fa-arrow-right" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-center bg-white rounded-b-2xl min-h-[65px]">{totalPages > 1 && !loading && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}</div>
      </div>
    </div>
  );
};

export default AdminOrders;